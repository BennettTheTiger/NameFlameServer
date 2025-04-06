const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to make `io` accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

module.exports = { app, server, io };