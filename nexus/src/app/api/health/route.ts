import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ServiceStatus {
  database: string;
  redis: string;
  ai: string;
  imageGeneration: string;
}

export async function GET() {
  const health: {
    status: string;
    timestamp: string;
    version: string;
    services: ServiceStatus;
    missingKeys: string[];
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      database: 'unknown',
      redis: 'unknown',
      ai: 'unknown',
      imageGeneration: 'unknown',
    },
    missingKeys: [],
  };

  // Check database connection (REQUIRED)
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'unhealthy';
  }

  // Check Redis connection (OPTIONAL - for queues)
  try {
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 3000,
      });
      await redis.ping();
      health.services.redis = 'connected';
      await redis.quit();
    } else {
      health.services.redis = 'not configured';
      health.missingKeys.push('REDIS_URL');
    }
  } catch (error) {
    health.services.redis = 'disconnected';
  }

  // Check AI services (OPTIONAL)
  if (process.env.ANTHROPIC_API_KEY) {
    health.services.ai = 'configured';
  } else {
    health.services.ai = 'not configured';
    health.missingKeys.push('ANTHROPIC_API_KEY');
  }

  // Check Image Generation (OPTIONAL)
  const hasImageGen =
    process.env.OPENAI_API_KEY ||
    process.env.STABILITY_API_KEY ||
    process.env.REPLICATE_API_TOKEN;

  if (hasImageGen) {
    health.services.imageGeneration = 'configured';
  } else {
    health.services.imageGeneration = 'not configured';
  }

  // Determine overall status
  // Only database is truly required
  if (health.services.database !== 'connected') {
    health.status = 'unhealthy';
  } else if (health.missingKeys.length > 0) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}
