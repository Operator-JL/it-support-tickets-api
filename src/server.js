const express = require('express'); //confirma express y carga lo de las rutas del postman
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
const ticketCommentsRoutes = require('./routes/ticketCommentsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const { setSocketServer } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const corsOptions = {
  origin: FRONTEND_URL
};

const io = new Server(server, {
  cors: corsOptions
});

setSocketServer(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
});

app.use(cors(corsOptions));
app.use(express.json()); //recibe los datos en json de postman
app.use('/', authRoutes); // jala lo de register, login y profile
app.use('/tickets', ticketsRoutes);
app.use('/tickets', ticketCommentsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => { // pa las rutas que no existen
  return res.status(404).json({
    status: 404,
    message: 'Route not found'
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
