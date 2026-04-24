const { dbQuery } = require('../../helpers/helper');
const { get } = require('../../routes/auth');
const { invalidateCompanyInsights } = require('../../services/benchmark-data');

const listCompanies = async (req, res) => {
    const userId = req.user.id;
    const role = req.role;

    let sqlQuery;
    let params = [];

    if (role === 1) {
        sqlQuery = 'SELECT *, "super_admin" AS role FROM ns_companies';
    } else {
        sqlQuery = `
            SELECT c.*, r.key_name AS role
            FROM ns_companies c
            INNER JOIN ns_user_company uc ON uc.company = c.id
            INNER JOIN ns_roles r ON uc.role = r.id
            WHERE uc.user = ?
        `;
        params = [userId];
    }

    try {
        const results = await dbQuery(sqlQuery, params);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createCompany = async (req, res) => {
    const { name, logo, thumbnail, branche, subbranche } = req.body;
    const sqlCompany = 'INSERT INTO ns_companies (name, logo, thumbnail, branche, subbranche) VALUES (?, ?, ?, ?, ?)';
    const sqlProfile = 'INSERT INTO ns_companyprofiles (company_id) VALUES (?)';
    const values = [name, logo, thumbnail, branche, subbranche || null];
    try {
        const result = await dbQuery(sqlCompany, values);
        const newCompanyId = result.insertId || result.id;
        await dbQuery(sqlProfile, [newCompanyId]);
        return res.json({ 
            id: newCompanyId, 
            name, 
            logo, 
            branche, 
            subbranche,
            message: 'Bedrijf succesvol aangemaakt' 
        });
    } catch (err) {
        console.error("Fout bij aanmaken company/profiel:", err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getCompany = async (req, res) => {
    const id = req.params.id;
    var sqlQuery = 'SELECT * FROM ns_companies WHERE id = ?';
    try {
        const results = await dbQuery(sqlQuery, [id]);
        return res.json(results[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const updateCompany = async (req, res) => {
    const id = req.params.id;
    const { name, logo, thumbnail, branche, subbranche } = req.body;
    const sqlQuery = 'UPDATE ns_companies SET name = ?, logo = ?, thumbnail = ?, branche = ?, subbranche = ? WHERE id = ?';
    const values = [name, logo, thumbnail, branche, subbranche || null, id];
    console.log(values);
    try {
        const result = await dbQuery(sqlQuery, values);
        await invalidateCompanyInsights(id);
        return res.json({ id: result.id, name, logo, thumbnail, branche, subbranche });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getProfileOptions = async (req, res) => {
    const id = req.params.id;

    // Definieer alle queries
    const sqlQueries = {
        branches: 'SELECT id, name AS title FROM ns_branches',
        entities: `
            SELECT 
                e.id, 
                e.name AS title, 
                COUNT(b.id) AS benefit_count
            FROM ns_entities e
            LEFT JOIN ns_benefits b ON JSON_CONTAINS(b.entities, CAST(e.id AS JSON), '$')
            WHERE e.company = ?
            GROUP BY e.id
        `,
        caos: 'SELECT * FROM ns_caos',
        communication_channels: 'SELECT * FROM ns_communication_channels',
        employee_groups: 'SELECT * FROM ns_employee_groups',
        internal_hr_channels: 'SELECT * FROM ns_hr_channels',
        languages: 'SELECT id, label AS title FROM ns_languages',
        core_values: 'SELECT id, name AS title FROM ns_corevalues',
        sdgs: 'SELECT id, name AS title FROM ns_sdgs'
    };

    try {
        // Voer alle queries parallel uit voor betere performance
        const [
            branches,
            entities,
            caos,
            communication_channels,
            employee_groups,
            internal_hr_channels,
            languages,
            core_values,
            sdgs
        ] = await Promise.all([
            dbQuery(sqlQueries.branches),
            dbQuery(sqlQueries.entities, [id]),
            dbQuery(sqlQueries.caos),
            dbQuery(sqlQueries.communication_channels),
            dbQuery(sqlQueries.employee_groups),
            dbQuery(sqlQueries.internal_hr_channels),
            dbQuery(sqlQueries.languages),
            dbQuery(sqlQueries.core_values),
            dbQuery(sqlQueries.sdgs)
        ]);

        // Stuur het gecombineerde resultaat terug
        return res.json({
            branches,
            entities,
            caos,
            communication_channels,
            employee_groups,
            internal_hr_channels,
            languages,
            core_values,
            sdgs
        });

    } catch (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ 
            message: 'Er is een fout opgetreden bij het ophalen van de profielopties.' 
        });
    }
};

const getCompanyProfile = async (req, res) => {
    const id = req.params.id;
    const sqlQuery = `SELECT * FROM ns_companyprofiles WHERE company = ?`;
    try {
        const results = await dbQuery(sqlQuery, [id]);
        return res.json(results[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' }); 
    }
};

const saveCompanyProfile = async (req, res) => {
    const id = req.params.id;
    const { 
        address, 
        founding_year, 
        branche, 
        locations, 
        entities, 
        works_council, 
        contact, 
        caos,
        outside_cao,
        communication_channels,
        employee_count,
        average_age,
        employee_groups,
        percentage_fulltime,
        percentage_permanent_contracts,
        flexible_contracts,
        inflow_fte,
        outflow_fte,
        benefits_budget,
        total_payroll,
        recruitment_costs,
        hr_channel,
        languages,
        openness,
        communication_difficulty,
        communication_questions,
        communication_share,
        strategy_core_values,
        strategy_leading_values,
        sdgs,
        friction,
        recruitment_problems,
        engagement,
        kpi_process,
        kpi_absence
    } = req.body;

    if (!address) {
        return res.status(403).json({ error: 'Vul een adres in' })
    }
    if (!founding_year) {
        return res.status(403).json({ error: 'Vul een oprichtingsjaar in' })
    }
    if (!branche || !Array.isArray(branche) || branche.length === 0) {
        return res.status(403).json({ error: 'Vul een branche in' })
    }
    if (locations.length === 0) {
        return res.status(403).json({ error: 'Geef minimaal één locatie op' })
    }
    if (entities.length === 0) {
        return res.status(403).json({ error: 'Geef minimaal één entiteit op' })
    }

    const sqlQuery = 'UPDATE ns_companyprofiles SET address = ?, founding_year = ?, branche = ?, locations = ?, entities = ?, works_council = ?, contact = ?, caos = ?, outside_cao = ?, communication_channels = ?, employee_count = ?, average_age = ?, employee_groups = ?, percentage_fulltime = ?, percentage_permanent_contracts = ?, flexible_contracts = ?, inflow_fte = ?, outflow_fte = ?, benefits_budget = ?, total_payroll = ?, recruitment_costs = ?, hr_channel = ?, languages = ?, openness = ?, communication_difficulty = ?, communication_questions = ?, communication_share = ?, strategy_core_values = ?, strategy_leading_values = ?, sdgs = ?, friction = ?, recruitment_problems = ?, engagement = ?, kpi_process = ?, kpi_absence = ? WHERE company = ?';
    const values = [address, founding_year, JSON.stringify(branche), JSON.stringify(locations), JSON.stringify(entities), works_council, contact, JSON.stringify(caos), outside_cao, JSON.stringify(communication_channels), employee_count, average_age, JSON.stringify(employee_groups), percentage_fulltime, percentage_permanent_contracts, flexible_contracts, inflow_fte, outflow_fte, benefits_budget, total_payroll, recruitment_costs, hr_channel, JSON.stringify(languages), openness, communication_difficulty, communication_questions, communication_share, JSON.stringify(strategy_core_values), JSON.stringify(strategy_leading_values), JSON.stringify(sdgs), friction, recruitment_problems, engagement, kpi_process, kpi_absence, id];
    try {
        const result = await dbQuery(sqlQuery, values);
        await invalidateCompanyInsights(id);
        return res.json({
            message: 'Bedrijfsprofiel is opgeslagen',
            data: {
                id: result.id, 
                address,
                founding_year,
                branche,
                locations,
                entities,
                works_council,
                contact,
                caos,
                outside_cao,
                communication_channels,
                employee_count,
                average_age,
                employee_groups,
                percentage_fulltime,
                percentage_permanent_contracts,
                flexible_contracts,
                inflow_fte,
                outflow_fte,
                benefits_budget,
                total_payroll,
                recruitment_costs,
                hr_channel,
                languages,
                openness,
                communication_difficulty,
                communication_questions,
                communication_share,
                strategy_core_values,
                strategy_leading_values,
                sdgs,
                friction,
                recruitment_problems,
                engagement,
                kpi_process,
                kpi_absence
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listCompanies, createCompany, getCompany, updateCompany, getProfileOptions, getCompanyProfile, saveCompanyProfile };
