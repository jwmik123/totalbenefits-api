const { dbQuery } = require('../../helpers/helper');
const dotenv = require('dotenv');
dotenv.config();

const moment = require('moment-timezone');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const sendAdminMail = async (subject, data, templateId, sendTo) => {
    const mailersend = new MailerSend({ apiKey: process.env.MAILERSEND_ADMIN_API });
    const sentFrom = new Sender(process.env.NO_REPLY_MAIL, "Total Benefits");
    const recipients = [
        new Recipient(sendTo, sendTo)
    ];
    const personalization = [
        {
            email: sendTo,
            data: data
        }
    ];
    const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject(subject)
        .setPersonalization(personalization)
        .setTemplateId(templateId);

    const messageId = await mailersend.email.send(emailParams);
    return messageId;
}


const createBestPractice = async (req, res) => {
    const { company, userId, benefit, content, public, userInfo, companyInfo, validBenefit } = req;
    const status = public === 0 ? 'published' : 'awaiting_approval';
    const sqlQuery = 'INSERT INTO ns_bestpractices (company, user, benefit, content, public, editted, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [company, userId, benefit, content, public, 0, status,];
    try {
        const result = await dbQuery(sqlQuery, values);
        const selectQuery = `SELECT * FROM ns_bestpractices WHERE id = ?`;
        const [createdRow] = await dbQuery(selectQuery, [result.insertId]);
        if (public) {
            await sendAdminMail(
            'Er staat een nieuwe best practice in afwachting goedkeuring',
            {
                url: `${process.env.APP_URL}/admin/best-practices`,
                name: userInfo[0].first_name + ' ' + userInfo[0].last_name,
                benefit: validBenefit[0].title,
                company: companyInfo ? companyInfo[0].name : 'Not Secondary'
            }, process.env.SEND_BEST_PRACTICE_TEMPLATE_ID, 'paul@notsecondary.com');
        }
        return res.json({
            message: 'Best practice is succesvol aangemaakt',
            data: createdRow
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het aanmaken van best practice',
            error: error.response?.data || error.message
        });
    }
};

