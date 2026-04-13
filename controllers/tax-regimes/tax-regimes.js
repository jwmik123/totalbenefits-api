const { dbQuery } = require('../../helpers/helper');

const listTaxRegimes = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_benefit_tax_regimes';
    try {
        const results = await dbQuery(sqlQuery);
        const taxRegimes = results.map(item => ({
            value: item.id,
            label: item.label
        }));
        return res.json(taxRegimes);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listTaxRegimes };