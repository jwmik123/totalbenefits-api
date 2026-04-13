const { dbQuery, generateAccessToken } = require('../../helpers/helper');

const dotenv = require('dotenv');
dotenv.config();

//3rd party
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const listDeepDives = async (req, res) => {
    const company = req.company;

    const sqlQuery = `
        SELECT 
            ns_surveys.*,
            ns_surveys.created_at AS survey_created_at,

            ns_employee_surveys.*,
            ns_employee_surveys.id AS employee_survey_id,
            ns_employee_surveys.created_at AS employee_survey_created_at,

            ns_employees.id AS employee_id,
            ns_employees.first_name,
            ns_employees.last_name,
            ns_employees.email 
        FROM 
            ns_surveys 
        INNER JOIN 
            ns_employee_surveys ON ns_surveys.id = ns_employee_surveys.survey
        INNER JOIN 
            ns_employees ON ns_employee_surveys.employee = ns_employees.id
        WHERE 
            ns_surveys.company = ? 
            AND ns_employees.company = ?
    `;
    
    try {
        const results = await dbQuery(sqlQuery, [company, company]);

        const grouped = Object.values(
            results.reduce((acc, curr) => {
              const { survey, title, company, sent, reminder_sent, survey_created_at } = curr;
          
              if (!acc[survey]) {
                acc[survey] = {
                  id: survey,
                  title,
                  company,
                  sent,
                  reminder_sent,
                  created_at: moment(survey_created_at).tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'),
                  employee_surveys: [],
                };
              }
          
              acc[survey].employee_surveys.push({
                employee_id: curr.employee_id,
                first_name: curr.first_name,
                last_name: curr.last_name,
                email: curr.email,
                created_at: moment(curr.employee_survey_created_at).tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'),
                submitted_at: curr.submitted_at ? moment(curr.submitted_at).tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss') : null,
              });
          
              return acc;
            }, {})
        );

        // Add percentage_submitted
        grouped.forEach(group => {
            const total = group.employee_surveys.length;
            const submitted = group.employee_surveys.filter(e => e.submitted_at !== null).length;
            group.percentage_submitted = total === 0 ? 0 : Math.round((submitted / total) * 100);
        });
          

        return res.json(grouped);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createDeepDive = async (req, res) => {
    const company = req.company;
    const title = req.title;
    const benefits = req.benefits;

    let surveyId;

    try {
        // Generate unique UUID for survey
        let isUnique = false;
        while (!isUnique) {
            surveyId = uuidv4();
            const checkQuery = `SELECT 1 FROM ns_surveys WHERE uuid = ? LIMIT 1`;
            const existing = await dbQuery(checkQuery, [surveyId]);
            if (existing.length === 0) {
                isUnique = true;
            }
        }

        // Insert the survey into ns_surveys and get the new survey id
        const insertSurveyQuery = `
            INSERT INTO ns_surveys (uuid, title, company, benefits)
            VALUES (?, ?, ?, ?)
        `;
        await dbQuery(insertSurveyQuery, [surveyId, title, company, JSON.stringify(benefits)]);

        // Retrieve the last inserted ID from the survey table
        const getLastInsertIdQuery = 'SELECT LAST_INSERT_ID() AS id';
        const lastInsertResult = await dbQuery(getLastInsertIdQuery, []);
        const newSurveyId = lastInsertResult[0].id; // Get the new survey id

        // Fetch only active employees in the same company
        const employees = await dbQuery(`SELECT id FROM ns_employees WHERE company = ? AND status = 'active'`, [company]);

        if (employees.length > 0) {
            const insertEmployeeSurveyQuery = `
                INSERT INTO ns_employee_surveys (survey, employee, access_token)
                VALUES (?, ?, ?)
            `;

            for (const employee of employees) {
                const accessToken = await generateAccessToken(newSurveyId); // Use newSurveyId
                await dbQuery(insertEmployeeSurveyQuery, [newSurveyId, employee.id, accessToken]);
            }
        }

        return res.status(201).json({
            message: 'Deep Dive succesvol aangemaakt en toegezen aan actieve medewerkers',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database insert error' });
    }
};

const deleteDeepDive = async (req, res) => {
    const id = req.id; // Survey ID to delete

    try {
        const deleteEmployeeSurveysQuestions = `
            DELETE FROM ns_questions WHERE survey = ?
        `;
        await dbQuery(deleteEmployeeSurveysQuestions, [id]);

        const deleteThemesSurveysQuery = `
            DELETE FROM ns_questions_themes WHERE survey = ?
        `;
        await dbQuery(deleteThemesSurveysQuery, [id]);

        const deleteEmployeeSurveysQuery = `
            DELETE FROM ns_employee_surveys WHERE survey = ?
        `;
        await dbQuery(deleteEmployeeSurveysQuery, [id]);

        const deleteSurveyQuery = `
            DELETE FROM ns_surveys WHERE id = ?
        `;
        await dbQuery(deleteSurveyQuery, [id]);

        return res.status(200).json({
            message: 'Deep Dive succesvol verwijderd',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database delete error' });
    }
};

const getDeepDiveCompanyInfo = async (req, res) => {
    const uuid = req.params.uuid;
    const sqlQuery = 'SELECT id, company, sent FROM ns_surveys WHERE uuid = ?';
    
    try {
        // Fetch the survey data
        const results = await dbQuery(sqlQuery, [uuid]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Er is helaas niks gevonden' });
        }

        const survey = results[0];
        if (!survey.sent) {
            return res.status(404).json({ message: 'Er is helaas niks gevonden' });
        }

        const companyId = survey.company;
        const companyQuery = 'SELECT id, name, logo FROM ns_companies WHERE id = ?';
        const companyResults = await dbQuery(companyQuery, [companyId]);

        if (companyResults.length === 0) {
            return res.status(404).json({ message: 'Administratie is niet gevonden' });
        }

        // Return the company info
        return res.json({
            survey_id: survey.id,
            company: companyResults[0]
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getDeepDiveSurvey = async (req, res) => {
    const id = req.id;
    const token = req.token;
    
    try {
        const sqlQuery = 'SELECT * FROM ns_employee_surveys WHERE survey = ? AND access_token = ?';
        const results = await dbQuery(sqlQuery, [id, token]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'Helaas niks gevonden of PIN is incorrect' });
        }

        // Survey exists and access_token is valid
        const employeeSurveyId = results[0].id; // Get the survey ID from the employee survey result

        // Now query ns_questions for questions related to the survey
        const questionQuery = `
        SELECT 
            ns_questions.*,
            ns_benefits.title AS benefit_title,
            ns_benefits.description AS benefit_description,
            ns_themes.id AS theme_id,
            ns_themes.key_name AS theme_key_name,
            ns_themes.name AS theme_name,
            ns_themes.icon AS theme_icon,
            ns_employees.first_name AS employee_first_name,
            ns_employees.last_name AS employee_last_name,
            ns_employees.email AS employee_email
        FROM 
            ns_questions
        INNER JOIN 
            ns_benefits ON ns_benefits.id = ns_questions.benefit
        INNER JOIN 
            ns_themes ON ns_themes.id = ns_benefits.theme
        INNER JOIN
            ns_employees ON ns_questions.employee = ns_employees.id
        WHERE 
            survey = ? AND employee_survey = ?`;
        const questions = await dbQuery(questionQuery, [id, employeeSurveyId]);

        const themesQuery = `
            SELECT 
                ns_questions_themes.*,
                ns_themes.id AS theme_id,
                ns_themes.name as theme_name,
                ns_themes.usps as theme_usps,
                ns_themes.icon as theme_icon
                FROM
                ns_questions_themes
            INNER JOIN 
                ns_themes ON ns_themes.id = ns_questions_themes.theme
            WHERE 
                survey = ? AND employee_survey = ?
        `;
        const themes = await dbQuery(themesQuery, [id, employeeSurveyId]);

        if (questions.length === 0) {
            return res.status(404).json({ message: 'Er zijn geen arbeidsvoorwaarden gevonden om te kunnen beoordelen' });
        }

        const allNull = questions.every(q => q.relevance === null && q.communication === null);

        // Group questions by theme_id
        const groupedQuestions = questions.reduce((acc, question) => {
            const {
                theme_id,
                theme_key_name,
                theme_name,
                theme_icon,
                ...questionData
            } = question;
        
            // Remove employee info from questionData
            delete questionData.employee_first_name;
            delete questionData.employee_last_name;
            delete questionData.employee_email;
        
            if (!acc[theme_id]) {
                acc[theme_id] = {
                    theme_id,
                    theme_key_name,
                    theme_name,
                    theme_icon,
                    questions: []
                };
            }
        
            acc[theme_id].questions.push(questionData);
            return acc;
        }, {});

        // Convert the object into an array
        const groupedQuestionsArray = Object.values(groupedQuestions);

        // Return the survey and questions data
        return res.json({
            survey: results[0],
            meta: {
                employee: {
                    first_name: questions[0].employee_first_name,
                    last_name: questions[0].employee_last_name,
                    email: questions[0].employee_email
                },
                new_submission: allNull
            },
            questions: groupedQuestionsArray,
            themes: themes
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const submitQuestion = async (req, res) => {
    const id = req.id;
    const relevance = req.relevance;
    const communication = req.communication;
    const note = req.note;
    try {
        await dbQuery('UPDATE ns_questions SET relevance = ?, communication = ?, note = ? WHERE id = ?', [relevance, communication, note, id]);
        return res.json({ 
            message: 'Vraag is succesvol ingevuld' 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const submitThemeScore = async (req, res) => {
    const id = req.id;
    const type = req.type;
    const selected = req.selected;
    const budget = req.budget;
    try {
        if (type === 'budget') {
            await dbQuery('UPDATE ns_questions_themes SET budget = ? WHERE id = ?', [budget, id]);
        } else if (type === 'select') {
            await dbQuery('UPDATE ns_questions_themes SET selected = ? WHERE id = ?', [selected, id]);
        }
        return res.json({ 
            message: type === 'budget' ? 'Thema budget is succesvol toegewezen' : 'Thema is succesvol geselecteerd'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const submitDeepDive = async (req, res) => {
    const id = req.id;
    try {
        await dbQuery('UPDATE ns_employee_surveys SET submitted_at = ? WHERE id = ?', [moment().tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'), id]);
        return res.json({ 
            message: 'DeepDive is succesvol ingestuurd en ontvangen!' 
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const sendDeepDive = async (req, res) => {
    const id = req.id;
    const company = req.company;
    const isReminder = req.reminder;

    try {
        let sqlQuery = `
        SELECT
            ns_employee_surveys.*,
            ns_employees.id AS employee_id,
            ns_employees.first_name,
            ns_employees.last_name,
            ns_employees.email,
            ns_surveys.id AS survey_id,
            ns_surveys.uuid AS survey_uuid,
            ns_surveys.benefits
        FROM
            ns_employee_surveys
        INNER JOIN 
            ns_employees ON ns_employee_surveys.employee = ns_employees.id
        INNER JOIN
            ns_surveys ON ns_employee_surveys.survey = ns_surveys.id
        WHERE 
            ns_surveys.id = ?`;

        if (isReminder) {
            sqlQuery += ` AND ns_employee_surveys.submitted_at IS NULL`;
        }

        const results = await dbQuery(sqlQuery, [id]);

        if (results.length === 0) {
            return res.status(404).json({ message: isReminder ? 'Deze deep dive is al door iedereen ingevuld' : 'Er zijn geen medewerkers gevonden om deze deep dive naar te versturen' });
        }

        //Create questions from ALL benefits if not reminder
        if (!isReminder) {
            const benefitsToQuestion = await dbQuery('SELECT * FROM ns_benefits WHERE company = ? AND id IN (?)', [company, results[0].benefits]);
            const themesToQuestion = await dbQuery('SELECT * FROM ns_themes WHERE company = ?', [company]);
            const employeeSurveys = await dbQuery('SELECT * FROM ns_employee_surveys WHERE survey = ?', [id]);
        
            const insertPromises = [
                ...benefitsToQuestion.flatMap(benefit =>
                    employeeSurveys.map(empSurvey =>
                        dbQuery(
                            `INSERT INTO ns_questions (benefit, employee_survey, survey, employee)
                             VALUES (?, ?, ?, ?)`,
                            [benefit.id, empSurvey.id, id, empSurvey.employee]
                        )
                    )
                ),
                ...themesToQuestion.flatMap(theme =>
                    employeeSurveys.map(empSurvey =>
                        dbQuery(
                            `INSERT INTO ns_questions_themes (theme, survey, employee_survey, employee)
                             VALUES (?, ?, ?, ?)`,
                            [theme.id, id, empSurvey.id, empSurvey.employee]
                        )
                    )
                ),
            ];
        
            await Promise.all(insertPromises);
        }
        

        const mailersend = new MailerSend({ apiKey: process.env.MAILERSEND_ADMIN_API });
        const sentFrom = new Sender(process.env.NO_REPLY_MAIL, "Total Benefits");

        const recipients = results.map((item) => new Recipient(item.email, item.email));

        const personalization = results.map((item) => ({
            email: item.email,
            data: {
                name: item.first_name,
                account_name: 'Total Benefits',
                support_email: process.env.SUPPORT_MAIL,
                pin: item.access_token,
                deep_dive_url: `${process.env.APP_URL}/deepdive/${item.survey_uuid}`
            }
        }));

        const emailParams = new EmailParams()
            .setFrom(sentFrom)
            .setTo(recipients)
            .setReplyTo(sentFrom)
            .setSubject(isReminder ? 'We wachten nog op jouw mening' : 'Beoordeel jouw arbeidsvoorwaardenpakket') // Same subject for all
            .setPersonalization(personalization)
            .setTemplateId(isReminder ? process.env.SEND_DEEP_DIVE_REMINDER_TEMPLATE_ID : process.env.SEND_DEEP_DIVE_TEMPLATE_ID);

        await mailersend.email.send(emailParams);

        if (!isReminder) {
            await dbQuery('UPDATE ns_surveys SET sent = ? WHERE id = ?', [moment().tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'), id]);
        } else {
            await dbQuery('UPDATE ns_surveys SET reminder_sent = ? WHERE id = ?', [moment().tz('Europe/Amsterdam').format('YYYY-MM-DD HH:mm:ss'), id]);
        }
        
        return res.json({ message: isReminder ? 'Deep dive reminder verstuurd naar medewerkers die deze nog niet hebben ingevuld' : 'Deep dive is verstuurd naar medewerkers', count: results.length });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};




module.exports = { listDeepDives, createDeepDive, deleteDeepDive, getDeepDiveCompanyInfo, getDeepDiveSurvey, submitQuestion, submitThemeScore, submitDeepDive, sendDeepDive};