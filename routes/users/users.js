const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateGetUsers, 
    validateGetUser, 
    validateRegisterUserForCompany 
} = require('../../middlewares/users/users');

//Controllers
const { 
    getProfileInfo, 
    getUsers, 
    getUserInfo, 
    editUser,
    getUserRoles, 
    registerUserForCompany 
} = require('../../controllers/users/users');

//Router
const router = express.Router();

//Routes
router.get('/company/:company', authenticateJWT, validateGetUsers, getUsers);
router.post('/user/:uuid', authenticateJWT, validateGetUser, getUserInfo);
router.put('/user/:uuid', authenticateJWT, validateGetUser, editUser);
router.post('/register', authenticateJWT, validateRegisterUserForCompany, registerUserForCompany);
router.get('/me', authenticateJWT, getProfileInfo);
router.get('/roles', authenticateJWT, getUserRoles);

module.exports = router;