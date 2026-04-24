const benchmarkData = require('../../services/benchmark-data');
const benchmarkAI = require('../../services/benchmark-ai');
const { dbQuery } = require('../../helpers/helper');

// Excludes observations that describe only statutory minima (wettelijk).
// bovenwettelijk is always kept — that's exactly what we want to benchmark.
const isBenchmarkableObservation = (row) => {
    if (row.statutory_expansion != null) return !!row.statutory_expansion;

    // statutory_expansion is null — use description text as fallback heuristic
    const text = row.description || '';
    const isBovenwettelijk = /bovenwettelijk/i.test(text);
    const isWettelijkOnly = /\bwettelijk\b/i.test(text) && !isBovenwettelijk;
    if (isWettelijkOnly) return false;

    return true;
};

const FTE_BANDS = [
    { max: 50,       label: '< 50 FTE' },
    { max: 100,      label: '50–100 FTE' },
    { max: 200,      label: '100–200 FTE' },
    { max: 500,      label: '200–500 FTE' },
    { max: 1000,     label: '500–1.000 FTE' },
    { max: 5000,     label: '1.000–5.000 FTE' },
    { max: 10000,    label: '5.000–10.000 FTE' },
    { max: 15000,    label: '10.000–15.000 FTE' },
    { max: 20000,    label: '15.000–20.000 FTE' },
    { max: Infinity, label: '20.000+ FTE' },];

const POSITION_THRESHOLD_PCT = 5;

const EMPTY_RESPONSE = {
    no_data: true,
    schema: [],
    aggregates: {},
    observation_count: 0,
    above_market_pct: 0,
    match_context: { company_branch: null, company_size_band: null, matched_on: [] },
    peers: [],
    insight: null,
};

function getFteBand(employeeCount) {
    if (employeeCount == null || isNaN(Number(employeeCount))) return null;
    const count = Number(employeeCount);
    const band = FTE_BANDS.find((b) => count <= b.max);
    return band ? band.label : FTE_BANDS[FTE_BANDS.length - 1].label;
}

function getFteBandIndex(employeeCount) {
    if (employeeCount == null || isNaN(Number(employeeCount))) return -1;
    const count = Number(employeeCount);
    return FTE_BANDS.findIndex((b) => count <= b.max);
}

async function getBranchNames(brancheIds) {
    if (!brancheIds || brancheIds.length === 0) return [];
    const placeholders = brancheIds.map(() => '?').join(', ');
    const rows = await dbQuery(`SELECT name FROM ns_branches WHERE id IN (${placeholders})`, brancheIds);
    return rows.map(r => r.name);
}

function computeSimilarity(observation, clientProfile, connectedBranches) {
    let score = 0;
    const matched_on = [];

    const clientBranches = Array.isArray(clientProfile.branche)
        ? clientProfile.branche.map(Number)
        : [];
    if (observation.branche_id != null) {
        const peerId = Number(observation.branche_id);
        if (clientBranches.includes(peerId)) {
            score += 3;
            matched_on.push('branch');
        } else if (connectedBranches.includes(peerId)) {
            score += 1;
            matched_on.push('branch_connected');
        }
    }

    const obsBandIdx = getFteBandIndex(observation.employee_count);
    const clientBandIdx = getFteBandIndex(clientProfile.employee_count);

    if (obsBandIdx !== -1 && clientBandIdx !== -1) {
        if (obsBandIdx === clientBandIdx) {
            score += 2;
            matched_on.push('size_band');
        } else if (Math.abs(obsBandIdx - clientBandIdx) === 1) {
            score += 1;
            matched_on.push('size_band');
        }
    }

    return { score, matched_on };
}

function getMatchLabel(score, matchedOn) {
    if (score >= 5) return 'Hoog';
    if (score >= 3) return 'Gemiddeld';
    if (matchedOn && matchedOn.includes('branch_connected')) return 'Gemiddeld';
    return 'Laag';
}

