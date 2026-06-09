import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

export async function PATCH(req: NextRequest) {
  // Admin guard
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const perm = await user.getPermission('access_admin_dashboard');
  if (!perm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { userId, restricted_by_admin, reason, restricted_by_admin_private_details } = await req.json();

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const body: Record<string, any> = { restricted_by_admin };
    if (restricted_by_admin && reason) body.restricted_by_admin_reason = reason;
    if (restricted_by_admin && restricted_by_admin_private_details) {
      body.restricted_by_admin_private_details = restricted_by_admin_private_details;
    }

    const response = await fetch(
      `https://api.hexclave.com/api/v1/users/${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Stack-Access-Type': 'server',
          'X-Stack-Project-Id': process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
          'X-Stack-Secret-Server-Key': process.env.HEXCLAVE_SECRET_SERVER_KEY!,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message ?? `API returned ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}