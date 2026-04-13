const { dbQuery } = require('../../helpers/helper');

const validateGetUsers = async (req, res, next) => {
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
                return res.status(403).json({ error: 'Je kunt geen gebruikers bekijken voor dit bedrijf' });
            }
            //Only super admin or hr manager can create users
            if (userCompanies[0].role !== 1 && userCompanies[0].role !== 2) {
                return res.status(403).json({ error: 'Je hebt niet de juiste rol om gebruikers te bekijken voor dit bedrijf' });
            }
        }
        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateGetUser = async (req, res, next) => {
    const { uuid } = req.params;
    if (!uuid) {
        return res.status(403).json({ error: 'Geen gebruiker ID opgegeven' });
    }
    const userId = req.user.id;
    try {
        // Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            // Get the requested user info including company
            const getUserInfo = await dbQuery(`
                SELECT ns_users.*, ns_user_company.company 
                FROM ns_users 
                JOIN ns_user_company ON ns_users.id = ns_user_company.user 
                WHERE uuid = ?
            `, [uuid, req.company]);

            if (getUserInfo.length === 0) {
                return res.status(404).json({ error: 'Geen gebruiker gevonden' });
            }

            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ?', [userId]);
            //Only super admin or hr manager can create users
            if (userCompanies[0].role > 2) {
                return res.status(403).json({ error: 'Je hebt niet de juiste rol om gebruikers te bekijken/bewerken voor dit bedrijf' });
            }
            const userCompanyIds = userCompanies.map(row => row.company);

            // Check if the requested user's company is accessible
            if (!userCompanyIds.includes(getUserInfo[0].company)) {
                return res.status(403).json({ error: 'Je kunt deze gebruiker niet bekijken/bewerken' });
            }
        }

        Object.assign(req, { uuid });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateRegisterUserForCompany = async (req, res, next) => {
    const { first_name, last_name, email, password, role, stakeholder, company } = req.body;
  	var newPassword = password;
    if (!first_name) {
        return res.status(403).json({ error: 'Er is geen voornaam opgegeven' });
    }
    if (!last_name) {
        return res.status(403).json({ error: 'Er is geen achternaam opgegeven' });
    }
    if (!email) {
        return res.status(403).json({ error: 'Er is geen e-mailadres opgegeven' });
    }
    if (!password) {
        newPassword = 'notsecondary@!user';
    }
    if (!role) {
        return res.status(403).json({ error: 'Er is geen gebruikersrol opgegeven' });
    } else {
        const availableRoles = await dbQuery('SELECT * FROM ns_roles WHERE visible = 1');
        const roleExists = availableRoles.some(r => r.id === role);
        if (!roleExists) {
            return res.status(403).json({ error: 'Je hebt een ongeldige gebruikersrol opgegeven' });
        }
    }
    if (!stakeholder) {
        return res.status(403).json({ error: 'Er is geen functie opgegeven' });
    } else {
        const availableStakeholders = await dbQuery('SELECT * FROM ns_bd_stakeholders');
        const stakeholderExists = availableStakeholders.some(s => s.id === stakeholder);
        if (!stakeholderExists) {
            return res.status(403).json({ error: 'Je hebt een ongeldige functie opgegeven' });
        }
    }
    if (!company) {
        return res.status(403).json({ error: 'Er is geen bedrijf opgegeven' });
    }
    const userId = req.user.id;
    try {
        // Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ?', [userId]);
            const userCompanyIds = userCompanies.map(row => row.company);
            if (!userCompanyIds.includes(company)) {
                return res.status(403).json({ error: 'Je kunt geen gebruikers aanmaken voor dit bedrijf' });
            }
            if (userCompanies[0].role > 2) {
                return res.status(403).json({ error: 'Je hebt niet de juiste rol om gebruikers aan te maken voor dit bedrijf' });
            }
        }
        Object.assign(req, { first_name, last_name, email, newPassword, role, stakeholder, company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};



module.exports = { validateGetUsers, validateGetUser, validateRegisterUserForCompany };