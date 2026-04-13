const { dbQuery } = require('../../helpers/helper');

const listSdgs = async (req, res) => {
    var sqlQuery = 'SELECT * FROM ns_sdgs';
    try {
        const results = await dbQuery(sqlQuery);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const createSdg = async (req, res) => {
    const { name } = req.body;
    const sqlQuery = `
        INSERT INTO ns_sdgs (name, order_value)
        VALUES (
            ?,
            COALESCE(
                (
                    SELECT MIN(t1.order_value + 1)
                    FROM ns_sdgs t1
                    LEFT JOIN ns_sdgs t2
                      ON t1.order_value + 1 = t2.order_value
                    WHERE t2.order_value IS NULL
                ),
                1
            )
        )
    `;
    const values = [name];
    try {
        const result = await dbQuery(sqlQuery, values);
        return res.json({
            id: result.insertId,
            name
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const deleteSdg = async (req, res) => {
    const { id } = req.params;

    const deleteQuery = 'DELETE FROM ns_sdgs WHERE id = ?';
    const reorderQuery = `
        UPDATE ns_sdgs s
        JOIN (
            SELECT id, ROW_NUMBER() OVER (ORDER BY order_value) AS new_order
            FROM ns_sdgs
        ) x ON x.id = s.id
        SET s.order_value = x.new_order
    `;

    try {
        // start transaction
        await dbQuery('START TRANSACTION');

        // delete record
        const result = await dbQuery(deleteQuery, [id]);

        if (result.affectedRows === 0) {
            await dbQuery('ROLLBACK');
            return res.status(404).json({ message: 'SDG not found' });
        }

        // reorder remaining rows
        await dbQuery(reorderQuery);

        // commit transaction
        await dbQuery('COMMIT');

        return res.json({ message: 'SDG is verwijderd' });

    } catch (err) {
        await dbQuery('ROLLBACK');
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

module.exports = { listSdgs, createSdg, deleteSdg };