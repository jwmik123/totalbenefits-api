exports.up = async function (knex) {
    await knex.schema.createTable('ns_benefit_implementations', (table) => {
        table.increments('id');
        table.integer('benefit_id').unsigned().notNullable();
        table.string('title', 255).nullable();
        table.text('implementation').nullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

        table.index('benefit_id', 'idx_impl_benefit_id');
    });

    await knex.schema.createTable('ns_benefit_implementation_codes', (table) => {
        table.increments('id');
        table.integer('implementation_id').unsigned().notNullable();
        table.string('code', 50).notNullable();
        table.string('sector_name', 255).nullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());

        table.index('implementation_id', 'idx_impl_codes_impl_id');
        table.unique(['implementation_id', 'code'], 'uniq_impl_code');
    });

    await knex.schema.table('ns_benefits', (table) => {
        table.enu('implementation_mode', ['single', 'multiple']).notNullable().defaultTo('single');
    });

    // Backfill: one implementation row per benefit that has a non-empty implementation
    await knex.raw(`
        INSERT INTO ns_benefit_implementations (benefit_id, title, implementation, sort_order)
        SELECT id, NULL, implementation, 0
        FROM ns_benefits
        WHERE implementation IS NOT NULL AND implementation <> ''
    `);
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('ns_benefit_implementation_codes');
    await knex.schema.dropTableIfExists('ns_benefit_implementations');
    await knex.schema.table('ns_benefits', (table) => {
        table.dropColumn('implementation_mode');
    });
};
