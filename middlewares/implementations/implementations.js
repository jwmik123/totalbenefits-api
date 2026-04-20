const { dbQuery } = require('../../helpers/helper');

const requireAdmin = async (req, res, next) => {
    try {
        const [user] = await dbQuery('SELECT role FROM ns_users WHERE id = ?', [req.user.id]);
        if (!user || user.role !== 1) {
            return res.status(403).json({ error: 'Je hebt geen toegang tot deze actie' });
        }
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateBenefitId = async (req, res, next) => {
    const benefitId = req.query.benefitId || req.body.benefitId;
    const id = parseInt(benefitId, 10);
    if (!id || id <= 0) {
        return res.status(400).json({ error: 'benefitId is verplicht en moet een positief getal zijn' });
    }
    try {
        const rows = await dbQuery('SELECT id FROM ns_benefits WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Arbeidsvoorwaarde niet gevonden' });
        }
        req.benefitId = id;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const validateMode = (req, res, next) => {
    const { mode } = req.body;
    if (mode !== 'single' && mode !== 'multiple') {
        return res.status(400).json({ error: 'Modus moet "single" of "multiple" zijn' });
    }
    next();
};

const validateImplId = (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (!id || id <= 0) {
        return res.status(400).json({ error: 'Ongeldig id opgegeven' });
    }
    next();
};

const validateImplBody = (req, res, next) => {
    const { title, implementation, codes } = req.body;

    if (title !== undefined && title !== null) {
        const trimmed = String(title).trim();
        if (trimmed.length > 255) {
            return res.status(400).json({ error: 'Titel mag maximaal 255 tekens bevatten' });
        }
        req.body.title = trimmed;
    }

    if (implementation !== undefined && implementation !== null && typeof implementation !== 'string') {
        return res.status(400).json({ error: 'Uitvoering moet een tekstveld zijn' });
    }

    if (codes !== undefined) {
        if (!Array.isArray(codes)) {
            return res.status(400).json({ error: 'Codes moet een array zijn' });
        }
        for (const c of codes) {
            if (!c.code || typeof c.code !== 'string' || c.code.length > 50) {
                return res.status(400).json({ error: 'Elke code moet een string zijn van maximaal 50 tekens' });
            }
            if (c.sectorName !== undefined && c.sectorName !== null) {
                if (typeof c.sectorName !== 'string' || c.sectorName.length > 255) {
                    return res.status(400).json({ error: 'Sectornaam mag maximaal 255 tekens bevatten' });
                }
            }
        }
        const seen = new Set();
        for (const c of codes) {
            if (seen.has(c.code)) {
                return res.status(400).json({ error: `Dubbele code "${c.code}" in het verzoek` });
            }
            seen.add(c.code);
        }
    }

    next();
};

module.exports = { requireAdmin, validateBenefitId, validateMode, validateImplId, validateImplBody };
