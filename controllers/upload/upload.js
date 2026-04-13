const multer = require('multer');
const path = require('path');
const sharp = require('sharp'); // Import sharp for image resizing

// Configure multer storage for profile uploads
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname)); // Set the profile file name
    }
});

const uploadImage = multer({ 
    storage: imageStorage,
});

const handleUpload = async (req, res) => {
    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Use sharp to resize image to maximum width of 500px (maintains aspect ratio)
        const resizedImageBuffer = await sharp(file.path)
            .resize({ width: 500 })
            .toBuffer();

        // Save the resized image back to disk, overwriting the original
        await sharp(resizedImageBuffer).toFile(file.path);

        // Return the file path and name
        res.status(200).json({
            filePath: file.path,
            fileName: file.filename,
            fileSize: file.size // Ensure file size is correctly accessed
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'An error occurred while uploading the file' });
    }
};


const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'document-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadBenefitDocument = multer({
    storage: documentStorage,
    fileFilter: (req, file, cb) => {
        const allowed = [
            '.pdf', '.doc', '.docx',
            '.xls', '.xlsx'
        ];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowed.includes(ext)) {
            return cb(new Error('Bestandstype niet toegestaan'), false);
        }

        cb(null, true);
    }
}).single('document');

const benefitsDBdocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/bd-documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'document-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadBenefitsDatabaseDocument = multer({
    storage: benefitsDBdocumentStorage,
    fileFilter: (req, file, cb) => {
        const allowed = [
            '.pdf', '.doc', '.docx',
            '.xls', '.xlsx'
        ];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowed.includes(ext)) {
            return cb(new Error('Bestandstype niet toegestaan'), false);
        }

        cb(null, true);
    }
}).single('document');

const handleUploadBenefitDocument = async (req, res) => {
    try {
        const { file } = req;
        if (!file) {
            return res.status(400).json({ error: 'Geen document geüpload' });
        }
        return res.status(200).json({
            filePath: file.path,
            fileName: file.filename,
            fileSize: file.size
        });
    } catch (error) {
        console.error('Upload fout:', error);
        res.status(500).json({ error: 'Er ging iets mis bij het uploaden' });
    }
};


module.exports = { 
    uploadImage: uploadImage.single('file'), 
    handleUpload,
    uploadBenefitDocument,
    uploadBenefitsDatabaseDocument,
    handleUploadBenefitDocument
};