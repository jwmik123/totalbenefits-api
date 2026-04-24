const { dbQuery } = require('../../helpers/helper');

const listBranches = async (req, res) => {
    const sqlQuery = 'SELECT id, name, name AS title FROM ns_branches ORDER BY name ASC';
    try {
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listBranches };