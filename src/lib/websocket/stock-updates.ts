import { io, Socket } from 'socket.io-client'

interface StockUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: Date
}

interface ScoreUpdate {
  symbol: string
  score: number
  recommendation: string
  timestamp: Date
}

class StockWebSocketService {
  private socket: Socket | null = null
  private subscribers: Map<string, Set<(data: StockUpdate) => void>> = new Map()
  private scoreSubscribers: Map<string, Set<(data: ScoreUpdate) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect()
    }
  }

  private connect() {
    // In production, this would connect to a real WebSocket server
    // For now, we'll simulate with polling Yahoo Finance
    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.resubscribeAll()
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    this.socket.on('stock:update', (data: StockUpdate) => {
      this.notifySubscribers(data.symbol, data)
    })

    this.socket.on('score:update', (data: ScoreUpdate) => {
      this.notifyScoreSubscribers(data.symbol, data)
    })

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error)
    })
  }

  private resubscribeAll() {
    // Resubscribe to all symbols after reconnection
    const symbols = new Set([
      ...Array.from(this.subscribers.keys()),
      ...Array.from(this.scoreSubscribers.keys())
    ])

    symbols.forEach(symbol => {
      this.socket?.emit('subscribe', { symbol })
    })
  }

  subscribeToStock(symbol: string, callback: (data: StockUpdate) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set())
      this.socket?.emit('subscribe', { symbol })
    }
    this.subscribers.get(symbol)?.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol)
      callbacks?.delete(callback)
      if (callbacks?.size === 0) {
        this.subscribers.delete(symbol)
        this.socket?.emit('unsubscribe', { symbol })
      }
    }
  }

  subscribeToScore(symbol: string, callback: (data: ScoreUpdate) => void) {
    if (!this.scoreSubscribers.has(symbol)) {
      this.scoreSubscribers.set(symbol, new Set())
      this.socket?.emit('subscribe:score', { symbol })
    }
    this.scoreSubscribers.get(symbol)?.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.scoreSubscribers.get(symbol)
      callbacks?.delete(callback)
      if (callbacks?.size === 0) {
        this.scoreSubscribers.delete(symbol)
        this.socket?.emit('unsubscribe:score', { symbol })
      }
    }
  }

  private notifySubscribers(symbol: string, data: StockUpdate) {
    const callbacks = this.subscribers.get(symbol)
    callbacks?.forEach(callback => callback(data))
  }

  private notifyScoreSubscribers(symbol: string, data: ScoreUpdate) {
    const callbacks = this.scoreSubscribers.get(symbol)
    callbacks?.forEach(callback => callback(data))
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.subscribers.clear()
    this.scoreSubscribers.clear()
  }

  // Simulate real-time updates for development
  startSimulation(symbols: string[]) {
    if (typeof window === 'undefined') return

    // Simulate price updates every 5 seconds
    setInterval(() => {
      symbols.forEach(symbol => {
        const randomChange = (Math.random() - 0.5) * 2
        const update: StockUpdate = {
          symbol,
          price: 100 + Math.random() * 400,
          change: randomChange,
          changePercent: randomChange / 100,
          volume: Math.floor(Math.random() * 10000000),
          timestamp: new Date()
        }
        this.notifySubscribers(symbol, update)
      })
    }, 5000)

    // Simulate score updates every minute
    setInterval(() => {
      symbols.forEach(symbol => {
        const update: ScoreUpdate = {
          symbol,
          score: Math.floor(Math.random() * 100),
          recommendation: Math.random() > 0.5 ? 'buy' : 'hold',
          timestamp: new Date()
        }
        this.notifyScoreSubscribers(symbol, update)
      })
    }, 60000)
  }
}

// Singleton instance
const stockWebSocket = new StockWebSocketService()

export default stockWebSocket
export type { StockUpdate, ScoreUpdate }
