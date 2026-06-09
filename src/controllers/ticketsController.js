const { sql, getConnection } = require('../config/db');
const { isAdmin, isSupportRole } = require('../middlewares/roleMiddleware');

const allowedStatuses = ['Abierto', 'En proceso', 'Cerrado'];
const allowedPriorities = ['Baja', 'Media', 'Alta', 'Urgente'];

const mapTicket = (ticket) => {
  return {
    id: ticket.id,
    user_id: ticket.user_id,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
    closed_at: ticket.closed_at
  };
};

const getTicketSelectQuery = (whereClause = '') => {
  return `
    SELECT
      id,
      user_id,
      title,
      [description],
      category,
      priority,
      [status],
      created_at,
      updated_at,
      closed_at
    FROM Tickets
    ${whereClause}
  `;
};

const getTicketOutputQuery = () => {
  return `
    OUTPUT
      INSERTED.id,
      INSERTED.user_id,
      INSERTED.title,
      INSERTED.[description],
      INSERTED.category,
      INSERTED.priority,
      INSERTED.[status],
      INSERTED.created_at,
      INSERTED.updated_at,
      INSERTED.closed_at
  `;
};

const getRequiredText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getOptionalText = (value) => {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getTicketId = (id) => {
  const ticketId = Number(id);

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return null;
  }

  return ticketId;
};

const isTicketOwner = (ticket, user) => {
  return Number(ticket.user_id) === Number(user?.id);
};

const canAccessTicket = (ticket, user) => {
  return isSupportRole(user) || isTicketOwner(ticket, user);
};

const sendForbidden = (res) => {
  return res.status(403).json({
    status: 403,
    message: 'You do not have permission to perform this action'
  });
};

