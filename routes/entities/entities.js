const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateUserCompanyEntities, 
    validateCreateEntity,
    validateDeleteEntity
} = require('../../middlewares/entities/entities');

//Controllers
const { 
    listEntities, 
    createEntity,
    deleteEntity 
} = require('../../controllers/entities/entities');

//Router
const router = express.Router();

//Routes
router.get('/:company', authenticateJWT, validateUserCompanyEntities, listEntities);
router.post('/', authenticateJWT, validateCreateEntity, createEntity);
router.delete('/:id', authenticateJWT, validateDeleteEntity, deleteEntity);


module.exports = router;