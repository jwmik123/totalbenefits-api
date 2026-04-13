const { dbQuery } = require('../../helpers/helper');

const listCompensationTypes = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_benefit_compensation_types';
    try {
        const results = await dbQuery(sqlQuery);
        const compensationTypes = results.map(item => ({
            value: item.id,
            label: item.label
        }));
        return res.json(compensationTypes);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listCompensationTypes };