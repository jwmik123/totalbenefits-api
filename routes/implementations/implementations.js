const express = require('express');

const authenticateJWT = require('../../middlewares/authenticate');

const {
    requireAdmin,
    validateBenefitId,
    validateMode,
    validateImplId,
    validateImplBody,
    validateSectorCodesQuery,
} = require('../../middlewares/implementations/implementations');

const {
    listImplementations,
    updateMode,
    createImplementation,
    updateImplementation,
    deleteImplementation,
    getSectorCodes,
} = require('../../controllers/implementations/implementations');

const router = express.Router();

router.get('/sector-codes', authenticateJWT, validateSectorCodesQuery, getSectorCodes);
router.get('/', authenticateJWT, validateBenefitId, listImplementations);
router.put('/mode', authenticateJWT, requireAdmin, validateBenefitId, validateMode, updateMode);
router.post('/', authenticateJWT, requireAdmin, validateBenefitId, validateImplBody, createImplementation);
router.patch('/:id', authenticateJWT, requireAdmin, validateImplId, validateImplBody, updateImplementation);
router.delete('/:id', authenticateJWT, requireAdmin, validateImplId, deleteImplementation);

module.exports = router;
