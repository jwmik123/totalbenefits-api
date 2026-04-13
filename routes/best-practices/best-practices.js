const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const {
    validateCreateBestPractice,
    validateEditBestPractice,
    checkUserRole
} = require('../../middlewares/best-practices/best-practices');

//Controllers
const {
    createBestPractice,
    editBestPractice,
    listBestPractices,
    getBestPractice,
    declineBestPractice,
    approveBestPractice
} = require('../../controllers/best-practices/best-practices');

//Router
const router = express.Router();

//Routes
router.get('/', authenticateJWT, checkUserRole, listBestPractices);
router.get('/:id', authenticateJWT, checkUserRole, getBestPractice);
router.post('/', authenticateJWT, validateCreateBestPractice, createBestPractice);
router.put('/:id', authenticateJWT, validateEditBestPractice, editBestPractice);
router.put('/decline/:id', authenticateJWT, checkUserRole, declineBestPractice);
router.put('/approve/:id', authenticateJWT, checkUserRole, approveBestPractice);

module.exports = router;