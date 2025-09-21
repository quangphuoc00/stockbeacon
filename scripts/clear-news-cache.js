import { Redis } from '@upstash/redis'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function clearNewsCache() {
  try {
    console.log('Clearing news analysis cache...')
    
    // Get all news analysis keys
    const pattern = 'news:analysis:*'
    const keys = await redis.keys(pattern)
    
    if (keys.length === 0) {
      console.log('No cached news analysis found')
      return
    }
    
    console.log(`Found ${keys.length} cached entries`)
    
    // Delete all keys
    for (const key of keys) {
      await redis.del(key)
      console.log(`Deleted: ${key}`)
    }
    
    console.log('✅ News analysis cache cleared successfully')
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

clearNewsCache()