const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    const cleanTitle = getRequiredText(title);
    const cleanDescription = getRequiredText(description);
    const cleanCategory = getRequiredText(category);
    const cleanPriority = priority === undefined ? 'Media' : getRequiredText(priority);

    if (!cleanTitle || !cleanDescription || !cleanCategory) {
      return res.status(400).json({
        status: 400,
        message: 'Title, description and category are required'
      });
    }

    if (!cleanPriority) {
      return res.status(400).json({
        status: 400,
        message: 'Priority cannot be empty'
      });
    }

    if (!allowedPriorities.includes(cleanPriority)) {
      return res.status(400).json({
        status: 400,
        message: `Priority must be one of: ${allowedPriorities.join(', ')}`
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('UserId', sql.Int, req.user.id)
      .input('Title', sql.NVarChar(200), cleanTitle)
      .input('Description', sql.NVarChar(sql.MAX), cleanDescription)
      .input('Category', sql.NVarChar(100), cleanCategory)
      .input('Priority', sql.NVarChar(50), cleanPriority)
      .query(`
        INSERT INTO Tickets (user_id, title, [description], category, priority, [status])
        ${getTicketOutputQuery()}
        VALUES (@UserId, @Title, @Description, @Category, @Priority, 'Abierto')
      `);

    return res.status(201).json({
      status: 201,
      message: 'Ticket created successfully',
      ticket: mapTicket(result.recordset[0])
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error creating ticket',
      error: error.message
    });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const pool = await getConnection();
    const request = pool.request();
    let query = `
      ${getTicketSelectQuery()}
      ORDER BY created_at DESC
    `;

    if (!isSupportRole(req.user)) {
      request.input('UserId', sql.Int, req.user.id);
      query = `
        ${getTicketSelectQuery('WHERE user_id = @UserId')}
        ORDER BY created_at DESC
      `;
    }

    const result = await request.query(query);

    return res.status(200).json({
      status: 200,
      message: 'Tickets found',
      tickets: result.recordset.map(mapTicket)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting tickets',
      error: error.message
    });
  }
};

const getMyTickets = async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool
      .request()
      .input('UserId', sql.Int, req.user.id)
      .query(`
        ${getTicketSelectQuery('WHERE user_id = @UserId')}
        ORDER BY created_at DESC
      `);

    return res.status(200).json({
      status: 200,
      message: 'User tickets found',
      tickets: result.recordset.map(mapTicket)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting user tickets',
      error: error.message
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticketId = getTicketId(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('Id', sql.Int, ticketId)
      .query(getTicketSelectQuery('WHERE id = @Id'));

    if (result.recordset.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    const ticket = result.recordset[0];

    if (!canAccessTicket(ticket, req.user)) {
      return sendForbidden(res);
    }

    return res.status(200).json({
      status: 200,
      message: 'Ticket found',
      ticket: mapTicket(ticket)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting ticket',
      error: error.message
    });
  }
};

const updateTicket = async (req, res) => {
  try {
    const ticketId = getTicketId(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    if (!isSupportRole(req.user)) {
      return sendForbidden(res);
    }

    const cleanTitle = getOptionalText(req.body.title);
    const cleanDescription = getOptionalText(req.body.description);
    const cleanCategory = getOptionalText(req.body.category);
    const cleanPriority = getOptionalText(req.body.priority);

    if (
      req.body.title === undefined &&
      req.body.description === undefined &&
      req.body.category === undefined &&
      req.body.priority === undefined
    ) {
      return res.status(400).json({
        status: 400,
        message: 'At least one field is required'
      });
    }

    if (
      cleanTitle === '' ||
      cleanDescription === '' ||
      cleanCategory === '' ||
      cleanPriority === ''
    ) {
      return res.status(400).json({
        status: 400,
        message: 'Fields cannot be empty'
      });
    }

    if (cleanPriority !== null && !allowedPriorities.includes(cleanPriority)) {
      return res.status(400).json({
        status: 400,
        message: `Priority must be one of: ${allowedPriorities.join(', ')}`
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('Id', sql.Int, ticketId)
      .input('Title', sql.NVarChar(200), cleanTitle)
      .input('Description', sql.NVarChar(sql.MAX), cleanDescription)
      .input('Category', sql.NVarChar(100), cleanCategory)
      .input('Priority', sql.NVarChar(50), cleanPriority)
      .query(`
        UPDATE Tickets
        SET
          title = COALESCE(@Title, title),
          [description] = COALESCE(@Description, [description]),
          category = COALESCE(@Category, category),
          priority = COALESCE(@Priority, priority),
          updated_at = GETDATE()
        ${getTicketOutputQuery()}
        WHERE id = @Id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Ticket updated successfully',
      ticket: mapTicket(result.recordset[0])
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error updating ticket',
      error: error.message
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const ticketId = getTicketId(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    if (!isSupportRole(req.user)) {
      return sendForbidden(res);
    }

    const cleanStatus = getRequiredText(req.body.status);

    if (!cleanStatus) {
      return res.status(400).json({
        status: 400,
        message: 'Status is required'
      });
    }

    if (!allowedStatuses.includes(cleanStatus)) {
      return res.status(400).json({
        status: 400,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('Id', sql.Int, ticketId)
      .input('Status', sql.NVarChar(50), cleanStatus)
      .query(`
        UPDATE Tickets
        SET
          [status] = @Status,
          updated_at = GETDATE(),
          closed_at = CASE WHEN @Status = 'Cerrado' THEN GETDATE() ELSE NULL END
        ${getTicketOutputQuery()}
        WHERE id = @Id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Ticket status updated successfully',
      ticket: mapTicket(result.recordset[0])
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error updating ticket status',
      error: error.message
    });
  }
};

const deleteTicket = async (req, res) => {
  let transaction;
  let transactionStarted = false;

  try {
    const ticketId = getTicketId(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid ticket id'
      });
    }

    if (!isAdmin(req.user)) {
      return sendForbidden(res);
    }

    const pool = await getConnection();
    transaction = new sql.Transaction(pool);

    await transaction.begin();
    transactionStarted = true;

    const ticketResult = await new sql.Request(transaction)
      .input('Id', sql.Int, ticketId)
      .query(getTicketSelectQuery('WHERE id = @Id'));

    if (ticketResult.recordset.length === 0) {
      await transaction.rollback();
      transactionStarted = false;

      return res.status(404).json({
        status: 404,
        message: 'Ticket not found'
      });
    }

    await new sql.Request(transaction)
      .input('TicketId', sql.Int, ticketId)
      .query('DELETE FROM TicketComments WHERE ticket_id = @TicketId');

    await new sql.Request(transaction)
      .input('Id', sql.Int, ticketId)
      .query('DELETE FROM Tickets WHERE id = @Id');

    await transaction.commit();
    transactionStarted = false;

    return res.status(200).json({
      status: 200,
      message: 'Ticket deleted successfully',
      ticket: mapTicket(ticketResult.recordset[0])
    });
  } catch (error) {
    if (transactionStarted) {
      await transaction.rollback();
    }

    return res.status(500).json({
      status: 500,
      message: 'Error deleting ticket',
      error: error.message
    });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  deleteTicket
};
