const express = require('express');
const ticketsController = require('../controllers/ticketsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, ticketsController.createTicket);
router.get('/', authMiddleware, ticketsController.getAllTickets);
router.get('/my', authMiddleware, ticketsController.getMyTickets);
router.get('/:id', authMiddleware, ticketsController.getTicketById);
router.put('/:id', authMiddleware, ticketsController.updateTicket);
router.patch('/:id/status', authMiddleware, ticketsController.updateTicketStatus);
router.delete('/:id', authMiddleware, ticketsController.deleteTicket);

module.exports = router;
