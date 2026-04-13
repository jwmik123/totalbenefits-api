const { dbQuery } = require('../../helpers/helper');

const validateGetBenefit = async (req, res, next) => {
    const userId = req.user.id;
  	const { uuid } = req.params;
  	const { admin } = req.body;
    const { company } = req.query;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        const userEmail = userInfo[0].email;
        if (userInfo[0].role !== 1) {
            if (!company) {
                return res.status(403).json({ error: 'Geef een bedrijf mee' });
            }
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt de benefits database niet bekijken' });
            }
          	const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [company]);
          	let modules = companyInfo[0].modules;
			
            if (!modules) {
              modules = [];
            } else if (!Array.isArray(modules)) {
              try {
                modules = JSON.parse(modules);
              } catch (e) {
                modules = [];
              }
            }

            if (!modules.includes(1)) {
              return res.status(403).json({ error: 'Deze module is niet ingeschakeld' });
            }
        }
        Object.assign(req, { userEmail, uuid, admin });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};


const validateListBenefits = async (req, res, next) => {
    const userId = req.user.id;
  	const { theme } = req.params;
  	const { company } = req.body;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        const userEmail = userInfo[0].email;
        if (userInfo[0].role !== 1) {
            if (!company) {
                return res.status(403).json({ error: 'Geef een bedrijf mee' });
            }
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt de benefits database niet bekijken' });
            }
          	const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [company]);
          	let modules = companyInfo[0].modules;
			
            if (!modules) {
              modules = [];
            } else if (!Array.isArray(modules)) {
              try {
                modules = JSON.parse(modules);
              } catch (e) {
                modules = [];
              }
            }

            if (!modules.includes(1)) {
              return res.status(403).json({ error: 'Deze module is niet ingeschakeld' });
            }
        }
        Object.assign(req, { userEmail, theme });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateCreateBenefit = async (req, res, next) => {
    const postData = req.body;
    const userId = req.user.id;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        const userEmail = userInfo[0].email;
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ?', [userId]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen benefits in de benefits database aanmaken' });
            }
        }
        Object.assign(req, { postData, userEmail });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateListThemes = async (req, res, next) => {
    const userId = req.user.id;
  	const { company } = req.query;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        const userEmail = userInfo[0].email;
      	if (userInfo[0].role !== 1) {
          	if (!company) {
                return res.status(403).json({ error: 'Geef een bedrijf mee' });
            }
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen thema\'s uit de benefits database bekijken' });
            }
          	const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [company]);
          	let modules = companyInfo[0].modules;
			
            if (!modules) {
              modules = [];
            } else if (!Array.isArray(modules)) {
              try {
                modules = JSON.parse(modules);
              } catch (e) {
                modules = [];
              }
            }

            if (!modules.includes(1)) {
              return res.status(403).json({ error: 'Deze module is niet ingeschakeld' });
            }
        }
        Object.assign(req, { userEmail });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateGetDocument = async (req, res, next) => {
    const userId = req.user.id;
  	const { filename } = req.params;
    try {
        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            // const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ?', [userId]);
          	// const companyInfo = await dbQuery('SELECT * FROM ns_companies WHERE id = ?', [userCompanies[0].company]);
          	// let modules = companyInfo[0].modules;
			
            // if (!modules) {
            //   modules = [];
            // } else if (!Array.isArray(modules)) {
            //   try {
            //     modules = JSON.parse(modules);
            //   } catch (e) {
            //     modules = [];
            //   }
            // }

            // if (!modules.includes(1)) {
            //   return res.status(403).json({ error: 'Deze module is niet ingeschakeld' });
            // }
        }
        Object.assign(req, { filename });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};


module.exports = { validateGetBenefit, validateListBenefits, validateCreateBenefit, validateListThemes, validateGetDocument };