const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyCoreValues = async (req, res, next) => {
    const { company } = req.params;
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen kernwaarden bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateCreateCoreValue = async (req, res, next) => {
    const { name, company } = req.body;
    if (!name || !company) {
        return res.status(403).json({ error: 'Er zijn velden niet gevuld' })
    }
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen kernwaarden aanmaken voor dit bedrijf' });
            }
        }

        const existingCoreValues = await dbQuery('SELECT * FROM ns_corevalues WHERE name = ? AND company = ?', [name, company]);
        if (existingCoreValues.length > 0) {
            return res.status(403).json({ error: 'Deze kernwaarde bestaat al' });
        }

        Object.assign(req, { name, company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDeleteCoreValue = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // 1. Controleer of de kernwaarde bestaat
        const existingCoreValues = await dbQuery('SELECT * FROM ns_corevalues WHERE id = ?', [id]);
        if (existingCoreValues.length === 0) {
            return res.status(404).json({ error: 'Deze kernwaarde bestaat niet' });
        }

        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, existingCoreValues[0].company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen kernwaarden verwijderen voor dit bedrijf' });
            }
        }

        const benefitsUsingCoreValue = await dbQuery(
            'SELECT id FROM ns_benefits WHERE JSON_CONTAINS(core_values, ?)', 
            [JSON.stringify(parseInt(id))] 
        );
        if (benefitsUsingCoreValue.length > 0) {
            return res.status(403).json({ 
                error: 'Deze kernwaarde kan niet worden verwijderd omdat deze nog gekoppeld is aan een of meerdere arbeidsvoorwaarden.' 
            });
        }

        Object.assign(req, { id });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyCoreValues, validateCreateCoreValue, validateDeleteCoreValue };