//let busStopCoord = { latitude: 0, longitude: 0 };
let previousCoords = [];
let approachDirectionA = 0; // North
let approachDirectionB = 180; // South

// const updateBusStopCoord = (newCoords) => {
//   busStopCoord = newCoords;
// };

const findBusCoords = (previousCoords, busNo) => {
  return previousCoords.find((coords) => coords.busNo === busNo);
};

const updateBusCoords = (previousCoords, busNo, newCoords, speed) => {
  const index = previousCoords.findIndex((coords) => coords.busNo === busNo);
  if (index != -1) {
    previousCoords[index].latitude = newCoords.latitude;
    previousCoords[index].longitude = newCoords.longitude;
    previousCoords[index].speed = speed;
  } else {
    previousCoords.push({
      busNo,
      speed,
      latitude: newCoords.latitude,
      longitude: newCoords.longitude,
    });
  }
};

const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

const toDegrees = (radians) => radians * (180 / Math.PI);

const equirectangularApproximation = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in kilometers

  const lat1Rad = degreesToRadians(lat1);
  const lon1Rad = degreesToRadians(lon1);
  const lat2Rad = degreesToRadians(lat2);
  const lon2Rad = degreesToRadians(lon2);

  const x = (lon2Rad - lon1Rad) * Math.cos((lat1Rad + lat2Rad) / 2);
  const y = lat2Rad - lat1Rad;

  const distance = R * Math.sqrt(x * x + y * y);
  return distance; // Distance in kilometers
};

// Function to calculate the approximate road distance
function approximateRoadDistance(lat1, lon1, lat2, lon2, scalingFactor = 1.2) {
  // Calculate the straight-line distance
  const straightLineDistance = equirectangularApproximation(lat1, lon1, lat2, lon2);

  const roadDistance = straightLineDistance * scalingFactor;

  return roadDistance; // km (* 0.621371 for miles)
}

const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const startLat = degreesToRadians(lat1);
  const startLng = degreesToRadians(lon1);
  const endLat = degreesToRadians(lat2);
  const endLng = degreesToRadians(lon2);

  const dLng = endLng - startLng;

  const x = Math.sin(dLng) * Math.cos(endLat);
  const y =
    Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  const initialBearing = toDegrees(Math.atan2(x, y));
  return (initialBearing + 360) % 360; // Normalize to 0-360 degrees
};

const calculateDurationAndFormat = (data, distance) => {
  let speedForCalc = 0;
  if (data.speed === 0) {
    const index = previousCoords.findIndex((coords) => coords.busNo === data.busNo);
    if (index !== -1) {
      speedForCalc = previousCoords[index].speed;
    }
  } else {
    speedForCalc = data.speed;
  }
  const duration = (distance / parseFloat(speedForCalc)) * 60;
  data.duration = Math.round(duration);

  data.latlng = {
    latitude: data.lat,
    longitude: data.lng,
  };
  delete data.lat;
  delete data.lng;
  return data;
};

const processIncomingData = (data, busStopCoord, busData) => {
  let nearestBusesData = busData;
  const currentCoords = {
    latitude: data.lat,
    longitude: data.lng,
  };

  const previousBusCoords = findBusCoords(previousCoords, data.busNo);

  if (previousBusCoords) {
    const previousDistance = approximateRoadDistance(
      busStopCoord.lat,
      busStopCoord.lng,
      previousBusCoords.latitude,
      previousBusCoords.longitude
    );

    const currentDistance = approximateRoadDistance(
      busStopCoord.lat,
      busStopCoord.lng,
      currentCoords.latitude,
      currentCoords.longitude
    );
    data.currentDistance = currentDistance;

    // Determine if the bus is approaching or moving away
    const approaching = currentDistance < previousDistance;
    data.approaching = approaching;

    if (approaching) {
      const bearing = calculateBearing(
        previousBusCoords.latitude,
        previousBusCoords.longitude,
        currentCoords.latitude,
        currentCoords.longitude
      );

      // Determine the closest approach direction
      const diffToA = Math.abs(bearing - approachDirectionA);
      const diffToB = Math.abs(bearing - approachDirectionB);

      // Handle wrap-around at 0/360 degrees
      const minDiffToA = Math.min(diffToA, 360 - diffToA);
      const minDiffToB = Math.min(diffToB, 360 - diffToB);

      const closestDirection = minDiffToA < minDiffToB ? 'A' : 'B';
      data.closestDirection = closestDirection;

      const index = nearestBusesData.findIndex(
        (bus) => bus.busLine === data.busLine && bus.closestDirection === data.closestDirection
      );

      //const indexOfSameBusNo = nearestBusesData.findIndex((bus) => bus.busNo === data.busNo);

      if (index !== -1) {
        if (nearestBusesData[index].currentDistance > currentDistance) {
          busData = calculateDurationAndFormat(data, currentDistance);
          nearestBusesData[index] = busData;
        }
      } else {
        busData = calculateDurationAndFormat(data, currentDistance);
        nearestBusesData.push(busData);
      }
    } else {
      const indexOfBusPassedTheStop = nearestBusesData.findIndex((bus) => bus.busNo === data.busNo);
      if (indexOfBusPassedTheStop !== -1) {
        nearestBusesData.splice(indexOfBusPassedTheStop, 1);
      }
    }
  }
  updateBusCoords(previousCoords, data.busNo, currentCoords, data.speed);

  return nearestBusesData;
};

module.exports = { processIncomingData };
