// Migration 6: Benchmarks and remaining tables
// Depends on: ns_branches, ns_organization_types, ns_sources, ns_bd_benefits,
//             ns_target_groups, ns_benefits, ns_companies, ns_users (migrations 1-5)

exports.up = async function (knex) {
  // ns_benchmark_companies — reference companies used in benchmarking
  if (!(await knex.schema.hasTable('ns_benchmark_companies'))) {
    await knex.schema.createTable('ns_benchmark_companies', (table) => {
      table.increments('id');
      table.string('title', 255).notNullable();
      table.integer('branche_id').unsigned().nullable();           // FK to ns_branches.id
      table.integer('employee_count').nullable();
      table.integer('organization_type_id').unsigned().nullable(); // FK to ns_organization_types.id
      table.json('countries').nullable();
      table.boolean('has_cao').defaultTo(false);
      table.integer('cao_id').unsigned().nullable();               // FK to ns_caos.id
      table.timestamps(true, true);
    });
  }

  // ns_benchmarks — benchmark data points per benefit
  if (!(await knex.schema.hasTable('ns_benchmarks'))) {
    await knex.schema.createTable('ns_benchmarks', (table) => {
      table.increments('id');
      table.integer('benchmark_company_id').unsigned().nullable(); // FK to ns_benchmark_companies.id
      table.integer('source_of_truth_id').unsigned().nullable();   // FK to ns_sources.id
      table.integer('reliability').nullable();
      table.timestamp('updated_at').nullable();
      table.integer('benefit_id').unsigned().nullable();           // FK to ns_bd_benefits.id
      table.integer('target_group_id').unsigned().nullable();      // FK to ns_target_groups.id
      table.integer('legal_basis_id').unsigned().nullable();
      table.boolean('statutory_expansion').nullable();
      table.text('description').nullable();
      table.boolean('active').defaultTo(true);
      table.timestamp('created_at').nullable();
    });
  }

  // ns_bestpractices — company best practice examples linked to benefits
  if (!(await knex.schema.hasTable('ns_bestpractices'))) {
    await knex.schema.createTable('ns_bestpractices', (table) => {
      table.increments('id');
      table.integer('benefit').unsigned().notNullable();   // FK to ns_benefits.id
      table.integer('company').unsigned().notNullable();   // FK to ns_companies.id
      table.integer('user').unsigned().notNullable();      // FK to ns_users.id
      table.text('content').nullable();
      table.boolean('public').defaultTo(false);
      table.enum('status', ['published', 'draft']).defaultTo('draft');
      table.timestamps(true, true);
    });
  }
};

exports.down = async function (knex) {
  const tables = [
    'ns_bestpractices',
    'ns_benchmarks',
    'ns_benchmark_companies',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
};
