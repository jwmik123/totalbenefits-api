const express = require('express');

const authenticateJWT = require('../../middlewares/authenticate');
const { validateBranchGroupAdmin } = require('../../middlewares/branch-groups/branch-groups');
const {
    listBranchGroups,
    getBranchGroup,
    createBranchGroup,
    updateBranchGroup,
    deleteBranchGroup,
} = require('../../controllers/branch-groups/branch-groups');

const router = express.Router();

router.get('/',    authenticateJWT, listBranchGroups);
router.get('/:id', authenticateJWT, getBranchGroup);
router.post('/',   authenticateJWT, validateBranchGroupAdmin, createBranchGroup);
router.put('/:id', authenticateJWT, validateBranchGroupAdmin, updateBranchGroup);
router.delete('/:id', authenticateJWT, validateBranchGroupAdmin, deleteBranchGroup);

module.exports = router;
