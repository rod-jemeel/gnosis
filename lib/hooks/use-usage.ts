'use client'

/**
 * Usage Tracking Hook
 *
 * Fetches and manages API usage data for the current user.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UsageData {
  requestCount: number
  totalTokens: number
  monthlyRequestLimit: number
  monthlyTokenLimit: number
  requestPercentage: number
  tokenPercentage: number
}

export interface UsageLog {
  id: string
  action: string
  tokensUsed: number
  costCents: number
  createdAt: Date
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch current month usage via RPC
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_current_month_usage')
        .single()

      if (usageError) {
        // If function doesn't exist, return defaults
        if (usageError.code === '42883' || usageError.message.includes('function')) {
          setUsage({
            requestCount: 0,
            totalTokens: 0,
            monthlyRequestLimit: 1000,
            monthlyTokenLimit: 100000,
            requestPercentage: 0,
            tokenPercentage: 0,
          })
        } else {
          throw usageError
        }
      } else if (usageData) {
        const requestCount = usageData.request_count || 0
        const totalTokens = usageData.total_tokens || 0
        const monthlyRequestLimit = usageData.monthly_request_limit || 1000
        const monthlyTokenLimit = usageData.monthly_token_limit || 100000

        setUsage({
          requestCount,
          totalTokens,
          monthlyRequestLimit,
          monthlyTokenLimit,
          requestPercentage: Math.min((requestCount / monthlyRequestLimit) * 100, 100),
          tokenPercentage: Math.min((totalTokens / monthlyTokenLimit) * 100, 100),
        })
      } else {
        // No data yet
        setUsage({
          requestCount: 0,
          totalTokens: 0,
          monthlyRequestLimit: 1000,
          monthlyTokenLimit: 100000,
          requestPercentage: 0,
          tokenPercentage: 0,
        })
      }

      // Fetch recent usage logs
      const { data: logsData } = await supabase
        .from('usage_logs')
        .select('id, action, tokens_used, cost_cents, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (logsData) {
        setRecentLogs(
          logsData.map((log) => ({
            id: log.id,
            action: log.action,
            tokensUsed: log.tokens_used,
            costCents: log.cost_cents,
            createdAt: new Date(log.created_at),
          }))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  return {
    usage,
    recentLogs,
    loading,
    error,
    refresh: fetchUsage,
  }
}
