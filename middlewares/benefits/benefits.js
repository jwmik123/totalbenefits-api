const { dbQuery } = require('../../helpers/helper');

const validateUserCompanyBenefits = async (req, res, next) => {
    const { company, status } = req.params;
    const userId = req.user.id;
    try {

        //Check if user is super_admin or not
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen arbeidsvoorwaarden bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { company, status });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateUserCompany = async (req, res, next) => {
    const uuid = req.params.uuid;
    const userId = req.user.id;

    if (!uuid) {
        return res.status(403).json({ error: 'Geen uuid opgegeven' });
    }

    try {

        const sqlQuery = `
            SELECT 
                ns_benefits.*,
                ns_benefits.company AS best_practice_company,
                ns_themes.name AS theme_name,
                ns_benefit_statuses.id AS status_id,
                ns_benefit_statuses.label AS status_label,
                ns_benefit_statuses.color AS status_color,
                ns_benefit_statuses.icon AS status_icon,
                ns_bestpractices.id AS best_practice_id,
                ns_bestpractices.content AS best_practice_content,
                ns_bestpractices.user AS best_practice_user,
                ns_bestpractices.public AS best_practice_public,
                ns_bestpractices.editted AS best_practice_editted,
                ns_bestpractices.status AS best_practice_status,
                ns_bestpractices.declined_message AS best_practice_declined_message,
                ns_bestpractices.updated_at AS best_practice_updated_at,
                ns_bestpractices.created_at AS best_practice_created_at,
                ns_users.first_name AS best_practice_first_name,
                ns_users.last_name AS best_practice_last_name,
                ns_bd_stakeholders.value AS stakeholder_owner_label,
                ns_bd_benefits.title AS linked_benefit_title,
                ns_bd_benefits.uuid AS linked_benefit_uuid,
                ns_benefit_tax_regimes.label AS tax_regime_label,
                ns_benefit_compensation_types.label AS compensation_type_label,
                ns_target_groups.label AS target_group_label
            FROM 
                ns_benefits
            INNER JOIN ns_themes ON ns_benefits.theme = ns_themes.id
            LEFT JOIN ns_bd_benefits ON ns_benefits.linked_benefit = ns_bd_benefits.id
            LEFT JOIN ns_bd_stakeholders ON ns_benefits.stakeholder_owner = ns_bd_stakeholders.id
            LEFT JOIN ns_benefit_statuses ON ns_benefits.status = ns_benefit_statuses.id
            LEFT JOIN ns_bestpractices ON ns_benefits.uuid = ns_bestpractices.benefit
            LEFT JOIN ns_users ON ns_bestpractices.user = ns_users.id
            LEFT JOIN ns_benefit_tax_regimes ON ns_benefits.tax_regime = ns_benefit_tax_regimes.id
            LEFT JOIN ns_benefit_compensation_types ON ns_benefits.compensation_type = ns_benefit_compensation_types.id
            LEFT JOIN ns_target_groups ON ns_benefits.target_group = ns_target_groups.id
            WHERE ns_benefits.uuid = ?
        `;
        const benefitResults = await dbQuery(sqlQuery, [uuid]);
        
        if (benefitResults.length === 0) {
            return res.status(404).json({ error: 'Geen arbeidsvoorwaarde gevonden' });
        }

        const benefit = benefitResults[0];

        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, benefit.company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt deze arbeidsvoorwaarde niet bekijken' });
            }
        }

        console.log(benefit);
        if (Array.isArray(benefit.core_values) && benefit.core_values.length > 0) {
            const placeholders = benefit.core_values.map(() => '?').join(',');

            const coreValuesQuery = `
                SELECT id, name
                FROM ns_corevalues
                WHERE id IN (${placeholders})
            `;

            const coreValuesWithLabel = await dbQuery(coreValuesQuery, benefit.core_values);
            benefit.core_values_with_label = coreValuesWithLabel;
        } else {
            benefit.core_values_with_label = [];
        }


        const bestPractice = {};
        for (const key in benefit) {
            if (key.startsWith('best_practice_')) {
                const newKey = key.replace('best_practice_', '');
                bestPractice[newKey] = benefit[key];
                delete benefit[key];
            }
        }
        benefit.best_practice = bestPractice;

        const isSuperAdmin = userInfo[0].role === 1;
        let logsQuery = `
            SELECT description, created_at
            FROM ns_benefit_logs
            WHERE benefit = ?
        `;
        const logsParams = [benefit.id];
        if (!isSuperAdmin) {
            logsQuery += ` AND role != 'super_admin'`;
        }
        logsQuery += `
            ORDER BY created_at DESC
        `;
        const logs = await dbQuery(logsQuery, logsParams);
        benefit.logs = logs;

        const benefitStatus = {};
        for (const key in benefit) {
            if (key.startsWith('status_')) {
                const newKey = key.replace('status_', '');
                benefitStatus[newKey] = benefit[key];
                delete benefit[key];
            }
        }
        benefit.status = benefitStatus;

        if (benefit.linked_benefit) {
            const bestPracticesQuery = `
                SELECT
                    ns_bestpractices.id,
                    ns_bestpractices.content,
                    ns_users.first_name AS best_practice_first_name,
                    ns_users.last_name AS best_practice_last_name,
                    ns_roles.label AS best_practice_role,
                    ns_companies.name AS best_practice_company,
                    ns_companies.thumbnail AS best_practice_company_thumbnail
                FROM 
                    ns_benefits
                INNER JOIN ns_bestpractices ON ns_benefits.uuid = ns_bestpractices.benefit
                INNER JOIN ns_users ON ns_bestpractices.user = ns_users.id
                INNER JOIN ns_companies ON ns_bestpractices.company = ns_companies.id
                INNER JOIN ns_roles ON ns_users.role = ns_roles.id
                WHERE ns_benefits.linked_benefit = ?
                AND ns_bestpractices.public = 1 AND ns_bestpractices.status = 'published'
                AND ns_companies.status = 'active'
                AND ns_bestpractices.benefit != ?
            `;
            const bestPractices = await dbQuery(bestPracticesQuery, [benefit.linked_benefit, uuid]);
            benefit.best_practices = bestPractices;
        }
        
        Object.assign(req, { benefit });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateBenefitCreation = async (req, res, next) => {
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
        notes 
    } = req.body;

    if (!title) {
        return res.status(403).json({ error: 'Vul een titel in' })
    }
    if (!theme) {
        return res.status(403).json({ error: 'Vul een thema in' })
    }
    if (entities.length === 0) {
        return res.status(403).json({ error: 'Geef minimaal één entiteit op' })
    }
    if (!status) {
        return res.status(403).json({ error: 'Geef een status mee' })
    }
    if (!target_group) {
        return res.status(403).json({ error: 'Geef een doelgroep mee' })
    }
    if (!description) {
        return res.status(403).json({ error: 'Vul een beschrijving in' })
    }
  	if (!implementation) {
        return res.status(403).json({ error: 'Vul de implementatie in' })
    }
  	if (!linked_benefit) {
        return res.status(403).json({ error: 'Koppel aan een arbeidsvoorwaarde' })
    }
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            return res.status(403).json({ error: 'Je kunt geen arbeidsvoorwaarden aanmaken' });
        }
        const userName = userInfo[0].first_name + ' ' + userInfo[0].last_name;
        const userRole = userInfo[0].role;
        Object.assign(req, { 
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
            notes,
            userName,
            userRole
        });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateUpdateBenefit = async (req, res, next) => {
    const userId = req.user.id;
    const { uuid } = req.params;
    if (!uuid) {
        return res.status(403).json({ error: 'Geef benefit uuid mee' });
    }
    if (req.route.path === '/:uuid/general') {
        if (!req.body.status) {
            return res.status(403).json({ error: 'Geef een status mee' });
        }
    }
    if (req.route.path === '/:uuid/description') {
        if (!req.body.description) {
            return res.status(403).json({ error: 'Geef een beschrijving mee' });
        }
    }
    if (req.route.path === '/:uuid/financial') {
        if (!req.body.price_per_year) {
            return res.status(403).json({ error: 'Geef een prijs per jaar mee' });
        }
    }
    if (req.route.path === '/:uuid/implementation') {
        if (!req.body.implementation) {
            return res.status(403).json({ error: 'Vul een implementatie in' });
        }
    }
    if (req.route.path === '/:uuid/strategic') {
        if (!req.body.purpose) {
            return res.status(403).json({ error: 'Manier van implementatie is verplicht' });
        }
    }
    try {
        const benefit = await dbQuery('SELECT * FROM ns_benefits WHERE uuid = ?', [uuid]);
        if (!benefit.length) {
            return res.status(404).json({ error: 'Geen arbeidsvoorwaarde gevonden' });
        }
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, benefit[0].company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen arbeidsvoorwaarden bewerken voor dit bedrijf' });
            }
        }
        Object.assign(req, { data: req.body, user: userInfo[0].first_name + ' ' + userInfo[0].last_name, userRole: userInfo[0].role, benefit: benefit[0] });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateDeleteBenefit = async (req, res, next) => {
    const userId = req.user.id;
    const { uuid } = req.params;
    if (!uuid) {
        return res.status(403).json({ error: 'Geef benefit uuid mee' });
    }
    try {
        const benefit = await dbQuery('SELECT * FROM ns_benefits WHERE uuid = ?', [uuid]);
        if (!benefit.length) {
            return res.status(404).json({ error: 'Geen arbeidsvoorwaarde gevonden' });
        }
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, benefit[0].company]);
            if (userCompanies.length === 0 || userCompanies[0].role !== 2) {
                return res.status(403).json({ error: 'Je kunt geen arbeidsvoorwaarden verwijderen voor dit bedrijf' });
            }
        }
        Object.assign(req, { data: req.body, user: userInfo[0].first_name + ' ' + userInfo[0].last_name, userRole: userInfo[0].role, benefit: benefit[0] });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateGetDocument = async (req, res, next) => {
    const { filename } = req.body;
    const userId = req.user.id;
    try {
        const userInfo = await dbQuery('SELECT * FROM ns_users WHERE id = ?', [userId]);
        if (userInfo[0].role !== 1) {
            const fileCompany = await dbQuery('SELECT * FROM ns_benefits WHERE document = ?', [filename]);
            if (fileCompany.length === 0) {
                return res.status(404).json({ error: 'Bestand niet gevonden' });
            }
            const userCompanies = await dbQuery('SELECT * FROM ns_user_company WHERE user = ? AND company = ?', [userId, fileCompany[0].company]);
            if (userCompanies.length === 0) {
                return res.status(403).json({ error: 'Je kunt geen documenten bekijken voor dit bedrijf' });
            }
        }

        Object.assign(req, { filename });
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = { validateUserCompanyBenefits, validateUserCompany, validateBenefitCreation, validateUpdateBenefit, validateDeleteBenefit, validateGetDocument };