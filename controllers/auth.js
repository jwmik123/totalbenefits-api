const db = require('../models/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const registerMail = require('../assets/registermail');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  },
});

const register = async (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 8);
  const status = 'active';

  try {
    const [existing] = await db.query('SELECT * FROM ns_users WHERE email = ?', [email]);

    if (existing.length > 0) {
      return res.status(403).json({ error: 'Er bestaat al een account met e-mailadres ' + email });
    }

    await db.query(
      'INSERT INTO ns_users (first_name, last_name, email, role, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, role, hashedPassword, status]
    );

    let emailHtml = registerMail.html.replace('{first_name}', first_name);

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Welkom bij Total Benefits!',
      text: `Welkom bij Total Benefits ${first_name}!`,
      html: emailHtml
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ error: 'Error sending email: ' + error.message });
      }
      res.status(201).json({ message: 'Gebruiker is aangemaakt. We hebben een mail gestuurd.' });
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij registratie.' });
  }
};


const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [results] = await db.query(
      'SELECT ns_users.*, ns_roles.key_name AS role FROM ns_users INNER JOIN ns_roles ON ns_users.role = ns_roles.id WHERE email = ?',
      [email]
    );

    if (results.length === 0 || !(await bcrypt.compare(password, results[0].password_hash))) {
      return res.status(401).json({ error: 'Ongeldig e-mailadres of wachtwoord' });
    }

    if (results[0].status === 'inactive') {
      return res.status(401).json({ error: 'Je account is nog niet geactiveerd' });
    }

    const token = jwt.sign({ id: results[0].id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user_id: results[0].id,
      email: results[0].email,
      first_name: results[0].first_name,
      last_name: results[0].last_name,
      role: results[0].role,
      image: results[0].image,
      public: results[0].public
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij het inloggen.' });
  }
};


module.exports = { register, login };