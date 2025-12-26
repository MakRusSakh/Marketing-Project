import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// Supported platforms
const SUPPORTED_PLATFORMS = [
  'twitter',
  'linkedin',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'pinterest',
  'reddit',
  'medium',
  'dev',
  'hashnode',
] as const;

// GET /api/products/[id]/channels - List channels for product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Product not found',
        },
        { status: 404 }
      );
    }

    // Build where clause
    const where: Prisma.ChannelWhereInput = { productId: id };

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platform = platform;
    }

    const channels = await prisma.channel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: channels,
      meta: {
        productId: id,
        productName: product.name,
        total: channels.length,
      },
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch channels',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/channels - Connect new channel
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Product not found',
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.platform || typeof body.platform !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Platform is required and must be a string',
        },
        { status: 400 }
      );
    }

    const platform = body.platform.toLowerCase().trim();

    // Validate platform is supported
    if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: `Unsupported platform. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate credentials
    if (!body.credentials || typeof body.credentials !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Credentials are required and must be an object',
        },
        { status: 400 }
      );
    }

    // Validate platform-specific credentials
    const requiredFields = getRequiredCredentialFields(platform);
    const missingFields = requiredFields.filter(field => !body.credentials[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: `Missing required credential fields for ${platform}: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate platformName if provided
    if (body.platformName !== undefined && typeof body.platformName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Platform name must be a string',
        },
        { status: 400 }
      );
    }

    // Validate settings if provided
    if (body.settings !== undefined && body.settings !== null && typeof body.settings !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Settings must be an object',
        },
        { status: 400 }
      );
    }

    // Create the channel
    const channel = await prisma.channel.create({
      data: {
        productId: id,
        platform,
        platformName: body.platformName?.trim() || null,
        credentials: body.credentials,
        settings: body.settings || null,
        status: 'active',
      },
      include: {
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: channel,
        message: 'Channel connected successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating channel:', error);

    // Handle unique constraint violation (product + platform must be unique)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Conflict',
            message: 'This platform is already connected to this product',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect channel',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper function to get required credential fields by platform
function getRequiredCredentialFields(platform: string): string[] {
  const fieldMap: Record<string, string[]> = {
    twitter: ['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret'],
    linkedin: ['clientId', 'clientSecret', 'accessToken'],
    facebook: ['appId', 'appSecret', 'accessToken', 'pageId'],
    instagram: ['appId', 'appSecret', 'accessToken', 'accountId'],
    youtube: ['clientId', 'clientSecret', 'accessToken', 'refreshToken'],
    tiktok: ['clientKey', 'clientSecret', 'accessToken'],
    pinterest: ['appId', 'appSecret', 'accessToken'],
    reddit: ['clientId', 'clientSecret', 'username', 'password'],
    medium: ['integrationToken'],
    dev: ['apiKey'],
    hashnode: ['apiKey', 'publicationId'],
  };

  return fieldMap[platform] || ['accessToken'];
}
