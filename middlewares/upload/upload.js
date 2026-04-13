const { dbQuery } = require('../../helpers/helper');

const validateSuperAdmin = async (req, res, next) => {
    const userId = req.user.id;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen afbeeldingen uploaden.' });
        }
        Object.assign(req, { userId });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDocumentUpload = async (req, res, next) => {
    const userId = req.user.id;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen documenten uploaden voor dit bedrijf' });
            }
        }
        Object.assign(req, { userId });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateSuperAdmin, validateDocumentUpload };