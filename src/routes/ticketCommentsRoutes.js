const express = require('express');
const ticketCommentsController = require('../controllers/ticketCommentsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/:ticketId/comments', authMiddleware, ticketCommentsController.addComment);
router.get('/:ticketId/comments', authMiddleware, ticketCommentsController.getTicketComments);

module.exports = router;
