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

/* ==============================
   Error Handling Middleware
============================== */
// Handle unknown routes
app.use((req, res, next) => {
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

/* ==============================
   Start Server
============================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});