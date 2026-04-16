// Migration 5: Deep dive survey system
// Depends on: ns_companies, ns_employees, ns_benefits, ns_themes (migrations 1-4)

exports.up = async function (knex) {
  // ns_surveys — survey definitions sent to employees
  if (!(await knex.schema.hasTable('ns_surveys'))) {
    await knex.schema.createTable('ns_surveys', (table) => {
      table.increments('id');
      table.string('uuid', 36).notNullable().unique();
      table.string('title', 255).nullable();
      table.integer('company').unsigned().notNullable();  // FK to ns_companies.id
      table.json('benefits').nullable();
      table.timestamp('sent').nullable();
      table.timestamp('reminder_sent').nullable();
      table.timestamps(true, true);
    });
  }

  // ns_employee_surveys — one row per employee per survey (tracks submission)
  if (!(await knex.schema.hasTable('ns_employee_surveys'))) {
    await knex.schema.createTable('ns_employee_surveys', (table) => {
      table.increments('id');
      table.integer('survey').unsigned().notNullable();    // FK to ns_surveys.id
      table.integer('employee').unsigned().notNullable();  // FK to ns_employees.id
      table.string('access_token', 255).nullable();
      table.timestamp('submitted_at').nullable();
      table.timestamps(true, true);
    });
  }

  // ns_questions — employee answers per benefit within a survey
  if (!(await knex.schema.hasTable('ns_questions'))) {
    await knex.schema.createTable('ns_questions', (table) => {
      table.increments('id');
      table.integer('benefit').unsigned().nullable();          // FK to ns_benefits.id
      table.integer('survey').unsigned().nullable();           // FK to ns_surveys.id
      table.integer('employee_survey').unsigned().nullable();  // FK to ns_employee_surveys.id
      table.integer('employee').unsigned().nullable();         // FK to ns_employees.id
      table.decimal('relevance', 5, 2).nullable();
      table.decimal('communication', 5, 2).nullable();
      table.text('note').nullable();
      table.timestamps(true, true);
    });
  }

  // ns_questions_themes — employee theme ratings / budget allocation per survey
  if (!(await knex.schema.hasTable('ns_questions_themes'))) {
    await knex.schema.createTable('ns_questions_themes', (table) => {
      table.increments('id');
      table.integer('theme').unsigned().nullable();            // FK to ns_themes.id
      table.integer('survey').unsigned().nullable();           // FK to ns_surveys.id
      table.integer('employee_survey').unsigned().nullable();  // FK to ns_employee_surveys.id
      table.integer('employee').unsigned().nullable();         // FK to ns_employees.id
      table.boolean('selected').defaultTo(false);
      table.decimal('budget', 10, 2).nullable();
      table.timestamps(true, true);
    });
  }
};

exports.down = async function (knex) {
  const tables = [
    'ns_questions_themes',
    'ns_questions',
    'ns_employee_surveys',
    'ns_surveys',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
};
