import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

type LimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

interface RateLimiter {
  limit(identifier: string): Promise<LimitResult>;
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function createNoopRateLimiter(name: string): RateLimiter {
  return {
    async limit() {
      logger.warn("Rate limiter disabled because Upstash env vars are missing", {
        limiter: name,
      });

      return {
        success: true,
        limit: Number.POSITIVE_INFINITY,
        remaining: Number.POSITIVE_INFINITY,
        reset: Date.now(),
        pending: Promise.resolve(),
      };
    },
  };
}

export const redis =
  upstashUrl && upstashToken
    ? new Redis({
        url: upstashUrl,
        token: upstashToken,
      })
    : null;


export const chatRateLimit: RateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
    })
  : createNoopRateLimiter("chatRateLimit");

export const sessionRateLimit: RateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
    })
  : createNoopRateLimiter("sessionRateLimit");
