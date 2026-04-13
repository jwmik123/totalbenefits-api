const { dbQuery } = require('../../helpers/helper');

const validateListFavorites = async (req, res, next) => {
    const userId = req.user.id;
    const { company } = req.params;
    try {
        const currentUser = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (currentUser[0].role !== 1) {
            const userInfo = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userInfo.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen favorieten van dit bedrijf bekijken' });
            }
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateLike = async (req, res, next) => {
    const userId = req.user.id;
    const { id } = req.params;
    try {
        const currentBenefit = await dbQuery('SELECT * FROM ns_bd_likes WHERE benefit = ?', [id]);
        if (currentBenefit.length > 0) {
            const currentUser = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
            if (currentUser[0].role !== 1) {
                const userInfo = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, currentBenefit[0].company]);
                if (userInfo.length === 0) {
                    return res.status(403).json({ error: 'Je kunt geen arbeidsvoorwaarden liken van dit bedrijf' });
                }
            }
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateListFavorites, validateLike };