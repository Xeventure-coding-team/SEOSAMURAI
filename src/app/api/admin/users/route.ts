import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '../../../../../lib/require-access';

export async function GET(req: NextRequest) {
  try {

    const { error } = await requireAccess("access_admin_dashboard");
    if (error) return error;

    const params = req.nextUrl.searchParams;
    const response = await fetch(
      `https://api.hexclave.com/api/v1/users?${params.toString()}&include_restricted=true`,
      {
        headers: {
          'X-Stack-Access-Type': 'server',
          'X-Stack-Project-Id': process.env.NEXT_PUBLIC_HEXCLAVE_PROJECT_ID!,
          'X-Stack-Secret-Server-Key': process.env.HEXCLAVE_SECRET_SERVER_KEY!,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();


    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}