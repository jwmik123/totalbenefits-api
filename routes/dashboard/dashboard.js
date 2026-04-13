const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyDashboard 
} = require('../../middlewares/dashboard/dashboard');

//Controllers
const { 
    getDashboardInfo, 
    getDashboardThemeScores 
} = require('../../controllers/dashboard/dashboard');

//Router
const router = express.Router();

//Routes
router.get('/:company', authenticateJWT, validateUserCompanyDashboard, getDashboardInfo);
router.get('/:company/themes', authenticateJWT, validateUserCompanyDashboard, getDashboardThemeScores);

module.exports = router;