const { dbQuery } = require('../../helpers/helper');

const checkUserRole = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);

    const role = userInfo.role;
    Object.assign(req, { role });
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};

const validateCompanyCreation = async (req, res, next) => {
  const { name, logo, thumbnail, branche, subbranche } = req.body;

  if (!name) {
    return res.status(403).json({ error: 'Geef een administratienaam op' });
  }

  if (!branche) {
    return res.status(403).json({ error: 'Geef een branche op' });
  }

  const userId = req.user.id;

  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);

    if (userInfo.role !== 1) {
      return res.status(403).json({ error: 'Je kunt geen administraties aanmaken' });
    }

    const brancheExists = await dbQuery('SELECT * FROM ns_branches WHERE id = ?', [branche]);

    if (brancheExists.length === 0) {
      return res.status(403).json({ error: 'Branche bestaat niet' });
    }

    Object.assign(req, { name, logo, thumbnail, branche, subbranche });
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};

const validateCompanyModification = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);

    if (userInfo.role !== 1) {
      return res.status(403).json({ error: 'Je kunt geen administraties aanmaken of bewerken' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};


const validateGetProfileOptions = async (req, res, next) => {
  const userId = req.user.id;
  const companyId = req.params.id;
  try {
    const [userInfo] = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
    if (userInfo.role !== 1) {
        const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, companyId]);
        if (userCompanies.length === 0) {
            return res.status(403).json({ error: 'Je kunt dit bedrijfsprofiel niet bekijken of bewerken' });
        }
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database query error' });
  }
};

module.exports = {
  checkUserRole,
  validateCompanyCreation,
  validateCompanyModification,
  validateGetProfileOptions
};
