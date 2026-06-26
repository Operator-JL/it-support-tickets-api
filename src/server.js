const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
const ticketCommentsRoutes = require('./routes/ticketCommentsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const { setSocketServer } = require('./services/socketService');
const {
  getSocketUser,
  resetAllUserPresence,
  registerUserSocket,
  unregisterUserSocket
} = require('./services/presenceService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured. Login and protected routes require it.');
}

const corsOptions = {
  origin: FRONTEND_URL
};

const io = new Server(server, {
  cors: corsOptions
});

setSocketServer(io);

io.use(async (socket, next) => {
  try {
    socket.user = await getSocketUser(socket);
    return next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user && socket.user.id;

  console.log(`Socket connected: ${socket.id}`);

  registerUserSocket(userId, socket.id).catch((error) => {
    console.error('Error updating user presence on socket connect:', error.message);
  });

  socket.on('disconnect', () => {
    unregisterUserSocket(userId, socket.id).catch((error) => {
      console.error('Error updating user presence on socket disconnect:', error.message);
    });
  });
});

app.use(cors(corsOptions));
app.use(express.json()); // recibe los datos en json de postman

app.use((error, req, res, next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      status: 400,
      message: 'Invalid JSON body'
    });
  }

  return next(error);
});

app.use('/', authRoutes); // jala lo de register, login, logout y profile
app.use('/tickets', ticketsRoutes);
app.use('/tickets', ticketCommentsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => { // pa las rutas que no existen
  return res.status(404).json({
    status: 404,
    message: 'Route not found'
  });
});

// al arrancar el backend, pone todos los usuarios como desconectados
resetAllUserPresence()
  .catch((error) => {
    console.error('Error resetting user presence on startup:', error.message);
  })
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
