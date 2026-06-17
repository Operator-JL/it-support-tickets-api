const express = require('express'); //confirma express y carga lo de las rutas del postman
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const ticketsRoutes = require('./routes/ticketsRoutes');
const ticketCommentsRoutes = require('./routes/ticketCommentsRoutes');
const usersRoutes = require('./routes/usersRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173'
}));
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
