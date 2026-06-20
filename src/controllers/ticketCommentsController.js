const { sql, getConnection } = require('../config/db');
const { isSupportRole } = require('../middlewares/roleMiddleware');
const { emitSocketEvent } = require('../services/socketService');

const mapComment = (comment) => {
  return {
    id: comment.id,
    ticket_id: comment.ticket_id,
    user_id: comment.user_id,
    comment: comment.comment,
    created_at: comment.created_at
  };
};

const getTicketId = (id) => {
  const ticketId = Number(id);

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return null;
  }

  return ticketId;
};

const getTicketById = async (pool, ticketId) => {
  const result = await pool
    .request()
    .input('TicketId', sql.Int, ticketId)
    .query('SELECT id, user_id FROM Tickets WHERE id = @TicketId');

  return result.recordset[0];
};

const canAccessTicket = (ticket, user) => {
  return isSupportRole(user) || Number(ticket.user_id) === Number(user?.id);
};

const sendForbidden = (res) => {
  return res.status(403).json({
    status: 403,
    message: 'You do not have permission to perform this action'
  });
};

const addComment = async (req, res) => {
  try {
    const ticketId = getTicketId(req.params.ticketId);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';

    if (!comment) {
      return res.status(400).json({
        status: 400,
        message: 'Comment is required'
      });
    }

    const pool = await getConnection();
    const ticket = await getTicketById(pool, ticketId);

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    if (!canAccessTicket(ticket, req.user)) {
      return sendForbidden(res);
    }

    const result = await pool
      .request()
      .input('TicketId', sql.Int, ticketId)
      .input('UserId', sql.Int, req.user.id)
      .input('Comment', sql.NVarChar(sql.MAX), comment)
      .query(`
        INSERT INTO TicketComments (ticket_id, user_id, comment)
        OUTPUT
          INSERTED.id,
          INSERTED.ticket_id,
          INSERTED.user_id,
          INSERTED.comment,
          INSERTED.created_at
        VALUES (@TicketId, @UserId, @Comment)
      `);

    const savedComment = mapComment(result.recordset[0]);
    emitSocketEvent('comment:created', {
      ticketId,
      comment: savedComment
    });

    return res.status(201).json({
      status: 201,
      message: 'Comment added successfully',
      comment: savedComment
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

const getTicketComments = async (req, res) => {
  try {
    const ticketId = getTicketId(req.params.ticketId);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    const pool = await getConnection();
    const ticket = await getTicketById(pool, ticketId);

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    if (!canAccessTicket(ticket, req.user)) {
      return sendForbidden(res);
    }

    const result = await pool
      .request()
      .input('TicketId', sql.Int, ticketId)
      .query(`
        SELECT
          id,
          ticket_id,
          user_id,
          comment,
          created_at
        FROM TicketComments
        WHERE ticket_id = @TicketId
        ORDER BY created_at ASC
      `);

    return res.status(200).json({
      status: 200,
      message: 'Ticket comments found',
      comments: result.recordset.map(mapComment)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting ticket comments',
      error: error.message
    });
  }
};

module.exports = {
  addComment,
  getTicketComments
};
