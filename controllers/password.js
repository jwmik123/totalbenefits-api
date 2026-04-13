const db = require('../models/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

// Mailersend
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

// Change password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  try {
    const [results] = await db.query('SELECT * FROM ns_users WHERE id = ?', [userId]);

    if (results.length === 0 || !(await bcrypt.compare(current_password, results[0].password_hash))) {
      return res.status(401).json({ error: 'Je huidige wachtwoord is niet correct' });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 8);

    await db.query('UPDATE ns_users SET password_hash = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({ message: 'Je wachtwoord is bijgewerkt' });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij het wijzigen van je wachtwoord.' });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [foundUsers] = await db.query('SELECT * FROM ns_users WHERE email = ?', [email]);

    if (foundUsers.length === 0) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    await db.query(
      'UPDATE ns_users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [resetToken, resetTokenExpires, email]
    );

    // Send email
    const mailersend = new MailerSend({ apiKey: process.env.MAILERSEND_ADMIN_API });

    const personalization = [{
      email: email,
      data: {
        name: foundUsers[0].first_name,
        account_name: 'Total Benefits',
        support_email: process.env.SUPPORT_MAIL,
        reset_password_url: `${process.env.APP_URL}/wachtwoordherstel?code=${resetToken}`
      }
    }];

    const sentFrom = new Sender(process.env.NO_REPLY_MAIL, "Total Benefits");
    const recipients = [new Recipient(email, email)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject('Aanvraag wachtwoordherstel')
      .setPersonalization(personalization)
      .setTemplateId(process.env.FORGOT_PASSWORD_MAILERSEND_TEMPLATE_ID);

    await mailersend.email.send(emailParams);

    res.json({ message: 'We hebben je een mail gestuurd om je wachtwoord opnieuw in te stellen' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij het aanvragen van wachtwoordherstel.' });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { resetToken, new_password } = req.body;

  try {
    const [results] = await db.query(
      'SELECT * FROM ns_users WHERE reset_token = ? AND reset_token_expires > ?',
      [resetToken, Date.now()]
    );

    if (results.length === 0) {
      return res.status(400).json({ error: 'Code om je wachtwoord opnieuw in te stellen is verlopen' });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 8);

    await db.query(
      'UPDATE ns_users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = ?',
      [hashedNewPassword, resetToken]
    );

    res.json({ message: 'Je wachtwoord is bijgewerkt' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Er ging iets mis bij het opnieuw instellen van je wachtwoord.' });
  }
};

module.exports = { changePassword, forgotPassword, resetPassword };
