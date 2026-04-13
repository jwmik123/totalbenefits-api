const { dbQuery } = require('../../helpers/helper');

const listSubBranches = async (req, res) => {
    const parentId = req.params.id;
    var sqlQuery = 'SELECT * FROM ns_subbranches WHERE parent = ?';
    try {
        const results = await dbQuery(sqlQuery, [parentId]);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listSubBranches };