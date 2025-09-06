import { Redis } from '@upstash/redis'

// Single Redis instance to be reused across the application
let redisInstance: Redis | null = null

export function getRedisInstance(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redisInstance
}
