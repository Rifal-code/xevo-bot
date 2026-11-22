// In-memory sliding window fallback jika Redis belum dikonfigurasi / offline
const memoryLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export async function checkRateLimit(
  identifier: string,
  limit = 5,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const current = memoryLimitStore.get(identifier);

  if (!current || now > current.resetTime) {
    memoryLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSeconds: windowSeconds,
    };
  }

  if (current.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetSeconds,
    };
  }

  current.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
  return {
    success: true,
    limit,
    remaining: limit - current.count,
    resetSeconds,
  };
}

export function resetRateLimit(identifier?: string) {
  if (identifier) {
    memoryLimitStore.delete(identifier);
  } else {
    memoryLimitStore.clear();
  }
}
