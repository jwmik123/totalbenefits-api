const { dbQuery } = require('../../helpers/helper');

const validateCreateBestPractice = async (req, res, next) => {
    const { company, benefit, content, public } = req.body;
    if (!company) {
        return res.status(403).json({ error: 'Geef een bedrijf mee' })
    }
    if (!benefit) {
        return res.status(403).json({ error: 'Geef een arbeidsvoorwaarde mee' })
    }
    if (!content) {
        return res.status(403).json({ error: 'Geef een omschrijving mee' })
    }
  	if (public !== 0 && public !== 1) {
        return res.status(403).json({ error: 'Geef openbaar mee (1 voor Ja of 0 voor Nee)' })
    }
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen best practices aanmaken voor dit bedrijf' });
            }
        }
        const validBenefit = await dbQuery('SELECT * FROM ns_benefits WHERE uuid = ? AND company = ?', [benefit, company]);
        if (validBenefit.length === 0) {
            return res.status(403).json({ error: 'De opgegeven arbeidsvoorwaarde bestaat niet in dit bedrijf' });
        }
        const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [company]);
        Object.assign(req, { company, userId, benefit, content, public, userInfo, companyInfo, validBenefit });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateEditBestPractice = async (req, res, next) => {
    const { id } = req.params;
    const { content, public } = req.body;
    if (!content) {
        return res.status(403).json({ error: 'Geef een omschrijving mee' })
    }
  	if (public !== 0 && public !== 1) {
        return res.status(403).json({ error: 'Geef openbaar mee (1 voor Ja of 0 voor Nee)' })
    }
    const userId = req.user.id;
    try {
        const currentPractice = await dbQuery('SELECT * FROM ns_bestpractices WHERE id = ?', [id]);
        if (currentPractice.length === 0) {
            return res.status(403).json({ error: 'De opgegeven best practice bestaat niet' });
        }
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, currentPractice[0].company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen best practices bewerken voor dit bedrijf' });
            }
        }
        const validBenefit = await dbQuery('SELECT * FROM ns_benefits WHERE uuid = ? AND company = ?', [currentPractice[0].benefit, currentPractice[0].company]);
        if (validBenefit.length === 0) {
            return res.status(403).json({ error: 'De opgegeven arbeidsvoorwaarde bestaat niet in dit bedrijf' });
        }
        const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [currentPractice[0].company]);
        Object.assign(req, { id, content, public, userInfo, companyInfo, validBenefit });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const checkUserRole = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Toegang geweigerd' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateCreateBestPractice, validateEditBestPractice, checkUserRole };