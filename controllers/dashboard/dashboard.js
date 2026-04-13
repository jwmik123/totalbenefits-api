const { dbQuery } = require('../../helpers/helper');

const toStatusKey = (label) =>
    label
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

const getDashboardInfo = async (req, res) => {
    const company = req.company;

    const sqlQueryStatuses = `
        SELECT 
            id,
            label,
            color,
            icon
        FROM ns_benefit_statuses
    `;

    const sqlQueryBenefits = `
        SELECT 
        ns_benefits.*,
        ns_themes.key_name AS theme_key_name,
        ns_themes.name AS theme_name
        FROM ns_benefits
        INNER JOIN ns_themes ON ns_themes.id = ns_benefits.theme
        WHERE ns_benefits.company = ?
    `;

    const sqlQueryEmployees = `
        SELECT * 
        FROM ns_employees 
        WHERE company = ? 
          AND status = "active"
    `;

    const sqlQueryBenefitsDatabase = `
        SELECT title, uuid
        FROM ns_bd_benefits
        ORDER BY RAND()
        LIMIT 10
    `;

    try {
        const [statuses, benefits, employees, benefitsDatabase] = await Promise.all([
            dbQuery(sqlQueryStatuses),
            dbQuery(sqlQueryBenefits, [company]),
            dbQuery(sqlQueryEmployees, [company]),
            dbQuery(sqlQueryBenefitsDatabase)
        ]);

        const benefitsByStatus = {};
        const statusIdToKeyMap = {};

        // Init alle statussen
        statuses.forEach(status => {
            const key = toStatusKey(status.label);

            statusIdToKeyMap[status.id] = key;

            benefitsByStatus[key] = {
                status_id: status.id,
                label: status.label,
                icon: status.icon,
                color: status.color,
                benefit_count: 0
            };
        });

        // Tel benefits per status
        benefits.forEach(benefit => {
            const key = statusIdToKeyMap[benefit.status];
            if (key && benefitsByStatus[key]) {
                benefitsByStatus[key].benefit_count += 1;
            }
        });

        const themeInfoMap = {};

        benefits.forEach(benefit => {
            if (benefit.status !== '3') return;
            const themeKey = benefit.theme_key_name;

            if (!themeInfoMap[themeKey]) {
                themeInfoMap[themeKey] = {
                    label: benefit.theme_name,
                    total_price_per_year: 0
                };
            }

            const price = benefit.price_per_year ?? 0;
            themeInfoMap[themeKey].total_price_per_year += Number(price);
        });

        // map → array
        const themeInfo = Object.values(themeInfoMap);


        // statusId → status metadata
        const statusMetaMap = {};
        statuses.forEach(status => {
            statusMetaMap[status.id] = {
                label: status.label,
                color: status.color
            };
        });


        const statusInfoMap = {};

        statuses.forEach(status => {
            statusInfoMap[status.id] = {
                label: status.label,
                color: status.color,
                total_price_per_year: 0
            };
        });

        // Tel bedragen per status
        benefits.forEach(benefit => {
            const statusId = benefit.status;

            if (!statusInfoMap[statusId]) return;

            const price = benefit.price_per_year ?? 0;
            statusInfoMap[statusId].total_price_per_year += Number(price);
        });

        // map → array
        const statusInfo = Object.values(statusInfoMap);




        const results = {
            benefitsByStatus,
            themeInfo,
            statusInfo,
            employees: employees.length,
            benefits_database: benefitsDatabase
        };

        return res.json(results);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};



const getDashboardThemeScores = async (req, res) => {
    const company = req.company;

    const sqlQuery = `
        SELECT
            ns_surveys.id,
            ns_surveys.sent,
            ns_employee_surveys.id AS employee_survey_id,
            ns_employee_surveys.survey AS survey_id,
            ns_employee_surveys.submitted_at AS employee_survey_submitted_at,
            ns_questions_themes.survey AS questions_themes_survey,
            ns_questions_themes.theme AS questions_themes_theme,
            ns_questions_themes.selected,
            ns_questions_themes.budget,
            ns_themes.id AS theme_id,
            ns_themes.name AS theme_name
        FROM ns_surveys
        INNER JOIN ns_employee_surveys ON ns_surveys.id = ns_employee_surveys.survey
        INNER JOIN ns_questions_themes ON ns_questions_themes.survey = ns_surveys.id
        INNER JOIN ns_themes ON ns_themes.id = ns_questions_themes.theme
        WHERE ns_surveys.company = ?
        AND ns_surveys.sent IS NOT NULL
        AND ns_employee_surveys.submitted_at IS NOT NULL
    `;

    const values = [company];

    try {
        const result = await dbQuery(sqlQuery, values);

        // Unieke surveys tellen
        const uniqueSurveyIds = new Set(result.map(row => row.employee_survey_id));
        const total_submitted_surveys = uniqueSurveyIds.size;

        // Groeperen per thema
        const themesMap = new Map();

        for (const row of result) {
            const themeId = row.theme_id;

            if (!themesMap.has(themeId)) {
                themesMap.set(themeId, {
                    theme_id: themeId,
                    theme_name: row.theme_name,
                    total_selected: 0,
                    total_budget: 0,
                    budget_count: 0
                });
            }

            const themeData = themesMap.get(themeId);

            if (row.selected) {
                themeData.total_selected += 1;
            }

            if (typeof row.budget === 'number') {
                themeData.total_budget += row.budget;
                themeData.budget_count += 1;
            }
        }

        // Omzetten naar array en gemiddelde berekenen
        const data = Array.from(themesMap.values()).map(theme => ({
            theme_id: theme.theme_id,
            theme_name: theme.theme_name,
            total_selected: theme.total_selected,
            selected_percentage: total_submitted_surveys > 0
                ? Math.round((theme.total_selected / total_submitted_surveys) * 100)
                : 0,
            average_budget: theme.budget_count > 0
                ? Math.round(theme.total_budget / theme.budget_count)
                : 0
        }));

        return res.json({
            total_submitted_surveys,
            data
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { getDashboardInfo, getDashboardThemeScores };