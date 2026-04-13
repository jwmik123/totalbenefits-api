const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyCoreValues,
    validateCreateCoreValue,
    validateDeleteCoreValue
} = require('../../middlewares/core-values/core-values');

//Controllers
const { 
    listCoreValues, 
    createCoreValue,
    deleteCoreValue
} = require('../../controllers/core-values/core-values');

//Router
const router = express.Router();

//Routes
router.get('/:company', authenticateJWT, validateUserCompanyCoreValues, listCoreValues);
router.post('/', authenticateJWT, validateCreateCoreValue, createCoreValue);
router.delete('/:id', authenticateJWT, validateDeleteCoreValue, deleteCoreValue);


module.exports = router;