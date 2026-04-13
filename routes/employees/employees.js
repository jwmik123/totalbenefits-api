const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyEmployees, 
    validateUserCompany, 
    validateUserImportValidation 
} = require('../../middlewares/employees/employees');

//Controllers
const { 
    listEmployees, 
    getEmployee, 
    employeeImportTemplate, 
    validateImport, 
    importEmployees 
} = require('../../controllers/employees/employees');

//Router
const router = express.Router();

//Routes
router.get('/download/template', authenticateJWT, employeeImportTemplate);
router.post('/:company/import/validate', upload.single('file'), authenticateJWT, validateUserImportValidation, validateImport);
router.post('/:company/import', authenticateJWT, validateUserImportValidation, importEmployees);
router.get('/:company/:status', authenticateJWT, validateUserCompanyEmployees, listEmployees);
router.get('/:uuid', authenticateJWT, validateUserCompany, getEmployee);

module.exports = router;