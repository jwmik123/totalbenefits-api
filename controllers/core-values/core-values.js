const { dbQuery } = require('../../helpers/helper');

const listCoreValues = async (req, res) => {
    const { company } = req.params;
    const sqlQuery = `
        SELECT cv.*, 
        COUNT(b.id) AS benefit_count 
        FROM ns_corevalues cv 
        LEFT JOIN ns_benefits b ON JSON_CONTAINS(b.core_values, CAST(cv.id AS JSON)) 
        WHERE cv.company = ? 
        GROUP BY cv.id 
        ORDER BY cv.name ASC
    `;
    try {
        const result = await dbQuery(sqlQuery, [company]);
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createCoreValue = async (req, res) => {
    const { name, company } = req.body;
    const sqlQuery = 'INSERT INTO ns_corevalues (name, company) VALUES (?, ?)';
    const values = [name, company];
    try {
        const result = await dbQuery(sqlQuery, values);
        return res.json({ id: result.id, name, company });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const deleteCoreValue = async (req, res) => {
    const { id } = req.params;
    const sqlQuery = 'DELETE FROM ns_corevalues WHERE id = ?';
    const values = [id];
    try {
        const result = await dbQuery(sqlQuery, values);
        return res.json({ id, message: 'Kernwaarde succesvol verwijderd' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listCoreValues, createCoreValue, deleteCoreValue };