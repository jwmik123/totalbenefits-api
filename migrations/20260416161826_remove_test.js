exports.up = function (knex) {
    return knex.schema.table('ns_languages', (table) => {
        table.dropColumn('test');
    });
};

exports.down = function (knex) {
    return knex.schema.table('ns_languages', (table) => {
        table.string('test', 255);
    });
};