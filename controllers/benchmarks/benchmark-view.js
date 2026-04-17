const benchmarkData = require('../../services/benchmark-data');
const benchmarkAI = require('../../services/benchmark-ai');
const { dbQuery } = require('../../helpers/helper');

const FTE_BANDS = [
    { max: 50,       label: '< 50 FTE' },
    { max: 100,      label: '50–100 FTE' },
    { max: 200,      label: '100–200 FTE' },
    { max: 500,      label: '200–500 FTE' },
    { max: 1000,     label: '500–1.000 FTE' },
    { max: Infinity, label: '1.000+ FTE' },
];

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

async function getBranchName(brancheId) {
    if (brancheId == null) return null;
    const rows = await dbQuery('SELECT name FROM ns_branches WHERE id = ?', [brancheId]);
    return rows[0] ? rows[0].name : null;
}

function computeSimilarity(observation, clientProfile) {
    let score = 0;
    const matched_on = [];

    if (
        observation.branche_id != null &&
        clientProfile.branche != null &&
        Number(observation.branche_id) === Number(clientProfile.branche)
    ) {
        score += 3;
        matched_on.push('branch');
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

function getMatchLabel(score) {
    if (score >= 5) return 'Sterke match';
    if (score >= 3) return 'Gedeeltelijke match';
    return 'Zwakke match';
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
        const bdBenefitId = await benchmarkData.resolveBdBenefitId(req.nsBenefitId);
        if (bdBenefitId == null) return res.json(EMPTY_RESPONSE);

        const [benefit, benchmarks, clientProfile, schemaRow] = await Promise.all([
            benchmarkData.getBenefitById(bdBenefitId),
            benchmarkData.getBenchmarksForBenefit(bdBenefitId),
            benchmarkData.getClientProfile(req.administrationId),
            benchmarkData.getParameterSchema(bdBenefitId),
        ]);

        if (!benefit || benchmarks.length === 0) return res.json(EMPTY_RESPONSE);
        if (!clientProfile) return res.status(404).json({ message: 'Administratie niet gevonden' });

        const clientBranchName = await getBranchName(clientProfile.branche);

        let schema;
        let schemaUpdatedAt;

        if (!schemaRow) {
            const descriptions = benchmarks.map((b) => b.description).filter(Boolean);
            if (descriptions.length === 0) return res.json(EMPTY_RESPONSE);
            schema = await benchmarkAI.generateSchema(benefit, descriptions);
            await benchmarkData.saveParameterSchema(bdBenefitId, schema);
            schemaUpdatedAt = new Date();
        } else {
            schema = schemaRow.parameters;
            schemaUpdatedAt = schemaRow.updated_at;
        }

        const staleBenchmarks = await benchmarkData.getStaleBenchmarks(bdBenefitId, schemaUpdatedAt);
        for (const benchmark of staleBenchmarks) {
            const params = await benchmarkAI.extractParams(schema, benchmark.description || '');
            await benchmarkData.saveExtractedParams(benchmark.id, bdBenefitId, params);
        }

        const extractedMap = await benchmarkData.getExtractedParams(benchmarks.map((b) => b.id));

        const usableBenchmarks = benchmarks.filter((b) => {
            const params = extractedMap.get(b.id);
            if (!params) return false;
            return Object.values(params).some((v) => v !== null && v !== undefined);
        });

        if (usableBenchmarks.length === 0) return res.json(EMPTY_RESPONSE);

        const peers = usableBenchmarks.map((b) => {
            const sim = computeSimilarity(b, clientProfile);
            const params = extractedMap.get(b.id) || {};
            return {
                benchmark_id: b.id,
                branch: b.branch_name,
                size_band: getFteBand(b.employee_count),
                similarity_score: sim.score,
                match_label: getMatchLabel(sim.score),
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

        const [benefit, benchmarks, clientProfile, schemaRow] = await Promise.all([
            benchmarkData.getBenefitById(bdBenefitId),
            benchmarkData.getBenchmarksForBenefit(bdBenefitId),
            benchmarkData.getClientProfile(req.administrationId),
            benchmarkData.getParameterSchema(bdBenefitId),
        ]);

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
        const clientBranchName = await getBranchName(clientProfile.branche);

        const insightText = await benchmarkAI.generateInsight(
            benefit,
            {
                name: clientProfile.name,
                branche_name: clientBranchName,
                employee_count: clientProfile.employee_count,
            },
            aggregates,
            usableBenchmarks.length
        );

        await benchmarkData.saveInsight(bdBenefitId, req.administrationId, insightText);

        const cached = await benchmarkData.getInsight(bdBenefitId, req.administrationId);
        return res.json({ text: cached.insight_text, generated_at: cached.generated_at });
    } catch (err) {
        console.error(err.response?.data || err.message || err);
        res.status(500).json({
            message: 'API call failed',
            debug: {
                message: err.message,
                stack: err.stack,
                code: err.code,
            },
        });
    }
};

module.exports = { viewBenchmark, regenerateInsight };
