exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('ns_branch_groups'))) {
    await knex.schema.createTable('ns_branch_groups', (table) => {
      table.increments('id');
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.timestamps(true, true);
    });
  }

  if (!(await knex.schema.hasTable('ns_branch_group_members'))) {
    await knex.schema.createTable('ns_branch_group_members', (table) => {
      table.increments('id');
      table.integer('group_id').unsigned().notNullable();  // FK to ns_branch_groups.id
      table.integer('branch_id').unsigned().notNullable(); // FK to ns_branches.id
      table.timestamps(true, true);
      table.unique(['group_id', 'branch_id']);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ns_branch_group_members');
  await knex.schema.dropTableIfExists('ns_branch_groups');
};
