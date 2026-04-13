const express = require('express');

//Controllers
const { 
    register, 
    login 
} = require('../controllers/auth');

//Router
const router = express.Router();

//Routes
router.post('/register', register);
router.post('/login', login);

module.exports = router;