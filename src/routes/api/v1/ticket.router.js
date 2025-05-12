const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  updateTicketStatus,
  deleteTicket,
  getAllTickets,
  updateTicket
} = require('../../../controllers/ticket.controller.js');

// User routes

router.get('/', getAllTickets);
router.get('/:userId', getUserTickets);
router.post('/', createTicket);

// Admin routes
router.put('/:ticketId', updateTicketStatus);
router.put('/user/:ticketId', updateTicket);
router.delete('/:ticketId', deleteTicket);

module.exports = router;
