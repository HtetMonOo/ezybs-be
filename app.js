const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { startConsumer, stopConsumer } = require('./consumer');
const BusStop = require('./models/busStop');

const port = 8080;
app.use(express.json());

// Endpoint for getting bus stops
app.get('/bus-stops', (req, res) => {
  BusStop.find()
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get('/gps-data', (req, res) => {
  res.json(nearestBusesData);
});

// Endpoint to get GPS data of one bus
app.get('/gps-data/:busId', (req, res) => {
  const busId = parseInt(req.params.busId, 10);
  const busData = nearestBusesData.filter((data) => data.busId === busId);
  res.json(busData);
});

// Endpoint to get GPS data of buses in range
app.post('/update-bus-stop', async (req, res) => {
  const latitude = req.body?.latitude;
  const longitude = req.body?.longitude;

  const newCoords = { latitude, longitude };
  updateBusStopCoord(newCoords);

  console.log('Bus stop coordinates are updated.');
  startConsumer(io).catch(console.error);
  res.send('Bus stop coordinates are updated.');
});

const connectedUsers = new Map(); //users who started the socket connection
const activeUsers = new Map(); //users who wants to receive gps data

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('searchForBusStop', ({ userId, interestedBusLines, busStop }) => {
    console.log(`User ${userId} is interested in bus lines: ${interestedBusLines}`);
    try {
      let busLinesInTopicFormat = [];
      let busData = [];
      interestedBusLines.forEach((busLine) => {
        busLinesInTopicFormat.push('ybs-' + JSON.stringify(busLine));
      });
      activeUsers.set(userId, { socket, busLinesInTopicFormat, busStop, busData });

      if (activeUsers.size === 1) {
        startConsumer(activeUsers);
      }
      socket.userId = userId;
    } catch (err) {
      console.log('Poor request to search bus stop. Error :', err);
    }
  });

  socket.on('unsubscribe-gps-data', ({ userId }) => {
    console.log(`User ${userId} would like to stop getting data`);
    if (activeUsers.has(userId)) {
      activeUsers.delete(userId);
    }
  });

  socket.on('updateBusStop', ({ userId, interestedBusLines, busStop }) => {
    console.log(`User ${userId} updated interested bus lines to: ${interestedBusLines}`);
    let busLinesInTopicFormat = [];
    interestedBusLines.forEach((busLine) => {
      busLinesInTopicFormat.push('ybs-' + JSON.stringify(busLine));
    });
    if (connectedUsers.has(userId)) {
      connectedUsers.get(userId).interestedBusLines = busLinesInTopicFormat;
      connectedUsers.get(userId).busStop = busStop;
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

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
