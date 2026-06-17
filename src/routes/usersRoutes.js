const express = require('express');
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), usersController.getUsers);
router.patch('/:id/role', authMiddleware, requireRole('admin'), usersController.updateUserRole);

module.exports = router;
