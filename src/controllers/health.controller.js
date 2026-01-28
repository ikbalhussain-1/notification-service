const RedisAdapter = require('../adapters/redis.adapter');
const KafkaProducer = require('../adapters/kafka/producer');

class HealthController {
  constructor(redisAdapter, kafkaProducer) {
    this.redis = redisAdapter;
    this.kafka = kafkaProducer;
  }

  health = async (req, res) => {
    const redisStatus = this.redis.getConnectionStatus() ? 'connected' : 'disconnected';
    const kafkaStatus = this.kafka.getConnectionStatus() ? 'connected' : 'disconnected';

    let status = 'healthy';
    if (kafkaStatus === 'disconnected') {
      status = 'unhealthy';
    } else if (redisStatus === 'disconnected') {
      status = 'degraded';
    }

    res.json({
      status,
      timestamp: new Date().toISOString(),
      checks: {
        redis: redisStatus,
        kafka: kafkaStatus,
      },
    });
  };

  ready = async (req, res) => {
    const kafkaReady = this.kafka.getConnectionStatus();
    
    res.json({
      ready: kafkaReady,
      timestamp: new Date().toISOString(),
    });
  };
}

module.exports = HealthController;
