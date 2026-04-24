let io;

module.exports = {
  init(httpServer) {
    const { Server } = require('socket.io');
    io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      socket.on('join_outlet', (outletId) => socket.join(`outlet:${outletId}`));
      socket.on('leave_outlet', (outletId) => socket.leave(`outlet:${outletId}`));
    });

    return io;
  },
  getIo() { return io; },
};
