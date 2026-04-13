const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyBenefits, 
    validateUserCompany, 
    validateBenefitCreation,
    validateUpdateBenefit,
    validateDeleteBenefit,
    validateGetDocument, 
} = require('../../middlewares/benefits/benefits');

//controllers
const { 
    listBenefits, 
    getBenefit,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    getDocument 
} = require('../../controllers/benefits/benefits');

//Router
const router = express.Router();

//Routes
router.get('/:company/:status', authenticateJWT, validateUserCompanyBenefits, listBenefits);
router.get('/:uuid', authenticateJWT, validateUserCompany, getBenefit);
router.post('/document', authenticateJWT, validateGetDocument, getDocument);
router.post('/', authenticateJWT, validateBenefitCreation, createBenefit);
router.put('/:uuid/general', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.put('/:uuid/description', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.put('/:uuid/financial', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.put('/:uuid/implementation', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.put('/:uuid/strategic', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.put('/:uuid/maintenance', authenticateJWT, validateUpdateBenefit, updateBenefit);
router.delete('/:uuid', authenticateJWT, validateDeleteBenefit, deleteBenefit);

module.exports = router;