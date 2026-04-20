// Migration: Benchmark AI tables
// Adds three additive tables for the AI read-layer on top of existing benchmark data:
//   - ns_benefit_parameter_schemas:   one schema per benefit (AI-generated from ns_benchmarks.description)
//   - ns_benchmark_extracted_params:  cache of AI-extracted parameter values per ns_benchmarks row
//   - ns_benefit_benchmark_insights:  per-company cached AI insight text
//
// Depends on: ns_bd_benefits (migration 4), ns_benchmarks (migration 6), ns_companies (migration 1)
// Does NOT touch existing ns_benchmarks or ns_benchmark_companies.

exports.up = async function (knex) {
    if (!(await knex.schema.hasTable('ns_benefit_parameter_schemas'))) {
        await knex.schema.createTable('ns_benefit_parameter_schemas', (table) => {
            table.increments('id');
            table.integer('benefit_id').unsigned().notNullable().unique(); // FK to ns_bd_benefits.id
            table.json('parameters').notNullable();
            table.timestamps(true, true);
        });
    }

    if (!(await knex.schema.hasTable('ns_benchmark_extracted_params'))) {
        await knex.schema.createTable('ns_benchmark_extracted_params', (table) => {
            table.increments('id');
            table.integer('benchmark_id').unsigned().notNullable().unique(); // FK to ns_benchmarks.id
            table.integer('benefit_id').unsigned().notNullable();            // FK to ns_bd_benefits.id (denormalized for fast lookup)
            table.json('parameters').notNullable();
            table.timestamp('extracted_at').defaultTo(knex.fn.now());

            table.index('benefit_id', 'idx_extracted_benefit_id');
        });
    }

    if (!(await knex.schema.hasTable('ns_benefit_benchmark_insights'))) {
        await knex.schema.createTable('ns_benefit_benchmark_insights', (table) => {
            table.increments('id');
            table.integer('benefit_id').unsigned().notNullable();  // FK to ns_bd_benefits.id
            table.integer('company_id').unsigned().notNullable();  // FK to ns_companies.id
            table.text('insight_text').notNullable();
            table.timestamp('generated_at').defaultTo(knex.fn.now());
            table.timestamp('expires_at').notNullable();

            table.unique(['benefit_id', 'company_id'], 'uniq_insight_benefit_company');
            table.index('benefit_id', 'idx_insight_benefit_id');
            table.index('expires_at', 'idx_insight_expires_at');
        });
    }
};

exports.down = async function (knex) {
    const tables = [
        'ns_benefit_benchmark_insights',
        'ns_benchmark_extracted_params',
        'ns_benefit_parameter_schemas',
    ];
    for (const t of tables) {
        await knex.schema.dropTableIfExists(t);
    }
};