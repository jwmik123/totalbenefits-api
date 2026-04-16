// Migration 1: Lookup / reference tables (no foreign key dependencies)
// These are mostly read-only seed data tables.

exports.up = async function (knex) {
  // ns_roles
  if (!(await knex.schema.hasTable('ns_roles'))) {
    await knex.schema.createTable('ns_roles', (table) => {
      table.increments('id');
      table.string('label', 100).notNullable();
      table.string('key_name', 100).notNullable().unique();
      table.boolean('visible').defaultTo(true);
      table.integer('menu_order').defaultTo(0);
    });
  }

  // ns_branches
  if (!(await knex.schema.hasTable('ns_branches'))) {
    await knex.schema.createTable('ns_branches', (table) => {
      table.increments('id');
      table.string('key', 100);
      table.string('name', 255).notNullable();
    });
  }

  // ns_subbranches
  if (!(await knex.schema.hasTable('ns_subbranches'))) {
    await knex.schema.createTable('ns_subbranches', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.integer('parent').unsigned();  // FK to ns_branches.id
    });
  }

  // ns_benefit_statuses
  if (!(await knex.schema.hasTable('ns_benefit_statuses'))) {
    await knex.schema.createTable('ns_benefit_statuses', (table) => {
      table.increments('id');
      table.string('label', 100).notNullable();
      table.string('color', 50);
      table.string('icon', 100);
      table.integer('sequence').defaultTo(0);
    });
  }

  // ns_tags
  if (!(await knex.schema.hasTable('ns_tags'))) {
    await knex.schema.createTable('ns_tags', (table) => {
      table.increments('id');
      table.string('key_name', 100).unique();
      table.string('value', 255);
    });
  }

  // ns_caos (Collective Labor Agreements)
  if (!(await knex.schema.hasTable('ns_caos'))) {
    await knex.schema.createTable('ns_caos', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_countries
  if (!(await knex.schema.hasTable('ns_countries'))) {
    await knex.schema.createTable('ns_countries', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_languages
  if (!(await knex.schema.hasTable('ns_languages'))) {
    await knex.schema.createTable('ns_languages', (table) => {
      table.increments('id');
      table.string('label', 100).notNullable();
    });
  }

  // ns_benefit_compensation_types
  if (!(await knex.schema.hasTable('ns_benefit_compensation_types'))) {
    await knex.schema.createTable('ns_benefit_compensation_types', (table) => {
      table.increments('id');
      table.string('label', 255);
    });
  }

  // ns_benefit_tax_regimes
  if (!(await knex.schema.hasTable('ns_benefit_tax_regimes'))) {
    await knex.schema.createTable('ns_benefit_tax_regimes', (table) => {
      table.increments('id');
      table.string('label', 255);
    });
  }

  // ns_organization_types
  if (!(await knex.schema.hasTable('ns_organization_types'))) {
    await knex.schema.createTable('ns_organization_types', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_sources (data sources for benchmarks)
  if (!(await knex.schema.hasTable('ns_sources'))) {
    await knex.schema.createTable('ns_sources', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_target_groups
  if (!(await knex.schema.hasTable('ns_target_groups'))) {
    await knex.schema.createTable('ns_target_groups', (table) => {
      table.increments('id');
      table.string('label', 255);
      table.integer('menu_order').defaultTo(0);
    });
  }

  // ns_communication_channels
  if (!(await knex.schema.hasTable('ns_communication_channels'))) {
    await knex.schema.createTable('ns_communication_channels', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_hr_channels
  if (!(await knex.schema.hasTable('ns_hr_channels'))) {
    await knex.schema.createTable('ns_hr_channels', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_employee_groups
  if (!(await knex.schema.hasTable('ns_employee_groups'))) {
    await knex.schema.createTable('ns_employee_groups', (table) => {
      table.increments('id');
      table.string('title', 255);
    });
  }

  // ns_sdgs (Sustainable Development Goals)
  if (!(await knex.schema.hasTable('ns_sdgs'))) {
    await knex.schema.createTable('ns_sdgs', (table) => {
      table.increments('id');
      table.string('name', 255);
      table.integer('order_value').defaultTo(0);
    });
  }

  // ns_bd_themes (benefits database themes)
  if (!(await knex.schema.hasTable('ns_bd_themes'))) {
    await knex.schema.createTable('ns_bd_themes', (table) => {
      table.increments('id');
      table.string('value', 255);
    });
  }

  // ns_bd_stakeholders
  if (!(await knex.schema.hasTable('ns_bd_stakeholders'))) {
    await knex.schema.createTable('ns_bd_stakeholders', (table) => {
      table.increments('id');
      table.string('value', 255);
    });
  }

  // ns_bd_kpis
  if (!(await knex.schema.hasTable('ns_bd_kpis'))) {
    await knex.schema.createTable('ns_bd_kpis', (table) => {
      table.increments('id');
      table.string('value', 255);
    });
  }

  // ns_bd_likes_statuses
  if (!(await knex.schema.hasTable('ns_bd_likes_statuses'))) {
    await knex.schema.createTable('ns_bd_likes_statuses', (table) => {
      table.increments('id');
      table.string('label', 100).notNullable();
      table.string('color', 50);
    });
  }
};

exports.down = async function (knex) {
  // Drop in reverse order
  const tables = [
    'ns_bd_likes_statuses',
    'ns_bd_kpis',
    'ns_bd_stakeholders',
    'ns_bd_themes',
    'ns_sdgs',
    'ns_employee_groups',
    'ns_hr_channels',
    'ns_communication_channels',
    'ns_target_groups',
    'ns_sources',
    'ns_organization_types',
    'ns_benefit_tax_regimes',
    'ns_benefit_compensation_types',
    'ns_languages',
    'ns_countries',
    'ns_caos',
    'ns_tags',
    'ns_benefit_statuses',
    'ns_subbranches',
    'ns_branches',
    'ns_roles',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
};
