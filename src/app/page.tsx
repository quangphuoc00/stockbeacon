import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to StockBeacon</h1>
        <p className="text-xl text-muted-foreground">
          Your intelligent stock analysis platform
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}