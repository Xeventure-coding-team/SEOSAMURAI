import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';

const BASE = 'https://api.hexclave.com/api/v1';

const serverHeaders = {
  'Content-Type': 'application/json',
  'X-Stack-Access-Type': 'server',
  'X-Stack-Project-Id': process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
  'X-Stack-Secret-Server-Key': process.env.HEXCLAVE_SECRET_SERVER_KEY!,
};

async function requireAdmin(): Promise<Response | null> {
  const user = await stackServerApp.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const perm = await user.getPermission('access_admin_dashboard');
  if (!perm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// PATCH /api/admin/users/[userId]  — ban / unban
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const res = await fetch(`${BASE}/users/${params.userId}`, {
      method: 'PATCH',
      headers: serverHeaders,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message ?? `API returned ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}