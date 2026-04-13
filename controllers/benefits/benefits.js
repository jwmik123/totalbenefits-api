const { dbQuery } = require('../../helpers/helper');
const { logError } = require('../../helpers/errorLogger');

//3rd party
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const listBenefits = async (req, res) => {
    const company = req.company;
    const status = req.status;
    const theme = req.query.theme;
    const entity = req.query.entity;

    let sqlQuery = `
        SELECT 
            ns_benefits.*, 
            ns_themes.name AS theme_name, 
            ns_themes.key_name AS theme_key, 
            ns_questions.id AS question_id,
            ns_questions.relevance,
            ns_questions.communication,
            ns_benefit_statuses.label AS status_label,
            ns_benefit_statuses.color AS status_color,
            ns_benefit_statuses.icon AS status_icon
        FROM ns_benefits
        INNER JOIN ns_themes ON ns_themes.id = ns_benefits.theme
        INNER JOIN ns_benefit_statuses ON ns_benefits.status = ns_benefit_statuses.id
        LEFT JOIN ns_questions ON ns_questions.benefit = ns_benefits.id
        WHERE ns_benefits.company = ?
    `;
    const queryParams = [company];

    if (theme) {
        sqlQuery += ' AND ns_benefits.theme = ?';
        queryParams.push(theme);
    }
    if (entity) {
        sqlQuery += ' AND JSON_CONTAINS(ns_benefits.entities, ?)';
        queryParams.push(entity.toString()); 
    }

    if (Number(status) !== 0) {
        sqlQuery += ` AND ns_benefits.status = ${status}`;
    }

    try {
        const rows = await dbQuery(sqlQuery, queryParams);

        const benefitsMap = {};

        for (const row of rows) {
            const benefitId = row.id;

            if (!benefitsMap[benefitId]) {
                const {
                    question_id, relevance, communication,
                    ...benefitData
                } = row;

                benefitsMap[benefitId] = {
                    ...benefitData,
                    questions: [],
                    average_relevance: null,
                    average_communication: null,
                    _relevanceSum: 0,
                    _relevanceCount: 0,
                    _communicationSum: 0,
                    _communicationCount: 0,
                };
            }

            if (row.question_id) {
                benefitsMap[benefitId].questions.push({
                    id: row.question_id,
                    relevance: row.relevance,
                    communication: row.communication,
                });

                if (row.relevance !== null) {
                    benefitsMap[benefitId]._relevanceSum += row.relevance;
                    benefitsMap[benefitId]._relevanceCount += 1;
                }

                if (row.communication !== null) {
                    benefitsMap[benefitId]._communicationSum += row.communication;
                    benefitsMap[benefitId]._communicationCount += 1;
                }
            }
        }

        const groupedResults = Object.values(benefitsMap).map((benefit) => {
            // Calculate averages
            if (benefit._relevanceCount > 0) {
                benefit.average_relevance = Math.round((benefit._relevanceSum / benefit._relevanceCount) * 10) / 10;
            }
            if (benefit._communicationCount > 0) {
                benefit.average_communication = Math.round((benefit._communicationSum / benefit._communicationCount) * 10) / 10;
            }

            // Remove temp sums and counts
            delete benefit._relevanceSum;
            delete benefit._relevanceCount;
            delete benefit._communicationSum;
            delete benefit._communicationCount;

            return benefit;
        });

        return res.json(groupedResults);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};



const getBenefit = async (req, res) => {
    try {
        const benefit = req.benefit;

        //Assign tags to benefit
        if (benefit.tags) {
            var tagResults = await dbQuery('SELECT ns_tags.id, ns_tags.key_name, ns_tags.value FROM ns_tags WHERE id IN (?)', [benefit.tags]);
        } else {
            var tagResults = [];
        }
        benefit.tags = tagResults;

        //Assign tags to benefit
        if (benefit.branches) {
            var branchResults = await dbQuery('SELECT ns_branches.id, ns_branches.key, ns_branches.name FROM ns_branches WHERE id IN (?)', [benefit.branches]);
        } else {
            var branchResults = [];
        }
        
        benefit.branches = branchResults;
        // let deepDivesQuery = `
        // SELECT
        //     ns_surveys.id AS survey_id,
        //     ns_surveys.title AS survey_title,
        //     ns_surveys.created_at AS survey_created_at,
        //     ns_questions.benefit,
        //     ns_questions.relevance,
        //     ns_questions.communication,
        //     ns_questions.note,
        //     ns_questions.survey
        // FROM
        //     ns_questions
        // INNER JOIN 
        //     ns_surveys ON ns_questions.survey = ns_surveys.id
        // WHERE 
        //     ns_questions.benefit = ?`;
        // const deepDives = await dbQuery(deepDivesQuery, [benefit.id]);
        // const groupedDeepDives = deepDives.reduce((acc, curr) => {
        //     const {
        //         survey_id,
        //         survey_title,
        //         survey_created_at,
        //         benefit,
        //         relevance,
        //         communication,
        //         note,
        //         survey
        //     } = curr;
        
        //     let group = acc.find(item => item.survey_id === survey_id);
        //     if (!group) {
        //         group = {
        //             survey_id,
        //             survey_title,
        //             survey_created_at,
        //             questions: [],
        //             avg_relevance: null,
        //             avg_communication: null
        //         };
        //         acc.push(group);
        //     }
        
        //     group.questions.push({
        //         benefit,
        //         relevance,
        //         communication,
        //         note,
        //         survey
        //     });
        
        //     return acc;
        // }, []);
        
        // // Sort newest survey_created_at first
        // groupedDeepDives.sort((a, b) => new Date(b.survey_created_at) - new Date(a.survey_created_at));
        
        
        // // Calculate averages safely (excluding nulls or non-numbers)
        // groupedDeepDives.forEach(group => {
        //     const totalCount = group.questions.length;
        
        //     const validAnswers = group.questions.filter(q =>
        //         q.relevance !== null &&
        //         q.relevance !== undefined &&
        //         !isNaN(q.relevance) &&
        //         q.communication !== null &&
        //         q.communication !== undefined &&
        //         !isNaN(q.communication)
        //     );
        
        //     group.total_count = totalCount;
        //     group.answer_count = validAnswers.length;
        
        //     group.avg_relevance = validAnswers.length
        //         ? parseFloat((validAnswers.reduce((sum, q) => sum + q.relevance, 0) / validAnswers.length).toFixed(1))
        //         : null;
        
        //     group.avg_communication = validAnswers.length
        //         ? parseFloat((validAnswers.reduce((sum, q) => sum + q.communication, 0) / validAnswers.length).toFixed(1))
        //         : null;
        // });
        
        // benefit.deepdives = groupedDeepDives;

        return res.json(benefit);
    } catch (error) {
        return res.status(500).json({
            message: 'Fout bij het ophalen arbeidsvoorwaarde',
            error: error.response?.data || error.message
        });
    }
};


const createBenefit = async (req, res) => {
    const { 
        title, 
        theme,
        entities, 
        status, 
        description, 
        implementation, 
        since, 
        target_group,
        usage_count,
        price_per_year, 
        linked_benefit, 
        company, 
        tags, 
        branches, 
        pros, 
        cons, 
        document, 
        legal_basis,
        legal_extension, 
        cao,
        disable_cao,
        compensation_type, 
        tax_regime, 
        purpose, 
        organizational_themes, 
        core_values,
        stakeholder_owner, 
        last_review, 
        next_review, 
        notes,
    } = req.body;

    const { userName, userRole } = req;

    let benefitUUID;
    let isUnique = false;
    while (!isUnique) {
        benefitUUID = uuidv4();
        const existing = await dbQuery(
            `SELECT id FROM ns_benefits WHERE uuid = ? LIMIT 1`,
            [benefitUUID]
        );
        if (existing.length === 0) {
            isUnique = true;
        }
    }

    var sinceDate = since ? since : null;
    var lastReviewDate = last_review ? last_review : null;
    var nextReviewDate = next_review ? next_review : null;

    // Convert arrays to JSON or NULL
    const tagsString = tags && tags.length > 0 ? JSON.stringify(tags) : null;
    const branchesString = branches && branches.length > 0 ? JSON.stringify(branches) : null;
    //const prosString = pros && pros.length > 0 ? JSON.stringify(pros) : null;
    //const consString = cons && cons.length > 0 ? JSON.stringify(cons) : null;

    const sqlQuery = `
        INSERT INTO 
        ns_benefits 
        (uuid, 
        title, 
        theme,
        entities, 
        status, 
        description, 
        implementation, 
        since, 
        target_group,
        usage_count,
        price_per_year, 
        linked_benefit, 
        company, 
        tags, 
        branches, 
        document, 
        legal_basis, 
        legal_extension,
        cao,
        disable_cao,
        compensation_type, 
        tax_regime, 
        purpose, 
        organizational_themes, 
        core_values,
        stakeholder_owner, 
        last_review, 
        next_review, 
        notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        benefitUUID, 
        title, 
        theme,
        JSON.stringify(entities),
        status, 
        description, 
        implementation, 
        sinceDate, 
        target_group,
        usage_count,
        price_per_year, 
        linked_benefit, 
        company, 
        tagsString, 
        branchesString, 
        document, 
        legal_basis, 
        legal_extension,
        cao,
        disable_cao,
        compensation_type, 
        tax_regime, 
        purpose, 
        organizational_themes, 
        JSON.stringify(core_values),
        stakeholder_owner, 
        lastReviewDate, 
        nextReviewDate, 
        notes
    ];
    var logDescription = `Aangemaakt door ${userName}`;
    try {
        const result = await dbQuery(sqlQuery, values);
        const addLog = await dbQuery('INSERT INTO ns_benefit_logs (benefit, description, role) VALUES (?, ?, ?)', [result.insertId, logDescription, userRole === 1 ? 'super_admin' : 'user']);
        return res.json({ id: result.insertId, benefitUUID, title });
    } catch (error) {
        logError(error, { function: 'createBenefit' });
        return res.status(500).json({
            message: 'Fout bij het aanmaken van arbeidsvoorwaarde',
            error: error.response?.data || error.message
        });
    }
};

const updateBenefit = async (req, res) => {
    const { data, user, userRole, benefit } = req;
    if (req.route.path === '/:uuid/general') {
        var sqlQuery = `UPDATE ns_benefits SET title = ?, theme = ?, entities = ?, status = ?, since = ?, target_group = ?, usage_count = ?, document = ?, linked_benefit = ? WHERE id = ?`;
        var values = [data.title, data.theme, data.entities ? JSON.stringify(data.entities) : null, data.status, data.since, data.target_group, data.usage_count, data.document, data.linked_benefit, benefit.id];
        var logDescription = `Gewijzigd (Algemeen) door ${user}`;
    }
    if (req.route.path === '/:uuid/description') {
        var sqlQuery = `UPDATE ns_benefits SET description = ? WHERE id = ?`;
        var values = [data.description, benefit.id];
        var logDescription = `Gewijzigd (Beschrijving) door ${user}`;
    }
    if (req.route.path === '/:uuid/financial') {
        var sqlQuery = `UPDATE ns_benefits SET price_per_year = ?, compensation_type = ?, tax_regime = ?, legal_basis = ?, legal_extension = ?, cao = ?, disable_cao = ? WHERE id = ?`;
        var values = [data.price_per_year, data.compensation_type, data.tax_regime, data.legal_basis, data.legal_extension, data.cao, data.disable_cao, benefit.id];
        var logDescription = `Gewijzigd (Financieel & Juridisch) door ${user}`;
    }
    if (req.route.path === '/:uuid/implementation') {
        var sqlQuery = `UPDATE ns_benefits SET implementation = ? WHERE id = ?`;
        var values = [data.implementation, benefit.id];
        var logDescription = `Gewijzigd (Implementatie) door ${user}`;
    }
    if (req.route.path === '/:uuid/strategic') {
        var sqlQuery = `UPDATE ns_benefits SET purpose = ?, organizational_themes = ?, core_values = ? WHERE id = ?`;
        var values = [data.purpose, data.organizational_themes, data.core_values ? JSON.stringify(data.core_values) : null, benefit.id];
        var logDescription = `Gewijzigd (Strategisch) door ${user}`;
    }
    if (req.route.path === '/:uuid/maintenance') {
        var sqlQuery = `UPDATE ns_benefits SET stakeholder_owner = ?, last_review = ?, next_review = ?, notes = ? WHERE id = ?`;
        var values = [data.stakeholder_owner, data.last_review, data.next_review, data.notes, benefit.id];
        var logDescription = `Gewijzigd (Onderhoud) door ${user}`;
    }
    try {
        const result = await dbQuery(sqlQuery, values);
        await dbQuery('INSERT INTO ns_benefit_logs (benefit, description, role) VALUES (?, ?, ?)', [benefit.id, logDescription, userRole === 1 ? 'super_admin' : 'user']);
        return res.json({ message: 'Arbeidsvoorwaarde bijgewerkt' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het bijwerken van arbeidsvoorwaarde',
            error: error.response?.data || error.message
        });
    }
};

const deleteBenefit = async (req, res) => {
    const { data, user, userRole, benefit } = req;
    try {
        await dbQuery('DELETE FROM ns_benefits WHERE uuid = ?', [benefit.uuid]);
        await dbQuery('DELETE FROM ns_bestpractices WHERE benefit = ?', [benefit.uuid]);
        await dbQuery('DELETE FROM ns_benefit_logs WHERE benefit = ?', [benefit.id]);
        await dbQuery('DELETE FROM ns_questions WHERE benefit = ?', [benefit.id]);
        return res.json({ message: 'Arbeidsvoorwaarde is verwijderd' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Fout bij het verwijderen van arbeidsvoorwaarde',
            error: error.response?.data || error.message
        });
    }
};

const getDocument = async (req, res) => {
    const { filename } = req.body;
    try {
        if (!filename) {
            return res.status(400).json({ error: 'Geen bestandsnaam opgegeven' });
        }
        const uploadDir = path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadDir, 'documents', path.basename(filename));
        console.log(filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Bestand niet gevonden' });
        }
        // Lees bestand in en converteer naar Base64
        const fileData = fs.readFileSync(filePath);
        const base64Data = fileData.toString('base64');
        // Bepaal mime-type voor data URL
        const mimeType = mime.lookup(filePath);
        res.status(200).json({
            fileName: filename,
            mimeType,
            base64: `data:${mimeType};base64,${base64Data}`
        });
    } catch (error) {
        console.error('Fout bij het ophalen van het document:', error);
        res.status(500).json({ error: 'Er is een fout opgetreden bij het ophalen van het document' });
    }
};



module.exports = { listBenefits, getBenefit, createBenefit, updateBenefit, deleteBenefit, getDocument };