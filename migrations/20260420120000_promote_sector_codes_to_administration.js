exports.up = async function (knex) {
    // Step 1: Create master sector codes table
    await knex.schema.createTable('ns_administration_sector_codes', (table) => {
        table.increments('id');
        table.integer('administration_id').unsigned().notNullable();
        table.string('code', 50).notNullable();
        table.string('sector_name', 255).nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

        table.unique(['administration_id', 'code'], 'uniq_admin_code');
        table.index('administration_id', 'idx_admin_sector_codes_admin_id');
    });

    // Steps 2+3: Backfill distinct (company, code) pairs.
    // For each (company, code) pair, picks the most recent non-null sector_name
    // across all implementation code rows for that pair. NULL if all are null.
    await knex.raw(`
        INSERT INTO ns_administration_sector_codes (administration_id, code, sector_name)
        SELECT
            b.company AS administration_id,
            ic.code,
            (
                SELECT ic2.sector_name
                FROM ns_benefit_implementation_codes ic2
                JOIN ns_benefit_implementations i2 ON ic2.implementation_id = i2.id
                JOIN ns_benefits b2 ON i2.benefit_id = b2.id
                WHERE b2.company = b.company
                  AND ic2.code = ic.code
                  AND ic2.sector_name IS NOT NULL
                ORDER BY ic2.created_at DESC
                LIMIT 1
            ) AS sector_name
        FROM ns_benefit_implementation_codes ic
        JOIN ns_benefit_implementations i ON ic.implementation_id = i.id
        JOIN ns_benefits b ON i.benefit_id = b.id
        GROUP BY b.company, ic.code
    `);

    // Step 4: Add sector_code_id column (nullable during backfill)
    await knex.schema.table('ns_benefit_implementation_codes', (table) => {
        table.integer('sector_code_id').unsigned().nullable();
    });

    // Step 5: Populate sector_code_id for every existing link row
    await knex.raw(`
        UPDATE ns_benefit_implementation_codes ic
        JOIN ns_benefit_implementations i ON ic.implementation_id = i.id
        JOIN ns_benefits b ON i.benefit_id = b.id
        JOIN ns_administration_sector_codes sc
          ON sc.administration_id = b.company AND sc.code = ic.code
        SET ic.sector_code_id = sc.id
    `);

    // Step 6: Assert no NULL sector_code_id where the implementation→benefit chain is intact.
    // Rows with broken chains (dangling implementation_id) are pre-existing data rot — left as NULL.
    const orphans = await knex.raw(`
        SELECT ic.id
        FROM ns_benefit_implementation_codes ic
        JOIN ns_benefit_implementations i ON ic.implementation_id = i.id
        JOIN ns_benefits b ON i.benefit_id = b.id
        WHERE ic.sector_code_id IS NULL
    `);
    const orphanRows = orphans[0];
    if (orphanRows.length > 0) {
        const ids = orphanRows.map(r => r.id).join(', ');
        throw new Error(
            `Migration failed: ${orphanRows.length} row(s) in ns_benefit_implementation_codes ` +
            `still have NULL sector_code_id after backfill (with intact chain to ns_benefits). ` +
            `Orphan IDs: ${ids}`
        );
    }

    // Step 7: Add FK and UNIQUE constraint
    await knex.schema.table('ns_benefit_implementation_codes', (table) => {
        table.foreign('sector_code_id', 'fk_impl_codes_sector_code')
            .references('id')
            .inTable('ns_administration_sector_codes')
            .onDelete('CASCADE');
        table.unique(['implementation_id', 'sector_code_id'], 'uniq_impl_sector_code');
    });
};

exports.down = async function (knex) {
    await knex.schema.table('ns_benefit_implementation_codes', (table) => {
        table.dropForeign('sector_code_id', 'fk_impl_codes_sector_code');
        table.dropUnique(['implementation_id', 'sector_code_id'], 'uniq_impl_sector_code');
        table.dropColumn('sector_code_id');
    });
    await knex.schema.dropTableIfExists('ns_administration_sector_codes');
};
