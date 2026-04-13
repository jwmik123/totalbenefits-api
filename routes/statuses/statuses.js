const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listStatuses 
} = require('../../controllers/statuses/statuses');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listStatuses);

module.exports = router;