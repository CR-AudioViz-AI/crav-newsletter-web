interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
  refillInterval: number;
}

const configs: Record<string, RateLimitConfig> = {
  login: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 900000,
  },
  schedule: {
    maxTokens: 10,
    refillRate: 1,
    refillInterval: 3600000,
  },
  webhook: {
    maxTokens: 1000,
    refillRate: 1000,
    refillInterval: 60000,
  },
};

function refillBucket(bucket: TokenBucket, config: RateLimitConfig): void {
  const now = Date.now();
  const timePassed = now - bucket.lastRefill;
  const intervalsElapsed = Math.floor(timePassed / config.refillInterval);

  if (intervalsElapsed > 0) {
    bucket.tokens = Math.min(
      config.maxTokens,
      bucket.tokens + (intervalsElapsed * config.refillRate)
    );
    bucket.lastRefill = now;
  }
}

export async function checkRateLimit(
  key: string,
  type: keyof typeof configs,
  tokens: number = 1
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = configs[type];

  if (!config) {
    throw new Error(`Unknown rate limit type: ${type}`);
  }

  const bucketKey = `${type}:${key}`;
  let bucket = buckets.get(bucketKey);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
    };
    buckets.set(bucketKey, bucket);
  }

  refillBucket(bucket, config);

  if (bucket.tokens >= tokens) {
    bucket.tokens -= tokens;
    return { allowed: true };
  }

  const retryAfter = Math.ceil(config.refillInterval / 1000);

  return {
    allowed: false,
    retryAfter,
  };
}

export function rateLimitMiddleware(type: keyof typeof configs) {
  return async (req: Request, identifier: string) => {
    const result = await checkRateLimit(identifier, type);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
          },
        }
      );
    }

    return null;
  };
}

setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}, 60 * 60 * 1000);
