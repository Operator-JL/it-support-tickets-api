// guarda socket.io para usarla desde otros archivos
let ioInstance = null;

const SUPPORT_ROOM = 'support';

const getUserRoom = (userId) => {
  const normalizedUserId = Number(userId);
  return Number.isInteger(normalizedUserId) && normalizedUserId > 0
    ? `user:${normalizedUserId}`
    : null;
};

const getRoleRoom = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  return normalizedRole ? `role:${normalizedRole}` : null;
};

// recibe la instancia principal de socket.io cuando arranca el servidor
const setSocketServer = (io) => {
  ioInstance = io;
};

const registerSocketRooms = (socket, user) => {
  if (!socket || !user) {
    return;
  }

  const userRoom = getUserRoom(user.id);
  const roleRoom = getRoleRoom(user.role);
  const normalizedRole = String(user.role || '').trim().toLowerCase();

  if (userRoom) {
    socket.join(userRoom);
  }

  if (roleRoom) {
    socket.join(roleRoom);
  }

  if (['admin', 'soporte'].includes(normalizedRole)) {
    socket.join(SUPPORT_ROOM);
  }
};

// evento en tiempo real a todos los clientes conectados
const emitSocketEvent = (eventName, payload) => {
  // si socket.io aun no esta listo, no hace nada
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
};

const emitSocketEventToRooms = (eventName, payload, rooms = []) => {
  if (!ioInstance) {
    return;
  }

  const targetRooms = [...new Set(rooms.filter(Boolean))];

  if (targetRooms.length === 0) {
    return;
  }

  ioInstance.to(targetRooms).emit(eventName, payload);
};

const emitTicketEvent = (eventName, payload, ticket = payload?.ticket) => {
  const ownerRoom = getUserRoom(ticket?.user_id);
  emitSocketEventToRooms(eventName, payload, [SUPPORT_ROOM, ownerRoom]);
};

// exporta
module.exports = {
  setSocketServer,
  emitSocketEvent,
  emitTicketEvent,
  emitSocketEventToRooms,
  registerSocketRooms
};
