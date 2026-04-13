const { dbQuery } = require('../../helpers/helper');

const listTargetGroups = async (req, res) => {
    var sqlQuery = 'SELECT * FROM ns_target_groups ORDER BY menu_order ASC';
    try {
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listTargetGroups };