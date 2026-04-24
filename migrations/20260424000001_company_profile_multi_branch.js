exports.up = async function (knex) {
    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.json('branche_new').nullable();
    });

    await knex.raw(`
        UPDATE ns_companyprofiles
        SET branche_new = JSON_ARRAY(branche)
        WHERE branche IS NOT NULL
    `);

    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.dropColumn('branche');
    });

    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.renameColumn('branche_new', 'branche');
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.integer('branche_old').unsigned().nullable();
    });

    await knex.raw(`
        UPDATE ns_companyprofiles
        SET branche_old = CAST(JSON_UNQUOTE(JSON_EXTRACT(branche, '$[0]')) AS UNSIGNED)
        WHERE branche IS NOT NULL AND JSON_LENGTH(branche) > 0
    `);

    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.dropColumn('branche');
    });

    await knex.schema.alterTable('ns_companyprofiles', (table) => {
        table.renameColumn('branche_old', 'branche');
    });
};
