import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get('access_token');

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { accounts } = response.data;

    if (accounts && accounts.length > 0) {
      const accountName = accounts[0].name;
      const accountId = accounts[0].name.split('/')[1];
      return NextResponse.json({ accountName, accountId });
    } else {
      return NextResponse.json({ error: 'No accounts found' });
    }
  } catch (error: any) {
    console.error('Error fetching connected accounts:', error?.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to fetch connected accounts' }, { status: 500 });
  }
}
