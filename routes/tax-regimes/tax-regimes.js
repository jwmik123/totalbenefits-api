const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listTaxRegimes 
} = require('../../controllers/tax-regimes/tax-regimes');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listTaxRegimes);

module.exports = router;