const express = require('express');

//Authentication
const authenticateJWT = require('../middlewares/authenticate');

//Controllers
const { changePassword, forgotPassword, resetPassword } = require('../controllers/password');

//Router
const router = express.Router();

//Routes
router.post('/change-password', authenticateJWT, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;