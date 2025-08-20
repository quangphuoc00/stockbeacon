import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Check if user profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      })
    }
    
    // Create user profile if it doesn't exist
    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        preferences: {},
        risk_tolerance: 'balanced',
        onboarding_completed: false
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating user profile:', insertError)
      return NextResponse.json(
        { error: 'Failed to create user profile', details: insertError },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    })
  } catch (error: any) {
    console.error('Error in fix-profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
