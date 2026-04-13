const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Controllers
const { 
    listTargetGroups 
} = require('../../controllers/target-groups/target-groups');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, listTargetGroups);

module.exports = router;