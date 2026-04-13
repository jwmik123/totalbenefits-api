const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyDashboard = async (req, res, next) => {
    const { company } = req.params;
    const userId = req.user.id;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen dashboard info bekijken voor dit bedrijf' });
            }
        }
        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyDashboard };