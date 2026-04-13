const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyEntities = async (req, res, next) => {
    const { company } = req.params;
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen entiteiten bekijken of bewerken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateCreateEntity = async (req, res, next) => {
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
                return res.status(403).json({ error: 'Je kunt geen entiteiten aanmaken voor dit bedrijf' });
            }
        }

        const existingEntities = await dbQuery('SELECT * FROM ns_entities WHERE name = ? AND company = ?', [name, company]);
        if (existingEntities.length > 0) {
            return res.status(403).json({ error: 'Deze entiteit bestaat al' });
        }

        Object.assign(req, { name, company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDeleteEntity = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // 1. Controleer of de entiteit bestaat
        const existingEntities = await dbQuery('SELECT * FROM ns_entities WHERE id = ?', [id]);
        if (existingEntities.length === 0) {
            return res.status(404).json({ error: 'Deze entiteit bestaat niet' });
        }

        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, existingEntities[0].company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen entiteiten verwijderen voor dit bedrijf' });
            }
        }

        const benefitsUsingEntity = await dbQuery(
            'SELECT id FROM ns_benefits WHERE JSON_CONTAINS(entities, ?)', 
            [JSON.stringify(parseInt(id))] 
        );
        if (benefitsUsingEntity.length > 0) {
            return res.status(403).json({ 
                error: 'Deze entiteit kan niet worden verwijderd omdat deze nog gekoppeld is aan een of meerdere arbeidsvoorwaarden.' 
            });
        }

        Object.assign(req, { id });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyEntities, validateCreateEntity, validateDeleteEntity };