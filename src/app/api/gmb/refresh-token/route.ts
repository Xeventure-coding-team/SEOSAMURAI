import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { stackServerApp } from '@/stack';

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { refresh_token } = body;

    let refreshTokenToUse = refresh_token;

    // If no refresh token provided, get it from the database
    if (!refreshTokenToUse) {
      const integration = await prisma.gmbIntegration.findUnique({
        where: { userId: user.id },
        select: { refreshToken: true, isActive: true },
      });

      if (!integration?.isActive || !integration.refreshToken) {
        return NextResponse.json({ error: 'No valid refresh token found' }, { status: 400 });
      }

      refreshTokenToUse = integration.refreshToken;
    }

    // Call Google's token endpoint
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
        client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET!,
        refresh_token: refreshTokenToUse,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google token refresh failed:', data);
      
      // If refresh token is invalid, mark integration as inactive
      if (data.error === 'invalid_grant') {
        await prisma.gmbIntegration.updateMany({
          where: { userId: user.id },
          data: { isActive: false, updatedAt: new Date() },
        });
      }
      
      return NextResponse.json({ 
        error: data.error_description || data.error || 'Token refresh failed' 
      }, { status: 400 });
    }

    // Update the database with new tokens
    const tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
    
    const updatedIntegration = await prisma.gmbIntegration.updateMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshTokenToUse, // Keep old refresh token if new one not provided
        tokenExpiry,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Check if any records were updated
    if (updatedIntegration.count === 0) {
      return NextResponse.json({ error: 'No active integration found to update' }, { status: 404 });
    }

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshTokenToUse,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Check if user has a valid refresh token and token status
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integration = await prisma.gmbIntegration.findUnique({
      where: { userId: user.id },
      select: { 
        refreshToken: true, 
        isActive: true,
        tokenExpiry: true,
        accessToken: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ 
        hasValidRefreshToken: false,
        isTokenExpired: true,
        canRefresh: false,
        hasIntegration: false
      });
    }

    const hasValidRefreshToken = integration.isActive && !!integration.refreshToken;
    const isTokenExpired = integration.tokenExpiry ? new Date() > integration.tokenExpiry : true;
    const hasAccessToken = !!integration.accessToken;

    return NextResponse.json({ 
      hasValidRefreshToken,
      isTokenExpired,
      canRefresh: hasValidRefreshToken,
      hasIntegration: true,
      hasAccessToken,
      isActive: integration.isActive
    });

  } catch (error) {
    console.error('Error checking refresh token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}