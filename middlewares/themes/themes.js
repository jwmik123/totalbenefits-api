const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyThemes = async (req, res, next) => {
    const { company, status } = req.params;
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen thema\'s bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company, status });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateAdminTemplates = async (req, res, next) => {
    const userId = req.user.id;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen templates bekijken.' });
        }
        Object.assign(req, { userId });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateCreateTheme = async (req, res, next) => {
    const { key_name, name, company, icon } = req.body;
    if (!key_name || !name || !company || !icon) {
        return res.status(403).json({ error: 'Er zijn velden niet gevuld' })
    }
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen thema\'s aanmaken voor dit bedrijf' });
            }
        }

        const existingThemes = await dbQuery('SELECT * FROM ns_themes WHERE key_name = ? AND company = ?', [key_name, company]);
        if (existingThemes.length > 0) {
            return res.status(403).json({ error: 'Dit thema bestaat al' });
        }

        Object.assign(req, { key_name, name, company, icon });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyThemes, validateAdminTemplates, validateCreateTheme };