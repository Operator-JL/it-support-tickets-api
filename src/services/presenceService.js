const { Resend } = require('resend');

// checa si el resend esta true en el env
const isEmailEnabled = () => {
  return process.env.EMAIL_ENABLED === 'true';
};

// separa los correos destino por coma y limpia espacios
const getEmailRecipients = (value) => {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
};

// obtiene la configuracion del env
const getEmailConfig = () => {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    to: getEmailRecipients(process.env.EMAIL_TO)
  };
};

// recorta la descripcion para que el correo no quede tan largo
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

// arma el texto que se mandara dentro del correo
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

// envia el correo del ticket usando resend
const sendTicketEmail = async ({ subject, intro, ticket }) => {
  if (!isEmailEnabled()) {
    return;
  }

  const { apiKey, from, to } = getEmailConfig();

  // si falla el env, trata de no enviar el correo
  if (!apiKey || !from || to.length === 0) {
    console.warn('Email notification skipped: missing RESEND_API_KEY, EMAIL_FROM or EMAIL_TO.');
    return;
  }

  try {
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: buildTicketEmailText(ticket, intro)
    });

    // si resend responde con error, lo muestra en consola
    if (result?.error) {
      console.warn(`Email notification failed: ${result.error.message || result.error}`);
      return;
    }

    console.log('[email] notificacion enviada');
  } catch (error) {
    console.warn(`Email notification failed: ${error.message}`);
  }
};

// manda correo cuando se crea un ticket nuevo
const sendTicketCreatedEmail = (ticket) => {
  return sendTicketEmail({
    subject: `Nuevo ticket SIST: ${ticket.title}`,
    intro: 'Se creo un nuevo ticket en SIST.',
    ticket
  });
};

// manda correo cuando un ticket se cierra
const sendTicketClosedEmail = (ticket) => {
  return sendTicketEmail({
    subject: `Ticket cerrado SIST: ${ticket.title}`,
    intro: 'Un ticket fue marcado como Cerrado en SIST.',
    ticket
  });
};

// exporta a controllers
module.exports = {
  sendTicketCreatedEmail,
  sendTicketClosedEmail
};