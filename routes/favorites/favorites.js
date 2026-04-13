const express = require('express');
const multer = require('multer');
const { listFavorites, getStatusOptions, likeFavorite, dislikeFavorite, updateNote, updateStatus, deleteFavorite } = require('../../controllers/favorites/favorites');
const authenticateJWT = require('../../middlewares/authenticate');
const { validateListFavorites, validateLike } = require('../../middlewares/favorites/favorites');
const router = express.Router();

router.get('/:company', authenticateJWT, validateListFavorites, listFavorites);
router.get('/statuses/options', authenticateJWT, getStatusOptions);
router.post('/like/:id', authenticateJWT, validateLike, likeFavorite);
router.delete('/like/:id', authenticateJWT, validateLike, dislikeFavorite);
router.put('/:id/note', authenticateJWT, updateNote);
router.put('/:id/status', authenticateJWT, updateStatus);
router.delete('/:id', authenticateJWT, deleteFavorite);

module.exports = router;