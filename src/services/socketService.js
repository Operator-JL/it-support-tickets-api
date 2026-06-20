let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitSocketEvent = (eventName, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
};

module.exports = {
  setSocketServer,
  emitSocketEvent
};