const editBestPractice = async (req, res) => {
    const { id, content, public, userInfo, companyInfo, validBenefit } = req;
    const status = public === 0 ? 'published' : 'awaiting_approval';
    const sqlQuery = 'UPDATE ns_bestpractices SET content = ?, public = ?, editted = ?, status = ?, declined_message = ?, updated_at = ? WHERE id = ?';
    const values = [content, public, 1, status, null, moment().tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'), id];
    try {
        const result = await dbQuery(sqlQuery, values);
        const selectQuery = `SELECT * FROM ns_bestpractices WHERE id = ?`;
        const [updatedRow] = await dbQuery(selectQuery, [id]);
        if (public) {
            await sendAdminMail(
            'Er staat een nieuwe best practice in afwachting goedkeuring',
            {
                url: `${process.env.APP_URL}/admin/best-practices`,
                name: userInfo[0].first_name + ' ' + userInfo[0].last_name,
                benefit: validBenefit[0].title,
                company: companyInfo ? companyInfo[0].name : 'Not Secondary'
            }, process.env.SEND_BEST_PRACTICE_TEMPLATE_ID, 'paul@notsecondary.com');
        }
        return res.json({
            message: 'Best practice is aangepast',
            data: updatedRow
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het aanmaken van best practice',
            error: error.response?.data || error.message
        });
    }
};

const listBestPractices = async (req, res) => {
    const sqlQuery = `
        SELECT 
            ns_bestpractices.*, 
            ns_companies.name AS company_name, 
            ns_companies.thumbnail AS company_thumbnail,
            ns_users.first_name, 
            ns_users.last_name, 
            ns_benefits.title AS benefit_title,
            ns_roles.label AS role_label
        FROM ns_bestpractices
            INNER JOIN ns_companies ON ns_companies.id = ns_bestpractices.company
            INNER JOIN ns_users ON ns_users.id = ns_bestpractices.user
            INNER JOIN ns_benefits ON ns_benefits.uuid = ns_bestpractices.benefit
            INNER JOIN ns_roles ON ns_roles.id = ns_users.role
        ORDER BY FIELD(ns_bestpractices.status, 'awaiting_approval', 'declined', 'published')
    `;
    
    try {
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


const getBestPractice = async (req, res) => {
    var sqlQuery = `
    SELECT 
        ns_bestpractices.*, 
        ns_companies.name AS company_name, 
        ns_companies.thumbnail AS company_thumbnail,
        ns_users.first_name, 
        ns_users.last_name, 
        ns_benefits.title AS benefit_title,
        ns_roles.label AS role_label
    FROM ns_bestpractices
        INNER JOIN ns_companies ON ns_companies.id = ns_bestpractices.company
        INNER JOIN ns_users ON ns_users.id = ns_bestpractices.user
        INNER JOIN ns_benefits ON ns_benefits.uuid = ns_bestpractices.benefit
        INNER JOIN ns_roles ON ns_roles.id = ns_users.role
    WHERE ns_bestpractices.id = ?
    `;

    try {
        const results = await dbQuery(sqlQuery, [req.params.id]);
        return res.json(results[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const approveBestPractice = async (req, res) => {
    const { id } = req.params;
    const status = 'published';
    const currentBestPractice = await dbQuery('SELECT ns_bestpractices.*, ns_users.email, ns_benefits.title AS benefit_title FROM ns_bestpractices INNER JOIN ns_users ON ns_users.id = ns_bestpractices.user INNER JOIN ns_benefits ON ns_benefits.uuid = ns_bestpractices.benefit WHERE ns_bestpractices.id = ?', [id]);
    if (currentBestPractice.length === 0) {
        return res.status(403).json({ error: 'Best practice is niet gevonden' });
    }
    const sqlQuery = 'UPDATE ns_bestpractices SET status = ? WHERE id = ?';
    const values = [status, id];
    try {
        const result = await dbQuery(sqlQuery, values);
        await sendAdminMail(
        'Je best practice is goedgekeurd!',
        {
            title: 'Je best practice is goedgekeurd!',
            content: `Je best practice over ${currentBestPractice[0].benefit_title} is goedgekeurd.`,
            url: `${process.env.APP_URL}`
        }, process.env.BEST_PRACTICE_UPDATE_TEMPLATE_ID, currentBestPractice[0].email);
        return res.json({ data: 'Best practice is goedgekeurd' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het goedkeuren van best practice',
            error: error.response?.data || error.message
        });
    }
};

const declineBestPractice = async (req, res) => {
    const { id } = req.params;
    const status = 'declined';
    const currentBestPractice = await dbQuery('SELECT ns_bestpractices.*, ns_users.email FROM ns_bestpractices INNER JOIN ns_users ON ns_users.id = ns_bestpractices.user WHERE ns_bestpractices.id = ?', [id]);
    if (currentBestPractice.length === 0) {
        return res.status(403).json({ error: 'Best practice is niet gevonden' });
    }
    if (!req.body.message) {
        return res.status(403).json({ error: 'Geef een reden op voor afwijzing op' });
    }
    const sqlQuery = 'UPDATE ns_bestpractices SET status = ?, declined_message = ? WHERE id = ?';
    const values = [status, req.body.message, id];
    try {
        const result = await dbQuery(sqlQuery, values);
        await sendAdminMail(
        'Je best practice is afgewezen',
        {
            title: 'Je best practice is afgewezen met als reden:',
            content: req.body.message,
            url: `${process.env.APP_URL}`
        }, process.env.BEST_PRACTICE_UPDATE_TEMPLATE_ID, currentBestPractice[0].email);
        return res.json({ data: 'Best practice is afgewezen' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het afwijzen van best practice',
            error: error.response?.data || error.message
        });
    }
};


module.exports = { createBestPractice, editBestPractice, listBestPractices, getBestPractice, approveBestPractice, declineBestPractice };