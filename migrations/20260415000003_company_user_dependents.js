// Migration 3: Tables that depend on ns_users and/or ns_companies
// Depends on: ns_users, ns_companies, ns_roles, ns_bd_stakeholders (migrations 1-2)

exports.up = async function (knex) {
  // ns_companyprofiles — extended profile data per company
  if (!(await knex.schema.hasTable('ns_companyprofiles'))) {
    await knex.schema.createTable('ns_companyprofiles', (table) => {
      table.increments('id');
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
      table.string('address', 500).nullable();
      table.integer('founding_year').nullable();
      table.integer('branche').unsigned().nullable();
      table.json('locations').nullable();
      table.json('entities').nullable();
      table.boolean('works_council').nullable();
      table.integer('contact').unsigned().nullable();     // FK to ns_users.id
      table.json('caos').nullable();
      table.boolean('outside_cao').nullable();
      table.json('communication_channels').nullable();
      table.integer('employee_count').nullable();
      table.decimal('average_age', 5, 2).nullable();
      table.json('employee_groups').nullable();
      table.decimal('percentage_fulltime', 5, 2).nullable();
      table.decimal('percentage_permanent_contracts', 5, 2).nullable();
      table.boolean('flexible_contracts').nullable();
      table.decimal('inflow_fte', 10, 2).nullable();
      table.decimal('outflow_fte', 10, 2).nullable();
      table.decimal('benefits_budget', 15, 2).nullable();
      table.decimal('total_payroll', 15, 2).nullable();
      table.decimal('recruitment_costs', 15, 2).nullable();
      table.integer('hr_channel').unsigned().nullable();
      table.json('languages').nullable();
      table.boolean('openness').nullable();
      table.integer('communication_difficulty').nullable();
      table.text('communication_questions').nullable();
      table.boolean('communication_share').nullable();
      table.json('strategy_core_values').nullable();
      table.json('strategy_leading_values').nullable();
      table.json('sdgs').nullable();
      table.boolean('friction').nullable();
      table.text('recruitment_problems').nullable();
      table.decimal('engagement', 5, 2).nullable();
      table.boolean('kpi_process').nullable();
      table.decimal('kpi_absence', 5, 2).nullable();
      table.timestamps(true, true);
    });
  }

  // ns_employees
  if (!(await knex.schema.hasTable('ns_employees'))) {
    await knex.schema.createTable('ns_employees', (table) => {
      table.increments('id');
      table.string('uuid', 36).notNullable().unique();
      table.string('first_name', 100).nullable();
      table.string('last_name', 100).nullable();
      table.date('birthdate').nullable();
      table.string('email', 255).nullable();
      table.enum('gender', ['male', 'female']).nullable();
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
      table.enum('status', ['active', 'archived']).defaultTo('active');
      table.timestamps(true, true);
    });
  }

  // ns_themes — benefit themes, can be company-specific or global
  if (!(await knex.schema.hasTable('ns_themes'))) {
    await knex.schema.createTable('ns_themes', (table) => {
      table.increments('id');
      table.string('key_name', 100).notNullable();
      table.string('name', 255).notNullable();
      table.integer('company').unsigned().nullable();     // FK to ns_companies.id (null = global)
      table.string('icon', 255).nullable();
      table.text('usps').nullable();
    });
  }

  // ns_themes_templates — read-only global theme templates
  if (!(await knex.schema.hasTable('ns_themes_templates'))) {
    await knex.schema.createTable('ns_themes_templates', (table) => {
      table.increments('id');
      table.string('key_name', 100).notNullable();
      table.string('name', 255).notNullable();
      table.string('icon', 255).nullable();
    });
  }

  // ns_entities — legal/business entities per company
  if (!(await knex.schema.hasTable('ns_entities'))) {
    await knex.schema.createTable('ns_entities', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
    });
  }

  // ns_user_company — user ↔ company association with role
  if (!(await knex.schema.hasTable('ns_user_company'))) {
    await knex.schema.createTable('ns_user_company', (table) => {
      table.increments('id');
      table.integer('user').unsigned().notNullable();       // FK to ns_users.id
      table.integer('company').unsigned().notNullable();    // FK to ns_companies.id
      table.integer('role').unsigned().nullable();          // FK to ns_roles.id
      table.integer('stakeholder').unsigned().nullable();   // FK to ns_bd_stakeholders.id
    });
  }

  // ns_corevalues — company core values
  if (!(await knex.schema.hasTable('ns_corevalues'))) {
    await knex.schema.createTable('ns_corevalues', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
    });
  }
};

exports.down = async function (knex) {
  const tables = [
    'ns_corevalues',
    'ns_user_company',
    'ns_entities',
    'ns_themes_templates',
    'ns_themes',
    'ns_employees',
    'ns_companyprofiles',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
};
