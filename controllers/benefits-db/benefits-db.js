const { dbQuery } = require('../../helpers/helper');
const { invalidateSchemaAndInsights } = require('../../services/benchmark-data');

const dotenv = require('dotenv');
dotenv.config();

//3rd party
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const uploadDir = path.join(process.cwd(), 'uploads');

const getBenefit = async (req, res) => {
    const uuid = req.uuid;
  	const admin = req.admin;
    const userId = req.user.id;
    try {
        let benefit = await dbQuery('SELECT * FROM ns_bd_benefits WHERE uuid = ?', [uuid]);
        if (benefit.length > 0 && !admin) {
        
            //Get stakeholders values
            let stakeholders = benefit[0].stakeholders;
            if (stakeholders.length > 0) {
                let placeholders = stakeholders.map(() => '?').join(',');
                let stakeholderRows = await dbQuery(
                `SELECT id, value AS label FROM ns_bd_stakeholders WHERE id IN (${placeholders})`,
                stakeholders
                );
                let stakeholdersMap = Object.fromEntries(stakeholderRows.map(b => [b.id, b.label]));
                benefit[0].stakeholders = stakeholders.map(id => ({
                id,
                label: stakeholdersMap[id] || null
                }));
            }
            
            //Get branches values
            let branches = benefit[0].branches;
            if (branches.length > 0) {
                let placeholders = branches.map(() => '?').join(',');
                let branchRows = await dbQuery(
                `SELECT id, name AS label FROM ns_branches WHERE id IN (${placeholders})`,
                branches
                );
                let branchMap = Object.fromEntries(branchRows.map(b => [b.id, b.label]));
                benefit[0].branches = branches.map(id => ({
                id,
                label: branchMap[id] || null
                }));
            }
            
            //Get correlations values
            let correlations = benefit[0].correlations;
            if (correlations.length > 0) {
                let placeholders = correlations.map(() => '?').join(',');
                let correlationRows = await dbQuery(
                `SELECT id, title, uuid FROM ns_bd_benefits WHERE id IN (${placeholders})`,
                correlations
                );
                let correlationsMap = Object.fromEntries(
                correlationRows.map(b => [b.id, { title: b.title, uuid: b.uuid }])
                );
                benefit[0].correlations = correlations.map(id => ({
                id,
                title: correlationsMap[id]?.title || null,
                uuid: correlationsMap[id]?.uuid || null
                }));
            }
            
            //Get KPI values
            let kpis = benefit[0].kpi_metrics;
            if (kpis.length > 0) {
                let placeholders = kpis.map(() => '?').join(',');
                let kpiRows = await dbQuery(
                `SELECT id, value AS label FROM ns_bd_kpis WHERE id IN (${placeholders})`,
                kpis
                );
                let kpisMap = Object.fromEntries(kpiRows.map(b => [b.id, b.label]));
                benefit[0].kpi_metrics = kpis.map(id => ({
                id,
                label: kpisMap[id] || null
                }));
            }

            let likeRows = await dbQuery(
                `SELECT 1 FROM ns_bd_likes WHERE user = ? AND benefit = ? LIMIT 1`,
                [userId, benefit[0].id]
            );
            benefit[0].liked = likeRows.length > 0;


            let linked_benefits = await dbQuery(
                `SELECT * FROM ns_benefits WHERE linked_benefit = ?`,
                [benefit[0].id]
            );
            benefit[0].linked_benefits = linked_benefits;

            if (linked_benefits.length > 0) {
                const benefitUuids = linked_benefits.map(b => b.uuid);
                const placeholders = benefitUuids.map(() => '?').join(',');

                const best_practices = await dbQuery(
                    `SELECT 
                    ns_bestpractices.content,
                    ns_companies.name AS company_name,
                    ns_companies.thumbnail AS company_thumbnail,
                    ns_users.first_name AS user_first_name,
                    ns_users.last_name AS user_last_name
                    FROM ns_bestpractices
                    INNER JOIN ns_companies
                        ON ns_bestpractices.company = ns_companies.id
                    INNER JOIN ns_users
                        ON ns_bestpractices.user = ns_users.id
                    INNER JOIN ns_user_company
                        ON ns_users.id = ns_user_company.user AND ns_companies.id = ns_user_company.company
                    WHERE benefit IN (${placeholders})
                        AND ns_bestpractices.public = 1
                        AND ns_bestpractices.status = 'published'`,
                    benefitUuids
                );
                benefit[0].best_practices = best_practices;
            } else {
                benefit[0].best_practices = [];
            }
            

        }

        return res.json(benefit);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const listBenefits = async (req, res) => {
    const theme = req.theme;
    const { company, uniqueness_score, financial_score, implementation_complexity, implementation_timeframe, update_frequency } = req.body;
    
    try {
        let sqlQuery = `
            SELECT 
                ns_bd_benefits.*,
                CASE 
                    WHEN ns_bd_likes.benefit IS NULL THEN false
                    ELSE true
                END AS liked,
                IF(ns_bd_likes.benefit IS NOT NULL, CONCAT(ns_users.first_name, ' ', ns_users.last_name), NULL) AS liked_by
            FROM ns_bd_benefits
            LEFT JOIN ns_bd_likes 
                ON ns_bd_benefits.id = ns_bd_likes.benefit AND ns_bd_likes.company = ?
            LEFT JOIN ns_users
                ON ns_bd_likes.user = ns_users.id
        `;

        const params = [company];
        const whereClauses = [];

        // Theme filter
        if (theme) {
            whereClauses.push(`JSON_CONTAINS(ns_bd_benefits.themes, ?)`);
            params.push(JSON.stringify([Number(theme)]));
        }

        // Uniqueness score filter
        if (uniqueness_score?.value != null) {
            const op = uniqueness_score.compare === 'greater' ? '>' : uniqueness_score.compare === 'less' ? '<' : '=';
            whereClauses.push(`ns_bd_benefits.uniqueness_score ${op} ?`);
            params.push(uniqueness_score.value);
        }

        // Financial score filter
        if (financial_score?.value != null) {
            const op = financial_score.compare === 'greater' ? '>' : financial_score.compare === 'less' ? '<' : '=';
            whereClauses.push(`ns_bd_benefits.financial_score ${op} ?`);
            params.push(financial_score.value);
        }

        // Overige filters
        if (implementation_complexity) {
            whereClauses.push(`ns_bd_benefits.implementation_complexity = ?`);
            params.push(implementation_complexity);
        }
        if (implementation_timeframe) {
            whereClauses.push(`ns_bd_benefits.implementation_timeframe = ?`);
            params.push(implementation_timeframe);
        }
        if (update_frequency) {
            whereClauses.push(`ns_bd_benefits.update_frequency = ?`);
            params.push(update_frequency);
        }

        // Voeg filters toe aan de query
        if (whereClauses.length > 0) {
            sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
        }

        sqlQuery += ' ORDER BY ns_bd_benefits.title ASC';

        const results = await dbQuery(sqlQuery, params);
        return res.json(results);

    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};



const listBenefitSelectOptions = async (req, res) => {
    try {
        const themes = await dbQuery('SELECT * FROM ns_bd_themes ORDER BY value');
        const tags = await dbQuery('SELECT * FROM ns_tags ORDER BY value ASC');
        const stakeholders = await dbQuery('SELECT * FROM ns_bd_stakeholders');
        const branches = await dbQuery('SELECT * FROM ns_branches ORDER BY name ASC');
        const benefits = await dbQuery('SELECT id, title AS value FROM ns_bd_benefits ORDER BY title ASC');
      	const kpis = await dbQuery('SELECT * FROM ns_bd_kpis ORDER BY value ASC');
        const options = {
            themes,
            tags,
            stakeholders,
            branches,
            benefits,
          	kpis
        };
        return res.json(options);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const listStakeholders = async (req, res) => {
    try {
        const stakeholders = await dbQuery('SELECT * FROM ns_bd_stakeholders');
        return res.json(stakeholders);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const createBenefit = async (req, res) => {
    try {
        const {
            title,
            introduction,
            synonyms,
            financial_score,
            financial_content,
            legal,
            tax_legislation,
            implementation_methods,
          	pros,
          	cons,
            uniqueness_score,
            uniqueness_content,
            themes,
            tags,
            stakeholders,
            document,
            sample_implementation_texts,
            branches,
            suppliers,
            articles,
            correlations,
            communication_strategy,
            kpi_metrics,
            implementation_complexity,
            implementation_timeframe,
            implementation_content,
            system_requirements,
            update_frequency,
            update_frequency_content
        } = req.postData;

        // Pas eventueel arrays aan naar JSON string als je ze zo opslaat in je DB
        const benefit = await dbQuery(
            `INSERT INTO ns_bd_benefits (
                title,
                introduction,
                synonyms,
                financial_score,
                financial_content,
                legal,
                tax_legislation,
                implementation_methods,
				pros,
          		cons,
                uniqueness_score,
                uniqueness_content,
                themes,
                tags,
                stakeholders,
                document,
                sample_implementation_texts,
                branches,
                suppliers,
                articles,
                correlations,
                communication_strategy,
                kpi_metrics,
                implementation_complexity,
                implementation_timeframe,
                implementation_content,
                system_requirements,
                update_frequency,
                update_frequency_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                introduction,
                synonyms,
                financial_score,
                financial_content,
                legal,
                tax_legislation,
                implementation_methods,
              	pros,
          		cons,
                uniqueness_score,
                uniqueness_content,
                JSON.stringify(themes),
                JSON.stringify(tags),
                JSON.stringify(stakeholders),
                document,
                sample_implementation_texts,
                JSON.stringify(branches),
                JSON.stringify(suppliers),
                JSON.stringify(articles),
                JSON.stringify(correlations),
                communication_strategy,
                JSON.stringify(kpi_metrics),
                implementation_complexity,
                implementation_timeframe,
                implementation_content,
                system_requirements,
                update_frequency,
                update_frequency_content
            ]
        );
        return res.json(benefit);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const updateBenefit = async (req, res) => {
    try {
        const {
            title,
            introduction,
            synonyms,
            financial_score,
            financial_content,
            legal,
            tax_legislation,
            implementation_methods,
          	pros,
          	cons,
            uniqueness_score,
            uniqueness_content,
            themes,
            tags,
            stakeholders,
            document,
            sample_implementation_texts,
            branches,
            suppliers,
            articles,
            correlations,
            communication_strategy,
            kpi_metrics,
            implementation_complexity,
            implementation_timeframe,
            implementation_content,
            system_requirements,
            update_frequency,
            update_frequency_content
        } = req.postData;
      
      	const { uuid } = req.postData;

        const existingRows = await dbQuery(
            'SELECT id, title, introduction FROM ns_bd_benefits WHERE uuid = ? LIMIT 1',
            [uuid]
        );
        const existingBenefit = existingRows[0] || null;

        const result = await dbQuery(
            `UPDATE ns_bd_benefits SET
                title = ?,
                introduction = ?,
                synonyms = ?,
                financial_score = ?,
                financial_content = ?,
                legal = ?,
                tax_legislation = ?,
                implementation_methods = ?,
				pros = ?,
				cons = ?,
                uniqueness_score = ?,
                uniqueness_content = ?,
                themes = ?,
                tags = ?,
                stakeholders = ?,
                document = ?,
                sample_implementation_texts = ?,
                branches = ?,
                suppliers = ?,
                articles = ?,
                correlations = ?,
                communication_strategy = ?,
                kpi_metrics = ?,
                implementation_complexity = ?,
                implementation_timeframe = ?,
                implementation_content = ?,
                system_requirements = ?,
                update_frequency = ?,
                update_frequency_content = ?
            WHERE uuid = ?`,
            [
                title,
                introduction,
                synonyms,
                financial_score,
                financial_content,
                legal,
                tax_legislation,
                implementation_methods,
              	pros,
          		cons,
                uniqueness_score,
                uniqueness_content,
                JSON.stringify(themes),
                JSON.stringify(tags),
                JSON.stringify(stakeholders),
                document,
                sample_implementation_texts,
                JSON.stringify(branches),
                JSON.stringify(suppliers),
                JSON.stringify(articles),
                JSON.stringify(correlations),
                communication_strategy,
                JSON.stringify(kpi_metrics),
                implementation_complexity,
                implementation_timeframe,
                implementation_content,
                system_requirements,
                update_frequency,
                update_frequency_content,
                uuid
            ]
        );
        if (existingBenefit) {
            const titleChanged = existingBenefit.title !== title;
            const introChanged = existingBenefit.introduction !== introduction;
            if (titleChanged || introChanged) {
                await invalidateSchemaAndInsights(existingBenefit.id);
            }
        }

        return res.json({ message: 'Benefit updated successfully', result });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const likeBenefit = async (req, res) => {
    const id = req.params.id;
    const { note, company } = req.body;
    if (!company) {
        return res.status(400).json({ message: 'Geef een bedrijf mee' });
    }
    if (!note) {
        return res.status(400).json({ message: 'Opmerking is verplicht' });
    }
    const userId = req.user.id;
    try {
        const existing = await dbQuery(
            'SELECT * FROM ns_bd_likes WHERE benefit = ? AND company = ?',
            [id, company]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Deze benefit staat al in de lijst met favorieten' });
        }
        const result = await dbQuery(
            'INSERT INTO ns_bd_likes (benefit, user, company, note, status) VALUES (?, ?, ?, ?, ?)',
            [id, userId, company, note, 1]
        );
        return res.json({ message: 'Benefit toegevoegd aan favorieten', result });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};
const dislikeBenefit = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    try {
        const currentBenefit = await dbQuery('SELECT * FROM ns_bd_likes WHERE benefit = ? AND user = ?', [id, userId]);
        if (currentBenefit.length > 0) {
            const result = await dbQuery('DELETE FROM ns_bd_likes WHERE benefit = ? AND user = ?', [id, userId]);
            const deleteLikes = await dbQuery('DELETE FROM ns_bd_likes_liked WHERE benefit = ?', [id]);
            return res.json({ message: 'Benefit verwijderd uit favorieten', result });
        } else {
            return res.status(400).json({ message: 'Deze like is niet door jou geplaatst, je kunt deze dus daarom niet verwijderen' });
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const listThemes = async (req, res) => {
    try {
        const results = await dbQuery('SELECT * FROM ns_bd_themes');
        return res.json(results);
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const getDocument = async (req, res) => {
    const { filename } = req.body;
    try {
        if (!filename) {
            return res.status(400).json({ error: 'Geen bestandsnaam opgegeven' });
        }
        const uploadDir = path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadDir, 'bd-documents', path.basename(filename));
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

const deleteBenefit = async (req, res) => {
    const uuid = req.uuid;
    try {
      const result = await dbQuery(`DELETE FROM ns_bd_benefits WHERE uuid = ?`,[uuid]);
      return res.json({ message: 'Benefit delete successfully', result });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

module.exports = { listBenefits, getBenefit, listBenefitSelectOptions, listStakeholders, createBenefit, updateBenefit, likeBenefit, dislikeBenefit, listThemes, getDocument, deleteBenefit };