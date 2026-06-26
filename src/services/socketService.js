// guarda socket.io para usarla desde otros archivos
let ioInstance = null;

// recibe la instancia principal de socket.io cuando arranca el servidor
const setSocketServer = (io) => {
  ioInstance = io;
};

// evento en tiempo real a todos los clientes conectados
const emitSocketEvent = (eventName, payload) => {
  // si socket.io aun no esta listo, no hace nada
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
};

// exporta
module.exports = {
  setSocketServer,
  emitSocketEvent
};