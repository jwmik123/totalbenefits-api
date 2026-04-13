const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    checkUserRole, 
    validateCompanyCreation, 
    validateCompanyModification,
    validateGetProfileOptions
} = require('../../middlewares/companies/companies');

//Controllers
const { 
    listCompanies, 
    createCompany, 
    getCompany, 
    updateCompany,
    getProfileOptions,
    getCompanyProfile,
    saveCompanyProfile
} = require('../../controllers/companies/companies');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, checkUserRole, listCompanies);
router.get('/:id', authenticateJWT, validateCompanyModification, getCompany);
router.post('/', authenticateJWT, validateCompanyCreation, createCompany);
router.put('/:id', authenticateJWT, validateCompanyModification, updateCompany);
router.get('/:id/profile-options', authenticateJWT, validateGetProfileOptions, getProfileOptions);
router.get('/:id/profile', authenticateJWT, validateGetProfileOptions, getCompanyProfile);
router.put('/:id/profile', authenticateJWT, validateGetProfileOptions, saveCompanyProfile);

module.exports = router;