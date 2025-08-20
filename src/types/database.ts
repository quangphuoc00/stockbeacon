export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          preferences: Json
          risk_tolerance: 'conservative' | 'balanced' | 'growth'
          onboarding_completed: boolean
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          preferences?: Json
          risk_tolerance?: 'conservative' | 'balanced' | 'growth'
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          preferences?: Json
          risk_tolerance?: 'conservative' | 'balanced' | 'growth'
          onboarding_completed?: boolean
        }
      }
      stocks: {
        Row: {
          symbol: string
          company_name: string
          sector: string | null
          industry: string | null
          market_cap: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          symbol: string
          company_name: string
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          symbol?: string
          company_name?: string
          sector?: string | null
          industry?: string | null
          market_cap?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_scores: {
        Row: {
          id: string
          symbol: string
          score: number
          business_quality_score: number
          timing_score: number
          ai_moat_score: number | null
          financial_health_score: number
          growth_score: number
          valuation_score: number
          technical_score: number
          explanation: string | null
          recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          score: number
          business_quality_score: number
          timing_score: number
          ai_moat_score?: number | null
          financial_health_score: number
          growth_score: number
          valuation_score: number
          technical_score: number
          explanation?: string | null
          recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          score?: number
          business_quality_score?: number
          timing_score?: number
          ai_moat_score?: number | null
          financial_health_score?: number
          growth_score?: number
          valuation_score?: number
          technical_score?: number
          explanation?: string | null
          recommendation?: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
          created_at?: string
          updated_at?: string
        }
      }
      stock_data: {
        Row: {
          id: string
          symbol: string
          price: number
          price_change: number
          price_change_percent: number
          volume: number
          market_cap: number | null
          pe_ratio: number | null
          eps: number | null
          dividend_yield: number | null
          week_52_high: number | null
          week_52_low: number | null
          created_at: string
        }
        Insert: {
          id?: string
          symbol: string
          price: number
          price_change?: number
          price_change_percent?: number
          volume?: number
          market_cap?: number | null
          pe_ratio?: number | null
          eps?: number | null
          dividend_yield?: number | null
          week_52_high?: number | null
          week_52_low?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          price?: number
          price_change?: number
          price_change_percent?: number
          volume?: number
          market_cap?: number | null
          pe_ratio?: number | null
          eps?: number | null
          dividend_yield?: number | null
          week_52_high?: number | null
          week_52_low?: number | null
          created_at?: string
        }
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          symbol: string
          target_price: number | null
          alert_enabled: boolean
          notes: string | null
          buy_triggers: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          target_price?: number | null
          alert_enabled?: boolean
          notes?: string | null
          buy_triggers?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          target_price?: number | null
          alert_enabled?: boolean
          notes?: string | null
          buy_triggers?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          symbol: string
          quantity: number
          average_price: number
          current_price: number | null
          total_value: number | null
          gain_loss: number | null
          gain_loss_percent: number | null
          purchased_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          quantity: number
          average_price: number
          current_price?: number | null
          total_value?: number | null
          gain_loss?: number | null
          gain_loss_percent?: number | null
          purchased_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          quantity?: number
          average_price?: number
          current_price?: number | null
          total_value?: number | null
          gain_loss?: number | null
          gain_loss_percent?: number | null
          purchased_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          symbol: string
          alert_type: 'price_target' | 'score_change' | 'perfect_storm' | 'news' | 'earnings'
          condition: Json
          triggered: boolean
          triggered_at: string | null
          message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          alert_type: 'price_target' | 'score_change' | 'perfect_storm' | 'news' | 'earnings'
          condition: Json
          triggered?: boolean
          triggered_at?: string | null
          message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          alert_type?: 'price_target' | 'score_change' | 'perfect_storm' | 'news' | 'earnings'
          condition?: Json
          triggered?: boolean
          triggered_at?: string | null
          message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_moat_analysis: {
        Row: {
          id: string
          symbol: string
          moat_score: number
          brand_loyalty_score: number
          switching_costs_score: number
          network_effects_score: number
          scale_advantages_score: number
          analysis_text: string
          strengths: Json
          weaknesses: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          symbol: string
          moat_score: number
          brand_loyalty_score: number
          switching_costs_score: number
          network_effects_score: number
          scale_advantages_score: number
          analysis_text: string
          strengths?: Json
          weaknesses?: Json
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          moat_score?: number
          brand_loyalty_score?: number
          switching_costs_score?: number
          network_effects_score?: number
          scale_advantages_score?: number
          analysis_text?: string
          strengths?: Json
          weaknesses?: Json
          created_at?: string
          expires_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
