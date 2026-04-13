const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateCreateSdg,
    validateDeleteSdg
} = require('../../middlewares/sdgs/sdgs');

//Controllers
const { 
    listSdgs,
    createSdg,
    deleteSdg
} = require('../../controllers/sdgs/sdgs');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listSdgs);
router.post('/', authenticateJWT, validateCreateSdg, createSdg);
router.delete('/:id', authenticateJWT, validateDeleteSdg, deleteSdg);

module.exports = router;