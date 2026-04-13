const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listBranches 
} = require('../../controllers/branches/branches');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listBranches);

module.exports = router;