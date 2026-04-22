const { dbQuery } = require('../../helpers/helper');
const db = require('../../models/db');

const mapImpl = (row, codes) => ({
    id: row.id,
    benefitId: row.benefit_id,
    title: row.title,
    implementation: row.implementation,
    sortOrder: row.sort_order,
    codes: codes.map(c => ({
        id: c.id,
        code: c.code,
        sectorName: c.sector_name,
    })),
});

const listImplementations = async (req, res) => {
    const benefitId = req.benefitId;
    try {
        const [modeRows, impls] = await Promise.all([
            dbQuery('SELECT implementation_mode FROM ns_benefits WHERE id = ?', [benefitId]),
            dbQuery(
                'SELECT * FROM ns_benefit_implementations WHERE benefit_id = ? ORDER BY sort_order ASC',
                [benefitId]
            ),
        ]);

        let codes = [];
        if (impls.length > 0) {
            const ids = impls.map(r => r.id);
            codes = await dbQuery(
                `SELECT ic.implementation_id, sc.id, sc.code, sc.sector_name, ic.sort_order
                 FROM ns_benefit_implementation_codes ic
                 JOIN ns_administration_sector_codes sc ON ic.sector_code_id = sc.id
                 WHERE ic.implementation_id IN (${ids.map(() => '?').join(',')})
                   AND ic.sector_code_id IS NOT NULL
                 ORDER BY ic.sort_order ASC`,
                ids
            );
        }

        const codesByImplId = {};
        for (const c of codes) {
            if (!codesByImplId[c.implementation_id]) codesByImplId[c.implementation_id] = [];
            codesByImplId[c.implementation_id].push(c);
        }

        return res.json({
            benefitId,
            mode: modeRows[0].implementation_mode,
            implementations: impls.map(r => mapImpl(r, codesByImplId[r.id] || [])),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const updateMode = async (req, res) => {
    const { mode } = req.body;
    const benefitId = req.benefitId;
    try {
        await dbQuery('UPDATE ns_benefits SET implementation_mode = ? WHERE id = ?', [mode, benefitId]);
        return res.json({ benefitId, mode });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const upsertSectorCode = async (conn, companyId, code, sectorName) => {
    const [result] = await conn.query(
        `INSERT INTO ns_administration_sector_codes (administration_id, code, sector_name)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id),
           sector_name = COALESCE(VALUES(sector_name), sector_name)`,
        [companyId, code, sectorName ?? null]
    );
    return result.insertId;
};

const createImplementation = async (req, res) => {
    const { title = null, implementation = null, codes = [] } = req.body;
    const benefitId = req.benefitId;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[benefit]] = await conn.query('SELECT company FROM ns_benefits WHERE id = ?', [benefitId]);
        const companyId = benefit.company;

        const [[maxRow]] = await conn.query(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM ns_benefit_implementations WHERE benefit_id = ?',
            [benefitId]
        );
        const sortOrder = maxRow.next_order;

        const [implResult] = await conn.query(
            'INSERT INTO ns_benefit_implementations (benefit_id, title, implementation, sort_order) VALUES (?, ?, ?, ?)',
            [benefitId, title, implementation, sortOrder]
        );
        const implId = implResult.insertId;

        const insertedCodes = [];
        for (let i = 0; i < codes.length; i++) {
            const { code, sectorName = null } = codes[i];
            const sectorCodeId = await upsertSectorCode(conn, companyId, code, sectorName);
            await conn.query(
                'INSERT INTO ns_benefit_implementation_codes (implementation_id, sector_code_id, code, sort_order) VALUES (?, ?, ?, ?)',
                [implId, sectorCodeId, code, i]
            );
            insertedCodes.push({ id: sectorCodeId, code, sector_name: sectorName });
        }

        await conn.commit();

        return res.status(201).json(mapImpl(
            { id: implId, benefit_id: benefitId, title, implementation, sort_order: sortOrder },
            insertedCodes
        ));
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    } finally {
        conn.release();
    }
};

const updateImplementation = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { title, implementation, codes } = req.body;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[existing]] = await conn.query(
            'SELECT * FROM ns_benefit_implementations WHERE id = ?',
            [id]
        );
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Implementatie niet gevonden' });
        }

        const newTitle = title !== undefined ? title : existing.title;
        const newImpl = implementation !== undefined ? implementation : existing.implementation;

        await conn.query(
            'UPDATE ns_benefit_implementations SET title = ?, implementation = ? WHERE id = ?',
            [newTitle, newImpl, id]
        );

        let finalCodes;
        if (codes !== undefined) {
            const [[benefit]] = await conn.query('SELECT company FROM ns_benefits WHERE id = ?', [existing.benefit_id]);
            const companyId = benefit.company;

            await conn.query('DELETE FROM ns_benefit_implementation_codes WHERE implementation_id = ?', [id]);

            finalCodes = [];
            for (let i = 0; i < codes.length; i++) {
                const { code, sectorName = null } = codes[i];
                const sectorCodeId = await upsertSectorCode(conn, companyId, code, sectorName);
                await conn.query(
                    'INSERT INTO ns_benefit_implementation_codes (implementation_id, sector_code_id, code, sort_order) VALUES (?, ?, ?, ?)',
                    [id, sectorCodeId, code, i]
                );
                finalCodes.push({ id: sectorCodeId, code, sector_name: sectorName });
            }
        } else {
            const [rows] = await conn.query(
                `SELECT ic.implementation_id, sc.id, sc.code, sc.sector_name, ic.sort_order
                 FROM ns_benefit_implementation_codes ic
                 JOIN ns_administration_sector_codes sc ON ic.sector_code_id = sc.id
                 WHERE ic.implementation_id = ? AND ic.sector_code_id IS NOT NULL
                 ORDER BY ic.sort_order ASC`,
                [id]
            );
            finalCodes = rows;
        }

        await conn.commit();

        return res.json(mapImpl(
            { id, benefit_id: existing.benefit_id, title: newTitle, implementation: newImpl, sort_order: existing.sort_order },
            finalCodes
        ));
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    } finally {
        conn.release();
    }
};

const deleteImplementation = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const rows = await dbQuery('SELECT id FROM ns_benefit_implementations WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Implementatie niet gevonden' });
        }
        await dbQuery('DELETE FROM ns_benefit_implementations WHERE id = ?', [id]);
        return res.status(204).send();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getSectorCodes = async (req, res) => {
    const administrationId = req.administrationId;
    try {
        const codes = await dbQuery(
            'SELECT id, code, sector_name FROM ns_administration_sector_codes WHERE administration_id = ? ORDER BY code ASC',
            [administrationId]
        );
        return res.json({
            administrationId,
            sectorCodes: codes.map(c => ({
                id: c.id,
                code: c.code,
                sectorName: c.sector_name,
            })),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listImplementations, updateMode, createImplementation, updateImplementation, deleteImplementation, getSectorCodes };
