import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { input, newAccessToken } = await req.json();
    const apiKey = process.env.PLACES_KEY;

    if (!input) {
      return NextResponse.json({ error: 'Input query parameter is required' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(input)}&key=${apiKey}`;
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Search location error:', error?.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
