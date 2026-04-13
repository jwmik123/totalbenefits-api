const { dbQuery, generateAccessToken } = require('../../helpers/helper');

//3rd party
const xlsx = require('xlsx');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const listEmployees = async (req, res) => {
    const status = req.status;
    const company = req.company;

    let sqlQuery = 'SELECT * FROM ns_employees WHERE company = ? ';
    
    if (status === 'active') {
        sqlQuery += 'AND status = "active" ';
    } else if (status === 'archived') {
        sqlQuery += 'AND status = "archived" ';
    } else if (status === 'all') {
        sqlQuery += 'AND status IN ("active", "archived") ';
    } else {
        return res.status(403).json({ message: 'Ongeldige status opgegeven' });
    }
    
    sqlQuery += 'ORDER BY first_name ASC';

    try {
        // Use dbQuery to execute the query and fetch results
        const results = await dbQuery(sqlQuery, [company]);
        return res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database query error' });
    }
};

const getEmployee = async (req, res) => {
    try {
        const employee = req.employee;
        return res.json(employee);
    } catch (error) {
        return res.status(500).json({
            message: 'Fout bij het ophalen medewerker',
            error: error.response?.data || error.message
        });
    }
};

const employeeImportTemplate = async (req, res) => {
    try {
        const excelData = [
            ['first_name', 'last_name', 'birthdate', 'email', 'gender'],
            ['Paul', 'Brink', '01-01-1990', 'paul@totalbenefits.nl', 'male'],
            ['Hans', 'Bakker', '01-01-1990', 'hans@totalbenefits.nl', 'male']
        ];
        return res.json(excelData);
    } catch (error) {
        return res.status(500).json({
            error: 'Er is iets misgegaan met het ophalen'
        });
    }
};

const validateImport = async (req, res) => {
    const company = req.company;
    let sqlQuery = 'SELECT * FROM ns_employees WHERE company = ? ';
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Geen bestand geüpload' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = await dbQuery(sqlQuery, [company]);
        const existingEmails = new Set(results.map(item => item.email));
        const excelEmails = new Set(excelData.map(item => item.email));

        const validateItem = (item) => {
            let birthdate = item.birthdate;
            if (typeof birthdate === 'number') {
                birthdate = moment.utc('1899-12-30').add(birthdate, 'days').format('YYYY-MM-DD');
            } else {
                birthdate = moment(birthdate, 'DD-MM-YYYY').format('YYYY-MM-DD');
            }
        
            const cleanedGender = (item.gender || '').toString().trim().toLowerCase();
            const isGenderValid = cleanedGender === 'male' || cleanedGender === 'female';
        
            const hasRequiredFields = !!(item.first_name && item.last_name && item.birthdate && item.email && item.gender);
            const isBirthdateValid = moment(birthdate, 'YYYY-MM-DD', true).isValid();
        
            const isValid = hasRequiredFields && isGenderValid && isBirthdateValid;
        
            return {
                ...item,
                gender: cleanedGender, // optional: keep the cleaned value
                birthdate: isBirthdateValid ? birthdate : 'Ongeldige datum',
                valid: isValid
            };
        };
        

        const newValidatedData = excelData
            .filter(item => !existingEmails.has(item.email))
            .map(validateItem);

        const updateValidatedData = excelData
            .filter(item => existingEmails.has(item.email))
            .map(validateItem);

        const archiveValidatedData = results
            .filter(item => item.status === 'active' && !excelEmails.has(item.email))
            .map(item => ({
                ...item,
                valid: true
            }));

        const unArchiveValidatedData = results
            .filter(item => item.status === 'archived' && excelEmails.has(item.email))
            .map(item => ({
                ...item,
                valid: true
            }));

        const valid_import = [...newValidatedData, ...updateValidatedData].every(item => item.valid);

        return res.json({
            valid_import,
            data: {
                new_data: newValidatedData,
                update_data: updateValidatedData,
                archive_data: archiveValidatedData,
                unarchive_data: unArchiveValidatedData
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Er is iets misgegaan met het verwerken van het bestand'
        });
    }
};


