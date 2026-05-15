require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");
const app = express();
const server = http.createServer(app);
const adminRoutes = require("./routes/admin");
const { generalLimiter } = require('./middleware/rateLimiter');


/* ==============================
   Socket.io Setup
============================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

/* ==============================
   Middleware
============================== */
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); 

/* Make socket available in routes */
app.set("io", io);

// Apply a general rate limiter to most incoming requests, but keep
// volunteer location updates responsive so GPS syncs do not get throttled.
app.use((req, res, next) => {
  const path = req.originalUrl || req.url || '';
  if (
    path.startsWith('/api/volunteers/me/location') ||
    path.startsWith('/api/volunteers/me/nearby') ||
    path.startsWith('/api/volunteers/me/other-locations')
  ) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// DEBUG: log every incoming request to help diagnose route hits
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} ${req.originalUrl}`);
  next();
});

/* ==============================
   Health Check Route
============================== */
app.get("/", (req, res) => {
  res.send("Local Crisis HelpChain backend is running!");
});

/* ==============================
   Routes
============================== */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/ngo", require("./routes/ngo"));
app.use("/api/volunteers", require("./routes/volunteers"));
app.use("/api/nearby-services", require("./routes/nearbyServices"));
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/ratings", require("./routes/ratings"));

// Debug: print registered routes (robust against missing internals)
setImmediate(() => {
  try {
    const routes = [];
    if (!app._router || !Array.isArray(app._router.stack)) {
      console.log('No router stack available on app yet');
    } else {
      app._router.stack.forEach((middleware) => {
        try {
          if (middleware && middleware.route) {
            const path = middleware.route.path;
            const methods = Object.keys(middleware.route.methods || {}).join(',').toUpperCase();
            routes.push(`${methods} ${path}`);
          } else if (middleware && middleware.name === 'router' && middleware.handle && Array.isArray(middleware.handle.stack)) {
            middleware.handle.stack.forEach((handler) => {
              if (handler && handler.route) {
                const path = handler.route.path;
                const methods = Object.keys(handler.route.methods || {}).join(',').toUpperCase();
                routes.push(`${methods} ${path}`);
              }
            });
          }
        } catch (inner) {
          // continue on inner errors
        }
      });
    }

    console.log('Registered routes:');
    if (routes.length === 0) console.log('  (no routes discovered)');
    routes.forEach(r => console.log(' ', r));
  } catch (e) {
    console.error('Failed to list routes', e);
  }
});

/* ==============================
   Error Handling Middleware
============================== */
// Handle unknown routes
app.use((req, res, next) => {
  console.log('Unhandled route reached:', req.originalUrl);
  next(new AppError(`Route not found - ${req.originalUrl}`, 404));
});
app.use(errorHandler); 

/* ==============================
   MongoDB Connection
============================== */
const mongoURI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/localcrisishelpchain";

mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch(err =>
    console.error("MongoDB connection error:", err)
  );

/* ==============================
   Socket.IO Events
============================== */
io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Track volunteers who register and place them into rooms `vol_<volunteerId>`
io.on('connection', (socket) => {
  socket.on('registerVolunteer', (volunteerId) => {
    try {
      if (volunteerId) {
        const room = `vol_${volunteerId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      }
    } catch (e) {
      console.error('registerVolunteer error', e);
    }
  });

  // IMPROVED: Handle real-time volunteer location updates
  // When a volunteer updates their location, broadcast it to all connected users
  socket.on('volunteerLocationUpdate', (data) => {
    try {
      const { volunteerId, latitude, longitude, timestamp } = data;
      
      if (volunteerId && latitude !== undefined && longitude !== undefined) {
        console.log(`📡 Broadcasting volunteer location: ${volunteerId} at (${latitude}, ${longitude})`);
        
        // Broadcast to all connected clients
        io.emit('volunteerLocationUpdated', {
          volunteerId,
          latitude,
          longitude,
          timestamp: timestamp || Date.now()
        });
      }
    } catch (e) {
      console.error('volunteerLocationUpdate error:', e);
    }
  });
});

/* ==============================
   Start Server
============================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});