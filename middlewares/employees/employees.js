const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyEmployees = async (req, res, next) => {
    const { company, status } = req.params;
    const userId = req.user.id;

    if (!company) {
        return res.status(403).json({ error: 'Geen bedrijf opgegeven' });
    }
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen medewerkers bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { status, company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateUserCompany = async (req, res, next) => {
    const uuid = req.params.uuid;
    const userId = req.user.id;

    if (!uuid) {
        return res.status(400).json({ error: 'Geen uuid opgegeven' });
    }

    try {
        const employeeResults = await dbQuery('SELECT * FROM ns_employees WHERE uuid = ?', [uuid]);

        if (employeeResults.length === 0) {
            return res.status(404).json({ error: 'Geen medewerker gevonden' });
        }

        const employee = employeeResults[0];

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, employee.company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt deze medewerker niet bekijken' });
            }
        }

        Object.assign(req, { employee });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateUserImportValidation = async (req, res, next) => {
    const { company } = req.params;
    if (!company) {
        return res.status(403).json({ error: 'Geen bedrijf opgegeven' });
    }
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen medewerkers importeren voor dit bedrijf' });
            }
        }

        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};


module.exports = { validateUserCompanyEmployees, validateUserCompany, validateUserImportValidation };