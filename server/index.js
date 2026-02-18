require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

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
app.use("/api/ngo", require("./routes/ngo"));
app.use(express.json());

/* Make socket available in routes */
app.set("io", io);

/* ==============================
   Health Check Route
============================== */
app.get("/", (req, res) => {
  res.send("Local Crisis HelpChain backend is running!");
});

/* ==============================
   MongoDB Connection
============================== */
const mongoURI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/localcrisishelpchain";

console.log("Using Mongo URI:", mongoURI);

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
   Routes
============================== */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/volunteers", require("./routes/volunteers"));
app.use("/api/admin", require("./routes/admin")); // if exists


/* ==============================
   Start Server
============================== */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