const importEmployees = async (req, res) => {
    const { new_data, update_data, archive_data, unarchive_data } = req.body.data; // Assuming data is split before this
    const company = req.company;

    try {
        const employeesToInsert = [];
        const employeesToUpdate = [];
        const employeesToArchive = [];
        const employeesToUnarchive = [];

        // Handle new employees
        for (const employee of new_data) {
            let employeeUUID;
            let isUnique = false;

            // Generate a unique UUID
            while (!isUnique) {
                employeeUUID = uuidv4();
                const existing = await dbQuery(
                    `SELECT id FROM ns_employees WHERE uuid = ? LIMIT 1`,
                    [employeeUUID]
                );
                if (existing.length === 0) {
                    isUnique = true;
                }
            }

            employeesToInsert.push([
                employeeUUID,
                employee.first_name,
                employee.last_name,
                employee.birthdate,
                employee.email,
                employee.gender,
                company
            ]);
        }

        // Handle updated employees
        for (const employee of update_data) {
            employeesToUpdate.push([
                employee.first_name,
                employee.last_name,
                employee.birthdate,
                employee.email,
                employee.gender,
                company,
                employee.email,
                company
            ]);
        }

        // Handle employees to archive
        for (const employee of archive_data) {
            employeesToArchive.push([employee.email, company]);
        }

        // Handle employees to unarchive
        for (const employee of unarchive_data) {
            employeesToUnarchive.push([employee.email, company]);
        }

        // Insert new employees into the database
        if (employeesToInsert.length > 0) {
            const sqlQueryInsert = `
                INSERT INTO ns_employees 
                (uuid, first_name, last_name, birthdate, email, gender, company) 
                VALUES ?;
            `;
            await dbQuery(sqlQueryInsert, [employeesToInsert]);
        }

        // Update existing employees
        if (employeesToUpdate.length > 0) {
            const sqlQueryUpdate = `
                UPDATE ns_employees
                SET first_name = ?, last_name = ?, birthdate = ?, email = ?, gender = ?, company = ?
                WHERE email = ? AND company = ?;
            `;
            for (const update of employeesToUpdate) {
                await dbQuery(sqlQueryUpdate, update);
            }
        }

        // Archive employees (mark status as 'archived')
        if (employeesToArchive.length > 0) {
            const sqlQueryArchive = `
                UPDATE ns_employees
                SET status = 'archived'
                WHERE email = ? AND company = ?;
            `;
            for (const archive of employeesToArchive) {
                await dbQuery(sqlQueryArchive, archive);
            }

            // Delete from ns_employee_surveys for archived employees
            const deleteArchiveSurveyQuery = `
                DELETE es 
                FROM ns_employee_surveys es
                JOIN ns_employees e ON es.employee = e.id
                JOIN ns_surveys s ON es.survey = s.id
                WHERE e.email = ? AND e.company = ? AND s.sent IS NULL;
            `;
            for (const archive of employeesToArchive) {
                await dbQuery(deleteArchiveSurveyQuery, archive);
            }
        }

        // Unarchive employees (mark status as 'active') and insert into ns_employee_surveys
        if (employeesToUnarchive.length > 0) {
            const sqlQueryUnarchive = `
                UPDATE ns_employees
                SET status = 'active'
                WHERE email = ? AND company = ?;
            `;
            for (const unarchive of employeesToUnarchive) {
                await dbQuery(sqlQueryUnarchive, unarchive);
            }

            // Insert into ns_employee_surveys for unarchived employees and surveys where sent is NULL
            const unarchiveSurveyQuery = `
                INSERT INTO ns_employee_surveys (survey, employee, access_token)
                SELECT s.id, e.id, ? 
                FROM ns_surveys s
                JOIN ns_employees e ON e.email = ? AND e.company = s.company
                WHERE s.company = ? AND s.sent IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM ns_employee_surveys 
                    WHERE employee = e.id AND survey = s.id
                );
            `;
            for (const unarchive of employeesToUnarchive) {
                // Get the employee ID
                const employeeIdQuery = `
                    SELECT id FROM ns_employees WHERE email = ? AND company = ?
                `;
                const employeeIdResult = await dbQuery(employeeIdQuery, [unarchive[0], company]);
                const employeeId = employeeIdResult[0]?.id;

                if (employeeId) {
                    const accessToken = await generateAccessToken(company); // Adjust as necessary for token generation

                    // Execute the unarchive survey insertion
                    await dbQuery(unarchiveSurveyQuery, [accessToken, unarchive[0], company]);
                } else {
                    console.log(`Employee with email ${unarchive[0]} not found in company ${company}`);
                }
            }
        }

        return res.json({ success: true, message: "Medewerkers zijn succesvol geïmporteerd" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: 'Er is iets misgegaan met het verwerken van het bestand'
        });
    }
};





module.exports = { listEmployees, getEmployee, employeeImportTemplate, validateImport, importEmployees };
