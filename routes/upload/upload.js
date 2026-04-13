const express = require('express');

//Authentication
const authenticateJWT = require('../../middlewares/authenticate');

//Middlewares
const { 
    validateSuperAdmin 
} = require('../../middlewares/upload/upload');

//Controllers
const { 
    uploadImage,
    uploadBenefitDocument,
    uploadBenefitsDatabaseDocument,
    handleUploadBenefitDocument,
    handleUpload 
} = require('../../controllers/upload/upload');

//Router
const router = express.Router();

//Routes
router.post('/', authenticateJWT, validateSuperAdmin, uploadImage, handleUpload);
router.post('/benefits/document', authenticateJWT, uploadBenefitDocument, handleUploadBenefitDocument);
router.post('/benefits-db/document', authenticateJWT, validateSuperAdmin, uploadBenefitsDatabaseDocument, handleUploadBenefitDocument);

module.exports = router;