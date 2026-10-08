import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

const RATE_LIMIT_KEY = 'rateLimit';

type RateLimitOptions = {
  /** Bucket name, so different routes don't share counters. */
  name: string;
  limit: number;
  windowMs: number;
  /** Count separately per value of this route param (e.g. one event's registration link). */
  perParam?: string;
};

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Fixed-window limiter keyed by client IP. In-memory, so limits are per API
 * instance — fine for a single Render service.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const scope = options.perParam
      ? String(request.params?.[options.perParam] ?? '')
      : '';
    const key = `${options.name}:${scope}:${request.ip ?? 'unknown'}`;
    const now = Date.now();

    if (this.hits.size > 10_000) this.sweep(now);

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    entry.count += 1;
    if (entry.count > options.limit) {
      const seconds = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many attempts. Please try again in ${seconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}
