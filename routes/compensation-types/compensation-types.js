const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listCompensationTypes 
} = require('../../controllers/compensation-types/compensation-types');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listCompensationTypes);

module.exports = router;