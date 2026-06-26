const express = require('express');
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, requireRole('admin'), usersController.getUsers);
router.post('/', authMiddleware, requireRole('admin'), usersController.createUser);
router.put('/:id', authMiddleware, requireRole('admin'), usersController.editUser);
router.patch('/:id/status', authMiddleware, requireRole('admin'), usersController.updateStatus);
router.patch('/:id/password', authMiddleware, requireRole('admin'), usersController.changePassword);
router.patch('/:id/role', authMiddleware, requireRole('admin'), usersController.updateUserRole);

module.exports = router;
