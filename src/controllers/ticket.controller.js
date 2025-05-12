const Ticket = require('../models/ticket.model.js');

// POST /api/tickets
module.exports.createTicket = async (req, res) => {
  const { userId, subject, message } = req.body;

  if (!userId || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const ticket = new Ticket({ userId, subject, message });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ticket.' });
  }
};

// GET /api/tickets?status=Pending
module.exports.getAllTickets = async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status && ['Pending', 'Resolved', 'Rejected'].includes(status)) {
    filter.status = status;
  }

  try {
    const tickets = await Ticket.find(filter)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
};

// GET /api/tickets/:userId
module.exports.getUserTickets = async (req, res) => {
  const { userId } = req.params;

  try {
    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
};

// PUT /api/tickets/:ticketId (Admin)
module.exports.updateTicketStatus = async (req, res) => {
  const { ticketId } = req.params;
  const { status, adminNote, subject, message } = req.body;

  if (!['Pending', 'Resolved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    ticket.status = status;
    if (adminNote) ticket.adminNote = adminNote;

    await ticket.save();
    res.status(200).json({ message: 'Ticket updated.', ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
};
module.exports.updateTicket= async (req, res) => {
  const { ticketId } = req.params;
  const { subject, message } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    if (subject) ticket.subject = subject;
    if (message) ticket.message = message;

    await ticket.save();
    res.status(200).json({ message: 'Ticket updated.', ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
};

// DELETE /api/tickets/:ticketId
module.exports.deleteTicket = async (req, res) => {
  const { ticketId } = req.params;

  try {
    const ticket = await Ticket.findByIdAndDelete(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    res.status(200).json({ message: 'Ticket deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ticket.' });
  }
};
