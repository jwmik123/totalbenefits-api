const { dbQuery } = require('../../helpers/helper');

const listFavorites = async (req, res) => {
    const company = req.params.company;
    const userId = req.user.id; // De ID van de ingelogde gebruiker
    
    const sqlQuery = `
    SELECT 
        ns_bd_likes.*, 
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        s.label AS status_label,
        s.color AS status_color,
        b.title AS benefit_title,
        b.uuid AS benefit_uuid,
        -- Check of de huidige user dit item heeft geliket (geeft 1 of 0)
        EXISTS (
            SELECT 1 
            FROM ns_bd_likes_liked 
            WHERE bd_like = ns_bd_likes.id AND user = ?
        ) AS liked,
        (
            SELECT COALESCE(
                JSON_ARRAYAGG(CONCAT(lu.first_name, ' ', lu.last_name)), 
                JSON_ARRAY()
            )
            FROM ns_bd_likes_liked lk
            INNER JOIN ns_users lu ON lk.user = lu.id
            WHERE lk.bd_like = ns_bd_likes.id
        ) AS liked_by_users,
        (
            SELECT COALESCE(
                JSON_ARRAYAGG(t.value), 
                JSON_ARRAY()
            )
            FROM ns_bd_themes t
            WHERE JSON_CONTAINS(b.themes, CAST(t.id AS JSON), '$')
        ) AS themes
    FROM ns_bd_likes
    INNER JOIN ns_users u ON ns_bd_likes.user = u.id
    INNER JOIN ns_bd_likes_statuses s ON ns_bd_likes.status = s.id
    INNER JOIN ns_bd_benefits b ON ns_bd_likes.benefit = b.id
    WHERE ns_bd_likes.company = ?`;

    try {
        // Let op: userId eerst, dan company (volgorde van de ? in de query)
        const results = await dbQuery(sqlQuery, [userId, company]);
        
        const formattedResults = results.map(row => {
            const parseJsonField = (field) => {
                if (typeof field === 'string') {
                    try { return JSON.parse(field); } catch (e) { return []; }
                }
                return field || [];
            };

            return {
                ...row,
                // MySQL EXISTS geeft 1 of 0 terug, wat we hier behouden
                liked_by_users: parseJsonField(row.liked_by_users),
                themes: parseJsonField(row.themes)
            };
        });
        
        return res.json(formattedResults);
    } catch (err) {
        console.error('Fout bij ophalen favorites:', err);
        return res.status(500).json({ 
            message: 'Database query error', 
            error: err.message 
        });
    }
};
const getStatusOptions = async (req, res) => {
    try {
        const results = await dbQuery('SELECT * FROM ns_bd_likes_statuses');
        console.log('Status opties opgehaald:', results);
        return res.json(results);
    } catch (err) {
        console.error('Fout bij ophalen favorites:', err);
        return res.status(500).json({ 
            message: 'Database query error', 
            error: err.message 
        });
    }
};

const likeFavorite = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    try {
        const existing = await dbQuery('SELECT * FROM ns_bd_likes_liked WHERE bd_like = ? AND user = ?', [id, userId]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Je hebt deze arbeidsvoorwaarde al geliked' });
        }
        const result = await dbQuery('INSERT INTO ns_bd_likes_liked (bd_like, user) VALUES (?, ?)', [id, userId]);
        return res.json({ message: 'Benefit geliked' });
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const dislikeFavorite = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    try {
        const existing = await dbQuery(
            'SELECT * FROM ns_bd_likes_liked WHERE bd_like = ? AND user = ?',
            [id, userId]
        );
        if (existing.length > 0) {
            const result = await dbQuery('DELETE FROM ns_bd_likes_liked WHERE bd_like = ? AND user = ?', [id, userId]);
            return res.json({ message: 'Benefit gedisliked' });
        } else {
            return res.status(400).json({ message: 'Deze like is niet door jou geplaatst, je kunt deze dus niet verwijderen' });
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const updateNote = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    const note = req.body.note;
    if (!note) {
        return res.status(400).json({ message: 'Opmerking is vereist' });
    }
    try {
        const existing = await dbQuery(
            'SELECT * FROM ns_bd_likes WHERE id = ? AND user = ?',
            [id, userId]
        );
        if (existing.length > 0) {
            const result = await dbQuery('UPDATE ns_bd_likes SET note = ? WHERE id = ?', [note, id]);
            return res.json({ message: 'Opmerking bijgewerkt' });
        } else {
            return res.status(400).json({ message: 'Je kunt de opmerking voor deze arbeidsvoorwaarde niet bijwerken' });
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const updateStatus = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    const status = req.body.status;
    if (!status) {
        return res.status(400).json({ message: 'Status is vereist' });
    }
    try {
        const existing = await dbQuery(
            'SELECT * FROM ns_bd_likes WHERE id = ? AND user = ?',
            [id, userId]
        );
        if (existing.length > 0) {
            const result = await dbQuery('UPDATE ns_bd_likes SET status = ? WHERE id = ?', [status, id]);
            return res.json({ message: 'Status bijgewerkt' });
        } else {
            return res.status(400).json({ message: 'Je kunt de status voor deze arbeidsvoorwaarde niet bijwerken' });
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

const deleteFavorite = async (req, res) => {
    const id = req.params.id;
    const userId = req.user.id;
    try {
        const existing = await dbQuery(
            'SELECT * FROM ns_bd_likes WHERE id = ? AND user = ?',
            [id, userId]
        );
        if (existing.length > 0) {
            const result = await dbQuery('DELETE FROM ns_bd_likes WHERE id = ? AND user = ?', [id, userId]);
            const deleteLikes = await dbQuery('DELETE FROM ns_bd_likes_liked WHERE bd_like = ?', [id]);
            return res.json({ message: 'Arbeidsvoorwaarde verwijderd uit favorieten' });
        } else {
            return res.status(400).json({ message: 'Deze arbeidsvoorwaarde is niet door jou in favorieten geplaatst, je kunt deze dus niet verwijderen' });
        }
    } catch (err) {
        console.error(err.response?.data || err.message);
        return res.status(500).json({ message: 'API call failed' });
    }
};

module.exports = { listFavorites, getStatusOptions, likeFavorite, dislikeFavorite, updateNote, updateStatus, deleteFavorite };