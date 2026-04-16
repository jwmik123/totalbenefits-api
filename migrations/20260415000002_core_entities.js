// Migration 2: Core entities — ns_users and ns_companies
// Depends on: ns_roles, ns_branches, ns_subbranches (migration 1)

exports.up = async function (knex) {
  // ns_users
  if (!(await knex.schema.hasTable('ns_users'))) {
    await knex.schema.createTable('ns_users', (table) => {
      table.increments('id');
      table.string('uuid', 36).notNullable().unique();
      table.string('first_name', 100);
      table.string('last_name', 100);
      table.string('email', 255).unique();
      table.string('password_hash', 255);
      table.integer('role').unsigned();          // FK to ns_roles.id
      table.enum('status', ['active', 'inactive']).defaultTo('active');
      table.string('reset_token', 255).nullable();
      table.timestamp('reset_token_expires').nullable();
      table.string('image', 255).nullable();
      table.boolean('public').defaultTo(false);
      table.timestamps(true, true);
    });
  }

  // ns_companies
  if (!(await knex.schema.hasTable('ns_companies'))) {
    await knex.schema.createTable('ns_companies', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.string('logo', 500).nullable();
      table.string('thumbnail', 500).nullable();
      table.integer('branche').unsigned();       // FK to ns_branches.id
      table.integer('subbranche').unsigned();    // FK to ns_subbranches.id
      table.timestamps(true, true);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ns_companies');
  await knex.schema.dropTableIfExists('ns_users');
};
