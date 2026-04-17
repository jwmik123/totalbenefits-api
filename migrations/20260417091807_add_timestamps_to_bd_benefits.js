exports.up = async function (knex) {
    const hasCreatedAt = await knex.schema.hasColumn('ns_bd_benefits', 'created_at');
    const hasUpdatedAt = await knex.schema.hasColumn('ns_bd_benefits', 'updated_at');

    if (!hasCreatedAt || !hasUpdatedAt) {
        await knex.schema.alterTable('ns_bd_benefits', (table) => {
            if (!hasCreatedAt) table.timestamp('created_at').defaultTo(knex.fn.now());
            if (!hasUpdatedAt) table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.alterTable('ns_bd_benefits', (table) => {
        table.dropColumn('created_at');
        table.dropColumn('updated_at');
    });
};
