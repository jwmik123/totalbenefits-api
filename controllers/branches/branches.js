const { dbQuery } = require('../../helpers/helper');

const listBranches = async (req, res) => {
    var sqlQuery = 'SELECT * FROM ns_branches';
    try {
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listBranches };