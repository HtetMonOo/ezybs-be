const kafka = require('kafkajs');

class KafkaConfig {
  constructor() {
    this.kafka = new kafka({
      clientId: 'gps-kafka',
      brokers: ['localhost:9093'],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'test-group' });
  }

  async produce(topic, messages) {
    try {
      await this.producer.connect();
      console.log('Producer connected');
      await this.producer.send({
        topic: topic,
        messages: messages,
      });
    } catch (error) {
      console.log(error);
    } finally {
      this.producer.disconnect();
    }
  }

  async consume(topic, callBack) {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: topic,
        fromBeginning: true,
      });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const value = message.value.toString();
          callBack(value);
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = KafkaConfig;
