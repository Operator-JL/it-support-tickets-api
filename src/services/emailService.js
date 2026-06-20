const { Resend } = require('resend');

const isEmailEnabled = () => {
  return process.env.EMAIL_ENABLED === 'true';
};

const getEmailConfig = () => {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO
  };
};

const getShortDescription = (description) => {
  if (!description) {
    return 'Sin descripcion.';
  }

  const cleanDescription = String(description).trim();

  if (cleanDescription.length <= 180) {
    return cleanDescription;
  }

  return `${cleanDescription.slice(0, 180)}...`;
};

const buildTicketEmailText = (ticket, intro) => {
  return [
    intro,
    '',
    `Ticket: ${ticket.title}`,
    `Prioridad: ${ticket.priority}`,
    `Estado: ${ticket.status}`,
    `Categoria: ${ticket.category || 'Sin categoria'}`,
    '',
    'Descripcion:',
    getShortDescription(ticket.description)
  ].join('\n');
};

const sendTicketEmail = async ({ subject, intro, ticket }) => {
  if (!isEmailEnabled()) {
    return;
  }

  const { apiKey, from, to } = getEmailConfig();

  if (!apiKey || !from || !to) {
    console.warn('Email notification skipped: missing RESEND_API_KEY, EMAIL_FROM or EMAIL_TO.');
    return;
  }

  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from,
      to,
      subject,
      text: buildTicketEmailText(ticket, intro)
    });
  } catch (error) {
    console.warn(`Email notification failed: ${error.message}`);
  }
};

const sendTicketCreatedEmail = (ticket) => {
  return sendTicketEmail({
    subject: `Nuevo ticket SIST: ${ticket.title}`,
    intro: 'Se creo un nuevo ticket en SIST.',
    ticket
  });
};

const sendTicketClosedEmail = (ticket) => {
  return sendTicketEmail({
    subject: `Ticket cerrado SIST: ${ticket.title}`,
    intro: 'Un ticket fue marcado como Cerrado en SIST.',
    ticket
  });
};

module.exports = {
  sendTicketCreatedEmail,
  sendTicketClosedEmail
};
