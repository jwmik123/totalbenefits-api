const express = require('express');

//Middlewares
const { 
    listDeepDives, 
    createDeepDive, 
    deleteDeepDive, 
    getDeepDiveCompanyInfo, 
    getDeepDiveSurvey, 
    submitQuestion,
    submitThemeScore, 
    submitDeepDive,
    sendDeepDive 
} = require('../../controllers/deepdives/deepdives');
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    validateUserCompanyDeepDives, 
    validateCreateDeepDive, 
    validateDeleteDeepDive, 
    validateGetDeepDive, 
    validateSubmitQuestion, 
    validateSubmitThemeScore,
    validateSubmitDeepDive,
    validateSendDeepDive 
} = require('../../middlewares/deepdives/deepdives');

//Router
const router = express.Router();

//Routes
router.get('/:company', authenticateJWT, validateUserCompanyDeepDives, listDeepDives);
router.get('/companies/:uuid', getDeepDiveCompanyInfo);
router.post('/:company', authenticateJWT, validateCreateDeepDive, createDeepDive);
router.post('/survey/:id', validateGetDeepDive, getDeepDiveSurvey);
router.post('/survey/question/:id', validateSubmitQuestion, submitQuestion);
router.post('/survey/theme/:id', validateSubmitThemeScore, submitThemeScore);
router.delete('/:id', authenticateJWT, validateDeleteDeepDive, deleteDeepDive);
router.post('/survey/submit/:survey', validateSubmitDeepDive, submitDeepDive);
router.post('/survey/send/:id', authenticateJWT, validateSendDeepDive, sendDeepDive);

module.exports = router;