function computeAggregates(schema, extractedByBenchmarkId) {
    const aggregates = {};

    for (const entry of schema) {
        if (entry.type === 'number') {
            const values = [];
            for (const params of extractedByBenchmarkId.values()) {
                const v = params[entry.key];
                if (v !== null && v !== undefined && !isNaN(Number(v))) {
                    values.push(Number(v));
                }
            }
            if (values.length === 0) continue;
            const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
            aggregates[entry.key] = {
                avg,
                min: Math.min(...values),
                max: Math.max(...values),
                unit: entry.unit || '',
                unit_singular: entry.unit_singular || entry.unit || '',
                label: entry.label,
            };
        } else if (entry.type === 'boolean') {
            const nonNull = [];
            for (const params of extractedByBenchmarkId.values()) {
                const v = params[entry.key];
                if (v !== null && v !== undefined) nonNull.push(v);
            }
            if (nonNull.length === 0) continue;
            const trueCount = nonNull.filter((v) => v === true).length;
            aggregates[entry.key] = {
                true_pct: Math.round((trueCount / nonNull.length) * 100),
                label: entry.label,
            };
        }
    }

    return aggregates;
}

function computePosition(observationParams, aggregates, schema) {
    const numericEntries = schema.filter((e) => e.type === 'number' && aggregates[e.key]);
    if (numericEntries.length === 0) return 'at_market';

    const deviations = [];
    for (const entry of numericEntries) {
        const v = observationParams[entry.key];
        if (v === null || v === undefined || isNaN(Number(v))) continue;
        const agg = aggregates[entry.key];
        if (agg.avg === 0) continue;
        const pctDiff = ((Number(v) - agg.avg) / Math.abs(agg.avg)) * 100;
        deviations.push(pctDiff);
    }

    if (deviations.length === 0) return 'at_market';

    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

    if (avgDeviation > POSITION_THRESHOLD_PCT) return 'above_market';
    if (avgDeviation < -POSITION_THRESHOLD_PCT) return 'below_market';
    return 'at_market';
}

function computeAboveMarketPct(peers) {
    if (peers.length === 0) return 0;
    const aboveCount = peers.filter((p) => p.position === 'above_market').length;
    return Math.round((aboveCount / peers.length) * 100);
}

