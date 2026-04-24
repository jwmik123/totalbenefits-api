const { dbQuery } = require('../../helpers/helper');
const db = require('../../models/db');
const { invalidateAllInsights } = require('../../services/benchmark-data');

const getMembersForGroup = async (groupId) => {
    return dbQuery(
        `SELECT b.id, b.name AS title
         FROM ns_branch_group_members m
         INNER JOIN ns_branches b ON b.id = m.branch_id
         WHERE m.group_id = ?
         ORDER BY b.name ASC`,
        [groupId]
    );
};

const getGroupWithMembers = async (groupId) => {
    const [group] = await dbQuery(
        'SELECT id, name, description FROM ns_branch_groups WHERE id = ?',
        [groupId]
    );
    if (!group) return null;
    const branches = await getMembersForGroup(groupId);
    return { ...group, branches };
};

const listBranchGroups = async (req, res) => {
    try {
        const groups = await dbQuery(
            'SELECT id, name, description FROM ns_branch_groups ORDER BY name ASC'
        );
        const result = await Promise.all(
            groups.map(async (g) => {
                const branches = await getMembersForGroup(g.id);
                return { ...g, branches };
            })
        );
        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const getBranchGroup = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const group = await getGroupWithMembers(id);
        if (!group) return res.status(404).json({ error: 'Branchegroep niet gevonden' });
        return res.json(group);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

const createBranchGroup = async (req, res) => {
    const { name, description = null, branch_ids = [] } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Naam is verplicht' });
    }
    if (!Array.isArray(branch_ids)) {
        return res.status(400).json({ error: 'branch_ids moet een array zijn' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query(
            'INSERT INTO ns_branch_groups (name, description) VALUES (?, ?)',
            [name.trim(), description]
        );
        const groupId = result.insertId;
        for (const branchId of branch_ids) {
            await conn.query(
                'INSERT INTO ns_branch_group_members (group_id, branch_id) VALUES (?, ?)',
                [groupId, branchId]
            );
        }
        await conn.commit();
        await invalidateAllInsights();
        const group = await getGroupWithMembers(groupId);
        return res.status(201).json(group);
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    } finally {
        conn.release();
    }
};

const updateBranchGroup = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, description = null, branch_ids = [] } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Naam is verplicht' });
    }
    if (!Array.isArray(branch_ids)) {
        return res.status(400).json({ error: 'branch_ids moet een array zijn' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [[existing]] = await conn.query(
            'SELECT id FROM ns_branch_groups WHERE id = ?',
            [id]
        );
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Branchegroep niet gevonden' });
        }
        await conn.query(
            'UPDATE ns_branch_groups SET name = ?, description = ? WHERE id = ?',
            [name.trim(), description, id]
        );
        await conn.query(
            'DELETE FROM ns_branch_group_members WHERE group_id = ?',
            [id]
        );
        for (const branchId of branch_ids) {
            await conn.query(
                'INSERT INTO ns_branch_group_members (group_id, branch_id) VALUES (?, ?)',
                [id, branchId]
            );
        }
        await conn.commit();
        await invalidateAllInsights();
        const group = await getGroupWithMembers(id);
        return res.json(group);
    } catch (err) {
        await conn.rollback();
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    } finally {
        conn.release();
    }
};

const deleteBranchGroup = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const [existing] = await dbQuery(
            'SELECT id FROM ns_branch_groups WHERE id = ?',
            [id]
        );
        if (!existing) return res.status(404).json({ error: 'Branchegroep niet gevonden' });
        await dbQuery('DELETE FROM ns_branch_group_members WHERE group_id = ?', [id]);
        await dbQuery('DELETE FROM ns_branch_groups WHERE id = ?', [id]);
        await invalidateAllInsights();
        return res.status(204).send();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database query error' });
    }
};

module.exports = {
    listBranchGroups,
    getBranchGroup,
    createBranchGroup,
    updateBranchGroup,
    deleteBranchGroup,
};
