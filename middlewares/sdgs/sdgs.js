const { dbQuery } = require('../../helpers/helper');

const validateCreateSdg = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen SDG\'s aanmaken' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDeleteSdg = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen SDG\'s verwijderen' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateCreateSdg, validateDeleteSdg };