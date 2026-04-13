const { dbQuery } = require('../../helpers/helper');

//3rd party
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const getProfileInfo = async (req, res) => {
    const userId = req.user.id;
    const sqlQuery = 'SELECT * FROM ns_users WHERE id = ?';
    try {
        // Use dbQuery to execute the query and fetch results
        const results = await dbQuery(sqlQuery, [userId]);
        const userInfo = {
            firstName: results[0].first_name,
            lastName: results[0].last_name,
            email: results[0].email
        };
        return res.json(userInfo);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getUsers = async (req, res) => {
    const company = req.company;
    const sqlQuery = `
    SELECT ns_user_company.user, ns_user_company.role, ns_user_company.stakeholder, ns_users.uuid, ns_users.first_name, ns_users.last_name, ns_users.email, ns_users.role, ns_roles.label
    FROM 
        ns_user_company 
    JOIN
        ns_users ON ns_users.id = ns_user_company.user
    JOIN
        ns_roles ON ns_user_company.role = ns_roles.id
    WHERE 
        ns_user_company.company = ? AND ns_users.role != 1`;
    try {
        // Use dbQuery to execute the query and fetch results
        const results = await dbQuery(sqlQuery, [company]);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getUserInfo = async (req, res) => {
    const { uuid } = req;
    const { company } = req.body;
    const sqlQuery = `
    SELECT 
        ns_users.email, 
        ns_users.first_name, 
        ns_users.last_name,  
        ns_roles.id AS role_id, 
        ns_roles.label,
        ns_bd_stakeholders.id AS stakeholder_id,
        ns_bd_stakeholders.value AS stakeholder_label
    FROM 
        ns_users 
    JOIN
        ns_user_company ON ns_users.id = ns_user_company.user
    JOIN
        ns_roles ON ns_user_company.role = ns_roles.id
    JOIN
        ns_bd_stakeholders ON ns_user_company.stakeholder = ns_bd_stakeholders.id
    WHERE 
        uuid = ? AND ns_user_company.company = ?`;
    try {
        // Use dbQuery to execute the query and fetch results
        const results = await dbQuery(sqlQuery, [uuid, company]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Geen gebruiker gevonden' });
        }
        return res.json(results[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getUserRoles = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_roles WHERE visible = 1 ORDER BY menu_order ASC';
    try {
        // Use dbQuery to execute the query and fetch results
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const registerUserForCompany = async (req, res) => {

  const first_name = req.first_name;
  const last_name = req.last_name;
  const email = req.email;
  const password = req.newPassword;
  const role = req.role;
  const stakeholder = req.stakeholder;
  const company = req.company;
  const hashedPassword = await bcrypt.hash(password, 8);
  const status = 'active';

  try {
    const existingUser = await dbQuery('SELECT * FROM ns_users WHERE email = ?', [email]);
    if (existingUser.length === 0) {
        let userUUID;
        let isUnique = false;
        while (!isUnique) {
            userUUID = uuidv4();
            const existing = await dbQuery(
                `SELECT id FROM ns_users WHERE uuid = ? LIMIT 1`,
                [userUUID]
            );
            if (existing.length === 0) {
                isUnique = true;
            }
        }
        const newUser = await dbQuery('INSERT INTO ns_users (first_name, last_name, email, uuid, role, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [first_name, last_name, email, userUUID, 2, hashedPassword, status]);
        await dbQuery(
            'INSERT INTO ns_user_company (user, company, role, stakeholder) VALUES (?, ?, ?, ?)',
            [newUser.insertId, company, role, stakeholder]
        );
    } else {
        await dbQuery(
            'INSERT INTO ns_user_company (user, company, role, stakeholder) VALUES (?, ?, ?, ?)',
            [existingUser[0].id, company, role, stakeholder]
        );
    }
    res.status(201).json({ message: 'Gebruiker is aangemaakt' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij registratie.', message: err });
  }
};

const editUser = async (req, res) => {
    const { uuid } = req;
    const { company, first_name, last_name, role, stakeholder } = req.body;
    try {
        const existingUser = await dbQuery('SELECT * FROM ns_users WHERE uuid = ?', [uuid]);
        await dbQuery(
            'UPDATE ns_user_company SET role = ?, stakeholder = ? WHERE user = ? AND company = ?',
            [role, stakeholder, existingUser[0].id, company]
        );
        await dbQuery(
            'UPDATE ns_users SET first_name = ?, last_name = ? WHERE uuid = ?',
            [first_name, last_name, uuid]
        );
        res.status(201).json({ message: 'Gebruiker is aangepast' });
    } catch (err) {
        console.error('Edit error:', err);
        res.status(500).json({ error: 'Er ging iets mis bij bewerken van gebruiker.', message: err });
    }
};

module.exports = { getProfileInfo, getUsers, getUserInfo, getUserRoles, registerUserForCompany, editUser };