const LABEL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const viewBenchmark = async (req, res) => {
    try {
        console.log(`[benchmark:view] nsBenefitId=${req.nsBenefitId} administrationId=${req.administrationId}`);
        const bdBenefitId = await benchmarkData.resolveBdBenefitId(req.nsBenefitId);
        console.log(`[benchmark:view] resolved bdBenefitId=${bdBenefitId}`);
        if (bdBenefitId == null) {
            console.log(`[benchmark:view] no linked_benefit → returning no_data`);
            return res.json(EMPTY_RESPONSE);
        }

        const [benefit, rawBenchmarks, clientProfile, schemaRow] = await Promise.all([
            benchmarkData.getBenefitById(bdBenefitId),
            benchmarkData.getBenchmarksForBenefit(bdBenefitId),
            benchmarkData.getClientProfile(req.administrationId),
            benchmarkData.getParameterSchema(bdBenefitId),
        ]);
        console.log(`[benchmark:view] rawBenchmarks=${rawBenchmarks.length} benefit=${benefit ? benefit.title : 'NOT FOUND'} schema=${schemaRow ? 'cached' : 'MISSING'}`);

        const benchmarks = rawBenchmarks.filter(isBenchmarkableObservation);
        const filtered = rawBenchmarks.length - benchmarks.length;
        if (filtered > 0) {
            console.log(`[benchmark:view] isBenchmarkableObservation filtered out ${filtered} benchmark(s):`);
            rawBenchmarks.filter((b) => !isBenchmarkableObservation(b)).forEach((b) => {
                console.log(`  → id=${b.id} statutory_expansion=${b.statutory_expansion} desc="${(b.description || '').slice(0, 80)}"`);
            });
        }
        console.log(`[benchmark:view] benchmarkable count=${benchmarks.length}`);

        if (!benefit || benchmarks.length === 0) {
            console.log(`[benchmark:view] no benefit or no benchmarkable benchmarks → returning no_data`);
            return res.json(EMPTY_RESPONSE);
        }
        if (!clientProfile) return res.status(404).json({ message: 'Administratie niet gevonden' });

        const clientBranchName = await getBranchNames(clientProfile.branche);
        const clientBranches = Array.isArray(clientProfile.branche) ? clientProfile.branche.map(Number) : [];
        const connectedBranches = await benchmarkData.getConnectedBranches(clientBranches);

        let schema;
        let schemaUpdatedAt;

        if (!schemaRow) {
            console.log(`[benchmark:view] no schema cached → generating via AI`);
            const descriptions = benchmarks.map((b) => b.description).filter(Boolean);
            if (descriptions.length === 0) return res.json(EMPTY_RESPONSE);
            schema = await benchmarkAI.generateSchema(benefit, descriptions);
            await benchmarkData.saveParameterSchema(bdBenefitId, schema);
            schemaUpdatedAt = new Date();
            console.log(`[benchmark:view] schema generated and saved, keys=${schema.map((s) => s.key).join(', ')}`);
        } else {
            schema = schemaRow.parameters;
            schemaUpdatedAt = schemaRow.updated_at;
            console.log(`[benchmark:view] using cached schema updated_at=${schemaUpdatedAt} keys=${schema.map((s) => s.key).join(', ')}`);
        }

        const staleBenchmarks = await benchmarkData.getStaleBenchmarks(bdBenefitId, schemaUpdatedAt);
        console.log(`[benchmark:view] stale benchmarks to extract=${staleBenchmarks.length} ids=[${staleBenchmarks.map((b) => b.id).join(', ')}]`);
        for (const benchmark of staleBenchmarks) {
            console.log(`[benchmark:view] extracting params for benchmark id=${benchmark.id}`);
            const params = await benchmarkAI.extractParams(schema, benchmark.description || '');
            console.log(`[benchmark:view] extracted id=${benchmark.id} params=${JSON.stringify(params)}`);
            await benchmarkData.saveExtractedParams(benchmark.id, bdBenefitId, params);
        }

        const extractedMap = await benchmarkData.getExtractedParams(benchmarks.map((b) => b.id));
        console.log(`[benchmark:view] extractedMap size=${extractedMap.size} for benchmark ids=[${benchmarks.map((b) => b.id).join(', ')}]`);

        const usableBenchmarks = benchmarks.filter((b) => {
            const params = extractedMap.get(b.id);
            if (!params) {
                console.log(`[benchmark:view] benchmark id=${b.id} has no extracted params → excluded`);
                return false;
            }
            const hasValue = Object.values(params).some((v) => v !== null && v !== undefined);
            if (!hasValue) console.log(`[benchmark:view] benchmark id=${b.id} all params null → excluded`);
            return hasValue;
        });
        console.log(`[benchmark:view] usable benchmarks=${usableBenchmarks.length}`);

        if (usableBenchmarks.length === 0) {
            console.log(`[benchmark:view] no usable benchmarks → returning no_data`);
            return res.json(EMPTY_RESPONSE);
        }

        const peers = usableBenchmarks.map((b) => {
            const sim = computeSimilarity(b, clientProfile, connectedBranches);
            const params = extractedMap.get(b.id) || {};
            return {
                benchmark_id: b.id,
                branch: b.branch_name,
                size_band: getFteBand(b.employee_count),
                similarity_score: sim.score,
                match_label: getMatchLabel(sim.score, sim.matched_on),
                params,
                _rawScore: sim.score,
                _matchedOn: sim.matched_on,
                position: null,
            };
        });

        peers.sort((a, b) => b._rawScore - a._rawScore || a.benchmark_id - b.benchmark_id);

        peers.forEach((peer, i) => {
            const letter = i < LABEL_ALPHABET.length ? LABEL_ALPHABET[i] : `${i + 1}`;
            peer.label = `Organisatie ${letter}`;
        });

        const aggregates = computeAggregates(schema, new Map(usableBenchmarks.map((b) => [b.id, extractedMap.get(b.id)])));

        for (const peer of peers) {
            peer.position = computePosition(peer.params, aggregates, schema);
        }

        const above_market_pct = computeAboveMarketPct(peers);

        const allMatchedOn = new Set();
        for (const peer of peers) {
            if (peer._rawScore > 0) {
                for (const dim of peer._matchedOn) allMatchedOn.add(dim);
            }
        }

        const cachedInsight = await benchmarkData.getInsight(bdBenefitId, req.administrationId);
        const insight = cachedInsight
            ? { text: cachedInsight.insight_text, generated_at: cachedInsight.generated_at }
            : null;

        const publicPeers = peers.map(({ label, branch, size_band, similarity_score, match_label, params, position }) => ({
            label,
            branch,
            size_band,
            similarity_score,
            match_label,
            params,
            position,
        }));

        return res.json({
            no_data: false,
            schema,
            aggregates,
            observation_count: usableBenchmarks.length,
            above_market_pct,
            match_context: {
                company_branch: clientBranchName,
                company_size_band: getFteBand(clientProfile.employee_count),
                matched_on: Array.from(allMatchedOn),
            },
            peers: publicPeers,
            insight,
        });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const regenerateInsight = async (req, res) => {
    try {
        const bdBenefitId = await benchmarkData.resolveBdBenefitId(req.nsBenefitId);
        if (bdBenefitId == null) return res.status(404).json({ message: 'Benefit niet gevonden' });

        const [benefit, rawBenchmarks, clientProfile, schemaRow] = await Promise.all([
            benchmarkData.getBenefitById(bdBenefitId),
            benchmarkData.getBenchmarksForBenefit(bdBenefitId),
            benchmarkData.getClientProfile(req.administrationId),
            benchmarkData.getParameterSchema(bdBenefitId),
        ]);
        const benchmarks = rawBenchmarks.filter(isBenchmarkableObservation);

        if (!benefit || benchmarks.length === 0 || !schemaRow || !clientProfile) {
            return res.status(400).json({ message: 'Onvoldoende data voor inzicht' });
        }

        const extractedMap = await benchmarkData.getExtractedParams(benchmarks.map((b) => b.id));

        const usableBenchmarks = benchmarks.filter((b) => {
            const params = extractedMap.get(b.id);
            if (!params) return false;
            return Object.values(params).some((v) => v !== null && v !== undefined);
        });

        if (usableBenchmarks.length === 0) {
            return res.status(400).json({ message: 'Onvoldoende data voor inzicht' });
        }

        const usableMap = new Map(usableBenchmarks.map((b) => [b.id, extractedMap.get(b.id)]));
        const aggregates = computeAggregates(schemaRow.parameters, usableMap);
        const clientBranchName = await getBranchNames(clientProfile.branche);

        const benefitMeta = await dbQuery(
            'SELECT implementation_mode, implementation FROM ns_benefits WHERE id = ? LIMIT 1',
            [req.nsBenefitId]
        );

        let clientImplementation = null;

        if (benefitMeta.length > 0) {
            const mode = benefitMeta[0].implementation_mode;
            const legacyText = benefitMeta[0].implementation;

            const implRows = await dbQuery(
                'SELECT title, implementation FROM ns_benefit_implementations WHERE benefit_id = ? ORDER BY sort_order ASC, id ASC',
                [req.nsBenefitId]
            );

            if (implRows.length > 0) {
                if (mode === 'multiple') {
                    clientImplementation = implRows
                        .map((r) => {
                            const title = r.title ? r.title.trim() : '';
                            const body = r.implementation ? r.implementation.trim() : '';
                            if (title && body) return `- ${title}: ${body}`;
                            return `- ${body || title}`;
                        })
                        .filter((line) => line !== '- ')
                        .join('\n');
                } else {
                    clientImplementation = implRows
                        .map((r) => (r.implementation || '').trim())
                        .filter(Boolean)
                        .join('\n\n');
                }
            } else if (legacyText && legacyText.trim().length > 0) {
                clientImplementation = legacyText.trim();
            }
        }

        const insightText = await benchmarkAI.generateInsight(
            benefit,
            {
                name: clientProfile.name,
                branche_name: clientBranchName,
                employee_count: clientProfile.employee_count,
            },
            clientImplementation,
            aggregates,
            usableBenchmarks.length
        );

        await benchmarkData.saveInsight(bdBenefitId, req.administrationId, insightText);

        const cached = await benchmarkData.getInsight(bdBenefitId, req.administrationId);
        return res.json({ text: cached.insight_text, generated_at: cached.generated_at });
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ message: 'API call failed' });
    }
};

module.exports = { viewBenchmark, regenerateInsight };
