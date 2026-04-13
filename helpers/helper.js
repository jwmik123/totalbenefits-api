const db = require('../models/db'); // This is your pool.promise()

// Helper function to handle database queries
const dbQuery = async (query, params) => {
    try {
        const [results] = await db.query(query, params);
        return results;
    } catch (err) {
        throw err;
    }
};

// Helper function to generate a unique 6-digit numeric access token
const generateAccessToken = async (surveyId) => {
    let accessToken;
    let isUnique = false;
    const characters = '0123456789'; // Numeric characters only

    while (!isUnique) {
        accessToken = '';
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            accessToken += characters[randomIndex];
        }

        // Check if the combination of survey and access_token already exists in the database
        const checkQuery = `
            SELECT 1 FROM ns_employee_surveys 
            WHERE survey = ? AND access_token = ? 
            LIMIT 1
        `;
        const existing = await dbQuery(checkQuery, [surveyId, accessToken]);

        if (existing.length === 0) {
            isUnique = true; // Token is unique for this survey, proceed
        }
    }

    return accessToken;
};

module.exports = { dbQuery, generateAccessToken };

