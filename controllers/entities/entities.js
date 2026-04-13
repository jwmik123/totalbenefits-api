const { dbQuery } = require('../../helpers/helper');

const listEntities = async (req, res) => {
    const { company } = req.params;

    const sqlQuery = `
        SELECT 
            ns_entities.*,
            ns_benefits.id AS benefit_id
        FROM ns_entities
        LEFT JOIN ns_benefits
            ON JSON_CONTAINS(
                ns_benefits.entities,
                CAST(ns_entities.id AS JSON)
            )
        WHERE ns_entities.company = ?
    `;

    try {
        const result = await dbQuery(sqlQuery, [company]);

        const groupedResult = Object.values(
            result.reduce((acc, item) => {
                if (!acc[item.id]) {
                    const { benefit_id, ...rest } = item;
                    acc[item.id] = {
                        ...rest,
                        benefit_count: 0
                    };
                }

                if (item.benefit_id) {
                    acc[item.id].benefit_count += 1;
                }

                return acc;
            }, {})
        );

        return res.json(groupedResult);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


const createEntity = async (req, res) => {
    const { name, company } = req.body;
    const sqlQuery = 'INSERT INTO ns_entities (name, company) VALUES (?, ?)';
    const values = [name, company];
    try {
        const result = await dbQuery(sqlQuery, values);
        return res.json({ id: result.id, name, company });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const deleteEntity = async (req, res) => {
    const { id } = req.params;
    const sqlQuery = 'DELETE FROM ns_entities WHERE id = ?';
    const values = [id];
    try {
        const result = await dbQuery(sqlQuery, values);
        res.json({ message: 'De entiteit is succesvol verwijderd' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


module.exports = { listEntities, createEntity, deleteEntity };