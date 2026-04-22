require('dotenv').config();

const benchmarkData = require('../services/benchmark-data');
const benchmarkAI = require('../services/benchmark-ai');
const db = require('../models/db');
const { dbQuery } = require('../helpers/helper');

const main = async () => {
    const [,, benefitArg, companyArg] = process.argv;

    if (!benefitArg || !companyArg || isNaN(Number(benefitArg)) || isNaN(Number(companyArg))) {
        console.error('Usage: node scripts/test-benchmark-ai.js <nsBenefitId> <companyId>');
        console.error('Both args are required and must be numeric.');
        console.error('nsBenefitId = ns_benefits.id (the client benefit row)');
        process.exit(1);
    }

    const nsBenefitId = Number(benefitArg);
    const companyId = Number(companyArg);

    // ── Prerequisites ─────────────────────────────────────────────────────────

    const bdBenefitId = await benchmarkData.resolveBdBenefitId(nsBenefitId);
    if (bdBenefitId == null) {
        console.error(`ns_benefit id=${nsBenefitId} has no linked_benefit (ns_bd_benefits). Is it linked?`);
        process.exit(1);
    }
    console.log(`Resolved ns_benefit ${nsBenefitId} → bd_benefit ${bdBenefitId}`);

    const benefit = await benchmarkData.getBenefitById(bdBenefitId);
    if (!benefit) {
        console.error(`Benefit not found: id=${bdBenefitId}`);
        process.exit(1);
    }

    const benchmarks = await benchmarkData.getBenchmarksForBenefit(bdBenefitId);
    if (benchmarks.length === 0) {
        console.error(`No active benchmarks found for benefit ${bdBenefitId}`);
        process.exit(1);
    }

    const clientProfile = await benchmarkData.getClientProfile(companyId);
    if (!clientProfile) {
        console.error(`Company not found: id=${companyId}`);
        process.exit(1);
    }

    // Resolve branche_name inline — not modifying benchmark-data.js
    if (clientProfile.branche) {
        const rows = await dbQuery('SELECT name FROM ns_branches WHERE id = ?', [clientProfile.branche]);
        clientProfile.branche_name = rows[0] ? rows[0].name : null;
    } else {
        clientProfile.branche_name = null;
    }

    // ── TEST 1: Schema generation ─────────────────────────────────────────────

    console.log('\n=== TEST 1: Schema generation ===');
    console.log(`Benefit: "${benefit.title}" (id=${benefit.id})`);
    console.log(`Benchmarks: ${benchmarks.length} active rows`);
    console.log('\nDescriptions:');
    benchmarks.forEach((b, i) => {
        const snippet = (b.description || '').slice(0, 200);
        console.log(`  ${i + 1}. [id=${b.id}] ${snippet}${b.description && b.description.length > 200 ? '...' : ''}`);
    });

    console.log('\nCalling generateSchema...');
    const descriptions = benchmarks.map((b) => b.description || '');
    const schema = await benchmarkAI.generateSchema(benefit, descriptions);
    console.log('\nSchema:');
    console.log(JSON.stringify(schema, null, 2));

    // ── TEST 2: Param extraction ───────────────────────────────────────────────

    console.log('\n=== TEST 2: Param extraction ===');
    const extractedByBenchmarkId = {};

    for (const b of benchmarks) {
        console.log(`\n--- Benchmark id=${b.id} ---`);
        const snippet = (b.description || '').slice(0, 200);
        console.log(`Description: ${snippet}${b.description && b.description.length > 200 ? '...' : ''}`);
        const params = await benchmarkAI.extractParams(schema, b.description || '');
        console.log('Extracted:', JSON.stringify(params, null, 2));
        extractedByBenchmarkId[b.id] = params;
    }

    // ── TEST 3: Aggregation + insight ─────────────────────────────────────────

    console.log('\n=== TEST 3: Insight generation ===');

    const aggregates = {};
    for (const entry of schema) {
        if (entry.type === 'number') {
            const values = Object.values(extractedByBenchmarkId)
                .map((p) => p[entry.key])
                .filter((v) => v !== null && v !== undefined && !isNaN(Number(v)))
                .map(Number);

            if (values.length === 0) continue;

            const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
            const min = Math.min(...values);
            const max = Math.max(...values);
            aggregates[entry.key] = { avg, min, max, unit: entry.unit || '', label: entry.label };

        } else if (entry.type === 'boolean') {
            const nonNull = Object.values(extractedByBenchmarkId)
                .map((p) => p[entry.key])
                .filter((v) => v !== null && v !== undefined);

            if (nonNull.length === 0) continue;

            const trueCount = nonNull.filter((v) => v === true).length;
            const true_pct = Math.round((trueCount / nonNull.length) * 100);
            aggregates[entry.key] = { true_pct, label: entry.label };
        }
        // type === 'string': skip
    }

    console.log('\nAggregates:');
    console.log(JSON.stringify(aggregates, null, 2));

    console.log('\nClient profile:');
    console.log(`  name:          ${clientProfile.name}`);
    console.log(`  branche_name:  ${clientProfile.branche_name}`);
    console.log(`  employee_count: ${clientProfile.employee_count}`);

    // Fetch client's own implementation text (mirrors controller logic)
    let clientImplementation = null;
    const benefitMeta = await dbQuery(
        'SELECT implementation_mode, implementation FROM ns_benefits WHERE id = ? LIMIT 1',
        [nsBenefitId]
    );
    if (benefitMeta.length > 0) {
        const mode = benefitMeta[0].implementation_mode;
        const legacyText = benefitMeta[0].implementation;
        const implRows = await dbQuery(
            'SELECT title, implementation FROM ns_benefit_implementations WHERE benefit_id = ? ORDER BY sort_order ASC, id ASC',
            [nsBenefitId]
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
    console.log('\nClient implementation:');
    console.log(clientImplementation ?? '(not set)');

    console.log('\nCalling generateInsight...');
    const insight = await benchmarkAI.generateInsight(benefit, clientProfile, clientImplementation, aggregates, benchmarks.length);
    console.log('\nInsight text:');
    console.log(insight);
};

main()
    .then(() => {
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => {
        // PromisePool.end() drains and closes all connections
        db.end();
    });
