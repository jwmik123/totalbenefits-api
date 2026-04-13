const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listTags 
} = require('../../controllers/tags/tags');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listTags);

module.exports = router;