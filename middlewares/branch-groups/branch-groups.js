const { dbQuery } = require('../../helpers/helper');

const validateBranchGroupAdmin = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo.role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen branchegroepen aanmaken of bewerken' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateBranchGroupAdmin };
