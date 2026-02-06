require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Health check route
app.get('/', (req, res) => {
  res.send('Local Crisis HelpChain backend is running!');
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/localcrisishelpchain';
console.log('Using Mongo URI:', mongoURI);
try { mongoose.set('debug', true); } catch {}
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const requestsRouter = require('./routes/requests');
app.use('/api/requests', requestsRouter);
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);
const volunteersRouter = require('./routes/volunteers');
app.use('/api/volunteers', volunteersRouter);
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 