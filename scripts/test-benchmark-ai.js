require('dotenv').config();

const benchmarkData = require('../services/benchmark-data');
const benchmarkAI = require('../services/benchmark-ai');
const db = require('../models/db');
const { dbQuery } = require('../helpers/helper');

const main = async () => {
    const [,, benefitArg, companyArg] = process.argv;

    if (!benefitArg || !companyArg || isNaN(Number(benefitArg)) || isNaN(Number(companyArg))) {
        console.error('Usage: node scripts/test-benchmark-ai.js <benefitId> <companyId>');
        console.error('Both args are required and must be numeric.');
        process.exit(1);
    }

    const benefitId = Number(benefitArg);
    const companyId = Number(companyArg);

    // ── Prerequisites ─────────────────────────────────────────────────────────

    const benefit = await benchmarkData.getBenefitById(benefitId);
    if (!benefit) {
        console.error(`Benefit not found: id=${benefitId}`);
        process.exit(1);
    }

    const benchmarks = await benchmarkData.getBenchmarksForBenefit(benefitId);
    if (benchmarks.length === 0) {
        console.error(`No active benchmarks found for benefit ${benefitId}`);
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

    console.log('\nCalling generateInsight...');
    const insight = await benchmarkAI.generateInsight(benefit, clientProfile, aggregates, benchmarks.length);
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
