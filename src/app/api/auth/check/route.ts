import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.json({
        authenticated: false,
        error: error.message,
      })
    }
    
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        message: 'No user session found',
      })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      }
    })
  } catch (error: any) {
    console.error('Error checking auth:', error)
    return NextResponse.json({
      authenticated: false,
      error: error.message,
    })
  }
}
