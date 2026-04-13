const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyDeepDives = async (req, res, next) => {
    const { company } = req.params;
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
                return res.status(403).json({ error: 'Je kunt geen deep dives bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateCreateDeepDive = async (req, res, next) => {
    const { company } = req.params;
    const { title, benefits } = req.body;
    const userId = req.user.id;

    if (!company) {
        return res.status(403).json({ error: 'Geen bedrijf opgegeven' });
    }

    if (!title || title.trim() === '') {
        return res.status(403).json({ error: 'Titel is verplicht' });
    }

    if (!benefits || benefits.length === 0) {
        return res.status(403).json({ error: 'Er zijn geen arbeidsvoorwaarden geselecteerd' });
    }

    try {
        // Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);

        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery(
                'SELECT * FROM ns_user_company WHERE user = ? AND company = ?',
                [userId, company]
            );
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen deep dives aanmaken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company, title: title.trim(), benefits });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDeleteDeepDive = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const surveyQuery = 'SELECT company FROM ns_surveys WHERE id = ?';
        const survey = await dbQuery(surveyQuery, [id]);

        if (survey.length === 0) {
            return res.status(404).json({ error: 'Deep Dive is niet gevonden' });
        }

        const company = survey[0].company; // Get the company associated with the survey

        // Step 2: Check if user is super_admin or if they belong to the company
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);

        if (userInfo[0].role !== 1) {
            // If user is not a super_admin, check if they belong to the company
            const userCompanies = await dbQuery(
                'SELECT * FROM ns_user_company WHERE user = ? AND company = ?',
                [userId, company]
            );
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen deep dives verwijderen voor dit bedrijf' });
            }
        }

        req.id = id;

        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateGetDeepDive = async (req, res, next) => {
    const { id } = req.params;
    const { token } = req.body;
    if (!token) {
        return res.status(403).json({ error: 'Geen PIN opgegeven' });
    }
    try {
        let sqlQuery = `
        SELECT * FROM ns_employee_surveys WHERE access_token = ? AND survey = ?`;
        const results = await dbQuery(sqlQuery, [token, id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Er is helaas geen deep dive gevonden' });
        }
        if (results[0].submitted_at !== null) {
            return res.status(403).json({ error: 'Deze deep dive is al ingestuurd' });
        }

        Object.assign(req, { id, token });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateSubmitQuestion = async (req, res, next) => {
    const { id } = req.params;
    const { token, relevance, communication, note } = req.body;
    if (!token) {
        return res.status(403).json({ error: 'Geef je unieke PIN mee' });
    }
    if (!relevance) {
        return res.status(403).json({ error: 'Geef een score (0 t/m 5) voor relevantie' });
    }
    if (!communication) {
        return res.status(403).json({ error: 'Geef een score (0 t/m 5) voor communicatie' });
    }
    try {
        let sqlQuery = `
        SELECT
            ns_employee_surveys.id AS employee_survey_id,
            ns_employee_surveys.survey,
            ns_employee_surveys.access_token,
            ns_questions.employee_survey,
            ns_questions.survey AS question_survey
        FROM
            ns_employee_surveys
        INNER JOIN 
            ns_questions ON ns_employee_surveys.id = ns_questions.employee_survey
        WHERE 
            ns_employee_surveys.access_token = ? AND ns_questions.id = ?`;

        const results = await dbQuery(sqlQuery, [token, id]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Je hebt geen toegang om deze vraag te kunnen beoordelen' });
        }
        req.id = id;
        req.relevance = relevance;
        req.communication = communication;
        req.note = note;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateSubmitThemeScore = async (req, res, next) => {
    const { id } = req.params;
    const { token, selected, budget, type } = req.body;
    if (!token) {
        return res.status(403).json({ error: 'Geef je unieke PIN mee' });
    }
    if (type === 'budget') {
        if (!budget) {
            return res.status(403).json({ error: 'Geef een budget mee' });
        }
    } else if (type === 'select') {
        if (selected !== 0 && selected !== 1) {
            return res.status(403).json({ error: 'Geef selected = 1 of 0' });
        }
    } else {
        return res.status(403).json({ error: 'Type is niet geldig' });
    }
    try {
        let sqlQuery = `
        SELECT
            ns_employee_surveys.id AS employee_survey_id,
            ns_employee_surveys.survey,
            ns_employee_surveys.access_token,
            ns_questions_themes.id AS question_theme_id,
            ns_questions_themes.survey AS question_survey
        FROM
            ns_employee_surveys
        INNER JOIN 
            ns_questions_themes ON ns_employee_surveys.id = ns_questions_themes.employee_survey
        WHERE 
            ns_employee_surveys.access_token = ? AND ns_questions_themes.id = ?`;

        const results = await dbQuery(sqlQuery, [token, id]);
        console.log(results);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Je hebt geen toegang om dit thema te kunnen beoordelen' });
        }
        req.id = id;
        req.selected = type === 'select' ? selected : null;
        req.budget = type === 'budget' ? budget : null;
        req.type = type;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateSubmitDeepDive = async (req, res, next) => {
    const { survey } = req.params;
    const { token } = req.body;
    if (!token) {
        return res.status(403).json({ error: 'Geef je unieke PIN mee' });
    }
    try {
        let sqlQuery = `
        SELECT * FROM ns_employee_surveys WHERE access_token = ? AND id = ?`;
        const results = await dbQuery(sqlQuery, [token, survey]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Je hebt geen toegang om deze deep dive te kunnen insturen' });
        }

        //Check if all questions are filled
        const surveyQuestionsQuery = `SELECT * FROM ns_questions WHERE employee_survey = ? AND relevance IS NULL AND communication IS NULL`;
        const questions = await dbQuery(surveyQuestionsQuery, [survey]);
        if (questions.length > 0) {
            return res.status(404).json({ error: 'Deze deep dive is nog niet volledig ingevuld' });
        }

        req.id = survey;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateSendDeepDive = async (req, res, next) => {
    const { id } = req.params;
    const isReminder = req.query.reminder;
    const userId = req.user.id;

    try {
        const surveyQuery = 'SELECT company, sent FROM ns_surveys WHERE id = ?';
        const survey = await dbQuery(surveyQuery, [id]);
        if (survey.length === 0) {
            return res.status(404).json({ error: 'Deep Dive is niet gevonden' });
        }
        if (survey[0].sent && !isReminder) {
            return res.status(404).json({ error: 'Deep Dive is al verstuurd' });
        }

        const company = survey[0].company;

        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery(
                'SELECT * FROM ns_user_company WHERE user = ? AND company = ?',
                [userId, company]
            );
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen deep dives versturen voor dit bedrijf' });
            }
        }

        req.id = id;
        req.company = company;
        req.reminder = isReminder;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyDeepDives, validateCreateDeepDive, validateDeleteDeepDive, validateGetDeepDive, validateSubmitQuestion, validateSubmitThemeScore, validateSubmitDeepDive, validateSendDeepDive };