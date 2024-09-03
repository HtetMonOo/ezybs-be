require('dotenv').config();
const { processIncomingData } = require('./utils');
const { Kafka, ErrorCodes } = require('@confluentinc/kafka-javascript').KafkaJS;

let consumer;
let consumerStarted = false;

const CLUSTER_BOOTSTRAP_URL = process.env.CLUSTER_BOOTSTRAP_URL;
const CLUSTER_API_KEY = process.env.CLUSTER_API_KEY;
const CLUSTER_API_SECRET = process.env.CLUSTER_API_SECRET;

const startConsumer = async (activeUsers) => {
  if (consumerStarted) return;
  consumerStarted = true;

  // Initialization
  consumer = new Kafka().consumer(
    {
      'bootstrap.servers': `${CLUSTER_BOOTSTRAP_URL}`,
      'security.protocol': 'SASL_SSL',
      'sasl.mechanisms': 'PLAIN',
      'sasl.username': `${CLUSTER_API_KEY}`,
      'sasl.password': `${CLUSTER_API_SECRET}`,
      'group.id': 'test-group',
      'auto.offset.reset': 'earliest',
      'enable.partition.eof': 'true',
    },
    { kafkaJS: { fromBeginning: true } }
  );

  try {
    await consumer.connect();
    console.log('Consumer connected successfully');
    const topics = ['ybs-88', 'ybs-131'];

    await consumer.subscribe({ topics });

    // const partitions = await consumer.partitionsForEachTopic(topics);
    // for (const partition of partitions) {
    //   const { topic, partition: partitionNumber } = partition;
    //   const offsets = await consumer.offsetsForTimes([{ topic, partition: partitionNumber, timestamp: Date.now() }]);
    //   console.log(`Current offset for topic ${topic}, partition ${partitionNumber}:`, offsets[0].offset);
    // }

    // // Optionally, reset offset to the beginning for each partition
    // for (const topic of topics) {
    //   const partitions = await consumer.partitionsForEachTopic([topic]);
    //   for (const partition of partitions) {
    //     consumer.seek({
    //       topic,
    //       partition: partition.partition,
    //       offset: '0', // Reset to the beginning
    //     });
    //   }
    // }

    consumer.run({
      eachMessage: async ({ topic, message }) => {
        const data = JSON.parse(message.value.toString());
        data.topic = topic;
        activeUsers.forEach((user, userId) => {
          const { socket, busLinesInTopicFormat, busStop, busData } = user;
          console.log(`user : ${userId} } | interestedBusLines : ${busLinesInTopicFormat}`);
          if (busLinesInTopicFormat.includes(topic)) {
            let processedData = processIncomingData(data, busStop, busData);
            processedData.forEach((data) => {
              console.log(`busNo : ${data.busNo} | busLine : ${data.busLine}`);
            });

            socket.emit('gps-data', processedData);
            console.log(`Sent data to user ${userId}`);
          }
        });
        console.log('_______________________________');
      },
    });
  } catch (error) {
    console.error('Error producing message:', error);
  }
};

const stopConsumer = async () => {
  if (!consumerStarted) return;
  consumerStarted = false;
  try {
    stopped = true;
    consumer
      .commitOffsets()
      .finally(() => consumer.disconnect())
      .finally(() => console.log('Disconnected successfully'));
  } catch (err) {
    console.log('Error disconnecting consumer:', err);
  }
};

module.exports = { startConsumer, stopConsumer };
// updateBusStopCoord({ latitude: '16.779525351941228', longitude: '96.15056259557605' });
// startConsumer(['ybs-88', 'ybs-131']);
