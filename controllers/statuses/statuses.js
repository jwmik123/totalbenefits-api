const { dbQuery } = require('../../helpers/helper');

const listStatuses = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_benefit_statuses ORDER BY sequence ASC';
    try {
        const results = await dbQuery(sqlQuery);
        const statuses = results.map(item => ({
            value: item.id,
            label: item.label
        }));
        return res.json(statuses);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


module.exports = { listStatuses };