const { dbQuery } = require('../../helpers/helper');

const listThemes = async (req, res) => {
    const { company, status } = req.params;

    // LEFT JOIN filter aanpassen op basis van status
    const sqlQuery = `
    SELECT 
        ns_themes.*, 
        ns_themes_templates.name AS template, 
        ns_benefits.theme AS benefit_theme, 
        ns_benefits.id AS benefit_id 
    FROM ns_themes 
    INNER JOIN ns_themes_templates 
        ON ns_themes_templates.key_name = ns_themes.key_name 
    LEFT JOIN ns_benefits 
        ON ns_themes.id = ns_benefits.theme
        ${status !== '0' ? 'AND ns_benefits.status = ?' : ''} 
    WHERE ns_themes.company = ?`;

    try {
        const params = status !== '0' ? [status, company] : [company];
        const result = await dbQuery(sqlQuery, params);

        const groupedResult = Object.values(
            result.reduce((acc, item) => {
                if (!acc[item.id]) {
                    const { benefit_id, ...rest } = item; // Remove benefit_id
                    acc[item.id] = { ...rest, benefit_count: 0 };
                }
                if (item.benefit_id) {
                    acc[item.id].benefit_count += 1;
                }
                return acc;
            }, {})
        );

        return res.json(groupedResult);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


const listTemplates = async (req, res) => {
    const sqlQuery = 'SELECT * FROM ns_themes_templates';
    try {
        const results = await dbQuery(sqlQuery);
        const templates = results.map(item => ({
            value: item.key_name,
            label: item.name,
            icon: item.icon
        }));
        return res.json(templates);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createTheme = async (req, res) => {
    const { key_name, name, company, icon } = req.body;
    const sqlQuery = 'INSERT INTO ns_themes (key_name, name, company, icon) VALUES (?, ?, ?, ?)';
    const values = [key_name, name, company, icon];
    try {
        const result = await dbQuery(sqlQuery, values);
        return res.json({ id: result.id, key_name, name, company, icon });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};


module.exports = { listThemes, listTemplates, createTheme };