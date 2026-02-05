/**
 * Rate Limiting Utility
 * - Short-term: IP-based request limiting (e.g., 5 requests per 10 seconds)
 * - Monthly: Total API usage limit
 */

import { getMonthlyUsageStats, getThreshold } from '@/lib/notifications/usage-monitor';

// In-memory store for IP-based rate limiting
const requestTimestamps = new Map<string, number[]>();

// Cache for monthly usage (to avoid DB query on every request)
let monthlyUsageCache: { total: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Configuration
const SHORT_TERM_WINDOW_MS = 10 * 1000; // 10 seconds
const SHORT_TERM_MAX_REQUESTS = 5; // max 5 requests per window

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const cutoff = now - SHORT_TERM_WINDOW_MS;

  for (const [ip, timestamps] of requestTimestamps.entries()) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) {
      requestTimestamps.delete(ip);
    } else {
      requestTimestamps.set(ip, recent);
    }
  }
}

/**
 * Check if an IP is rate limited (short-term)
 * Returns true if the request should be blocked
 */
export function isShortTermRateLimited(ip: string): boolean {
  cleanupOldEntries();

  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];
  const cutoff = now - SHORT_TERM_WINDOW_MS;
  const recentTimestamps = timestamps.filter((t) => t > cutoff);

  if (recentTimestamps.length >= SHORT_TERM_MAX_REQUESTS) {
    return true;
  }

  // Record this request
  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);

  return false;
}

/**
 * Check if monthly usage limit is exceeded
 * Uses caching to reduce DB queries
 */
export async function isMonthlyLimitExceeded(): Promise<{
  exceeded: boolean;
  current: number;
  limit: number;
  percentUsed: number;
}> {
  const now = Date.now();
  const limit = getThreshold();

  // Use cache if valid
  if (monthlyUsageCache && now - monthlyUsageCache.timestamp < CACHE_TTL_MS) {
    const percentUsed = (monthlyUsageCache.total / limit) * 100;
    return {
      exceeded: monthlyUsageCache.total >= limit,
      current: monthlyUsageCache.total,
      limit,
      percentUsed,
    };
  }

  // Fetch fresh data
  const stats = await getMonthlyUsageStats();
  monthlyUsageCache = {
    total: stats.totalRequests,
    timestamp: now,
  };

  const percentUsed = (stats.totalRequests / limit) * 100;
  return {
    exceeded: stats.totalRequests >= limit,
    current: stats.totalRequests,
    limit,
    percentUsed,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  // Cloud Run / Load Balancer
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback
  return headers.get('x-real-ip') || 'unknown';
}

/**
 * Invalidate monthly usage cache (call after logging usage)
 */
export function invalidateMonthlyCache(): void {
  monthlyUsageCache = null;
}

/**
 * Get current rate limit status for an IP (for debugging/monitoring)
 */
export function getRateLimitStatus(ip: string): {
  requestsInWindow: number;
  maxRequests: number;
  windowMs: number;
} {
  const now = Date.now();
  const timestamps = requestTimestamps.get(ip) || [];
  const cutoff = now - SHORT_TERM_WINDOW_MS;
  const recentTimestamps = timestamps.filter((t) => t > cutoff);

  return {
    requestsInWindow: recentTimestamps.length,
    maxRequests: SHORT_TERM_MAX_REQUESTS,
    windowMs: SHORT_TERM_WINDOW_MS,
  };
}
