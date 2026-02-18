import Redis from 'ioredis';

// Define a global type to prevent multiple instances in development
const globalForRedis = global as unknown as { redis: Redis };

const redisConfig = {
  // Retry strategy so the engine doesn't crash if Redis is rebooting
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  // Max retries per request
  maxRetriesPerRequest: 3,
  // Enable offline queue to buffer commands during reconnect
  enableOfflineQueue: true,
};

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

export default redis;
