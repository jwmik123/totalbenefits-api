const { dbQuery } = require('../../helpers/helper');

const listTags = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_tags';
    try {
        const results = await dbQuery(sqlQuery);
        const tags = results.map(item => ({
            value: item.id,
            label: item.value
        }));
        return res.json(tags);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


module.exports = { listTags };