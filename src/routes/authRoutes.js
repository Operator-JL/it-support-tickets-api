const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authController.home);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.profile);

module.exports = router;
