const express = require('express');
const multer = require('multer');
const { listBenefits, listBenefitSelectOptions, listStakeholders, createBenefit, updateBenefit, getBenefit, likeBenefit, dislikeBenefit, listThemes, getDocument, deleteBenefit } = require('../../controllers/benefits-db/benefits-db');
const authenticateJWT = require('../../middlewares/authenticate');
const { validateGetBenefit, validateListBenefits, validateCreateBenefit, validateListThemes, validateGetDocument } = require('../../middlewares/benefits-db/benefits-db');
const router = express.Router();

router.post('/', authenticateJWT, validateListBenefits, listBenefits);
router.post('/all/:theme', authenticateJWT, validateListBenefits, listBenefits);
router.get('/single/:uuid', authenticateJWT, validateGetBenefit, getBenefit);
router.post('/like/:id', authenticateJWT, likeBenefit);
router.delete('/like/:id', authenticateJWT, dislikeBenefit);
router.put('/:id', authenticateJWT, validateCreateBenefit, updateBenefit);
router.get('/select-options', authenticateJWT, listBenefitSelectOptions);
router.get('/stakeholders', authenticateJWT, listStakeholders);
router.post('/create', authenticateJWT, validateCreateBenefit, createBenefit);
router.get('/themes', authenticateJWT, validateListThemes, listThemes);
router.post('/document', authenticateJWT, validateGetDocument, getDocument);
router.delete('/:uuid', authenticateJWT, validateGetBenefit, deleteBenefit);

module.exports = router;