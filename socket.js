const server = require('http').createServer();
const io = require('socket.io')(server);
const { Socket } = require('socket.io');
const { startConsumer, stopConsumer } = require('./consumer');

const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('searchForBusStop', ({ userId, interestedBusLines, busStop }) => {
    console.log(`User ${userId} is interested in bus lines: ${interestedBusLines}`);
    let busLinesInTopicFormat = [];
    interestedBusLines.forEach((busLine) => {
      busLinesInTopicFormat.push('ybs-' + JSON.stringify(busLine));
    });
    activeUsers.set(userId, { socket, busLinesInTopicFormat, busStop });

    if (activeUsers.size === 1) {
      startConsumer(activeUsers);
    }

    socket.userId = userId;
  });

  socket.on('updateBusStop', ({ userId, newInterestedBusLines, busStop }) => {
    console.log(`User ${userId} updated interested bus lines to: ${newInterestedBusLines}`);
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).interestedBusLines = newInterestedBusLines;
      activeUsers.get(userId).busStop = busStop;
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    activeUsers.delete(socket.userId);

    if (activeUsers.size === 0) {
      stopConsumer();
    }
  });
});

module.exports = io;
