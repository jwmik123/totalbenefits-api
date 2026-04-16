// Migration 4: Benefits tables
// Depends on: ns_themes, ns_benefit_statuses, ns_companies, ns_users, ns_bd_stakeholders,
//             ns_bd_likes_statuses (migrations 1-3)

exports.up = async function (knex) {
  // ns_bd_benefits — global benefits database (read-only reference data)
  if (!(await knex.schema.hasTable('ns_bd_benefits'))) {
    await knex.schema.createTable('ns_bd_benefits', (table) => {
      table.increments('id');
      table.string('uuid', 36).notNullable().unique();
      table.string('title', 255).notNullable();
      table.text('introduction').nullable();
      table.text('synonyms').nullable();
      table.integer('financial_score').nullable();
      table.text('financial_content').nullable();
      table.text('legal').nullable();
      table.text('tax_legislation').nullable();
      table.text('implementation_methods').nullable();
      table.text('pros').nullable();
      table.text('cons').nullable();
      table.integer('uniqueness_score').nullable();
      table.text('uniqueness_content').nullable();
      table.json('themes').nullable();
      table.json('tags').nullable();
      table.json('stakeholders').nullable();
      table.string('document', 500).nullable();
      table.text('sample_implementation_texts').nullable();
      table.json('branches').nullable();
      table.json('suppliers').nullable();
      table.json('articles').nullable();
      table.json('correlations').nullable();
      table.text('communication_strategy').nullable();
      table.json('kpi_metrics').nullable();
      table.integer('implementation_complexity').nullable();
      table.string('implementation_timeframe', 100).nullable();
      table.text('implementation_content').nullable();
      table.text('system_requirements').nullable();
      table.string('update_frequency', 100).nullable();
      table.text('update_frequency_content').nullable();
      table.timestamps(true, true);
    });
  }

  // ns_benefits — company-specific working conditions / benefits
  if (!(await knex.schema.hasTable('ns_benefits'))) {
    await knex.schema.createTable('ns_benefits', (table) => {
      table.increments('id');
      table.string('uuid', 36).notNullable().unique();
      table.string('title', 255).notNullable();
      table.integer('theme').unsigned().nullable();         // FK to ns_themes.id
      table.json('entities').nullable();
      table.integer('status').unsigned().nullable();        // FK to ns_benefit_statuses.id
      table.text('description').nullable();
      table.text('implementation').nullable();
      table.date('since').nullable();
      table.integer('target_group').unsigned().nullable();
      table.integer('usage_count').nullable();
      table.decimal('price_per_year', 15, 2).nullable();
      table.integer('linked_benefit').unsigned().nullable();
      table.integer('company').unsigned().notNullable();    // FK to ns_companies.id
      table.json('tags').nullable();
      table.json('branches').nullable();
      table.string('document', 500).nullable();
      table.text('legal_basis').nullable();
      table.boolean('legal_extension').defaultTo(false);
      table.integer('cao').unsigned().nullable();
      table.boolean('disable_cao').defaultTo(false);
      table.integer('compensation_type').unsigned().nullable();
      table.integer('tax_regime').unsigned().nullable();
      table.text('purpose').nullable();
      table.json('organizational_themes').nullable();
      table.json('core_values').nullable();
      table.integer('stakeholder_owner').unsigned().nullable();
      table.date('last_review').nullable();
      table.date('next_review').nullable();
      table.text('notes').nullable();
      table.timestamps(true, true);
    });
  }

  // ns_benefit_logs — audit log for benefit changes
  if (!(await knex.schema.hasTable('ns_benefit_logs'))) {
    await knex.schema.createTable('ns_benefit_logs', (table) => {
      table.increments('id');
      table.integer('benefit').unsigned().notNullable();  // FK to ns_benefits.id
      table.text('description').nullable();
      table.enum('role', ['super_admin', 'user']).nullable();
      table.timestamps(true, true);
    });
  }

  // ns_bd_likes — user favourites / shortlist from benefits database
  if (!(await knex.schema.hasTable('ns_bd_likes'))) {
    await knex.schema.createTable('ns_bd_likes', (table) => {
      table.increments('id');
      table.integer('benefit').unsigned().notNullable();  // FK to ns_bd_benefits.id
      table.integer('user').unsigned().notNullable();     // FK to ns_users.id
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
      table.text('note').nullable();
      table.integer('status').unsigned().nullable();      // FK to ns_bd_likes_statuses.id
      table.timestamps(true, true);
    });
  }

  // ns_bd_likes_liked — tracks which users have liked a bd_like entry
  if (!(await knex.schema.hasTable('ns_bd_likes_liked'))) {
    await knex.schema.createTable('ns_bd_likes_liked', (table) => {
      table.increments('id');
      table.integer('bd_like').unsigned().notNullable();  // FK to ns_bd_likes.id
      table.integer('user').unsigned().notNullable();     // FK to ns_users.id
      table.timestamps(true, true);
    });
  }
};

exports.down = async function (knex) {
  const tables = [
    'ns_bd_likes_liked',
    'ns_bd_likes',
    'ns_benefit_logs',
    'ns_benefits',
    'ns_bd_benefits',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
};
