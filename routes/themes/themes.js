const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyThemes, 
    validateAdminTemplates, 
    validateCreateTheme 
} = require('../../middlewares/themes/themes');

//Controllers
const { 
    listThemes, 
    listTemplates, 
    createTheme 
} = require('../../controllers/themes/themes');

//Router
const router = express.Router();

//Routes
router.get('/templates', authenticateJWT, validateAdminTemplates, listTemplates);
router.get('/:company/:status', authenticateJWT, validateUserCompanyThemes, listThemes);
router.post('/', authenticateJWT, validateCreateTheme, createTheme);


module.exports = router;