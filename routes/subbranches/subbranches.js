const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listSubBranches 
} = require('../../controllers/subbranches/subbranches');

//Router
const router = express.Router();

//Routes
router.get('/:id', authenticateJWT, listSubBranches);

module.exports = router;