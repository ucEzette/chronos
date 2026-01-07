import { NextRequest, NextResponse } from 'next/server';
import { MspClient } from '@storagehub-sdk/msp-client';

// Use the testnet MSP URL (or env var)
const MSP_URL = process.env.NEXT_PUBLIC_MSP_URL || 'https://deo-dh-backend.testnet.datahaven-infra.network/';

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const fileKey = params.key;

  if (!fileKey) {
    return new NextResponse('Missing file key', { status: 400 });
  }

  // --- MIDDLEWARE / AUTH CHECK PLACEHOLDER ---
  // Here is where you would restrict access:
  // 1. Get user session from cookies/headers
  // 2. Check smart contract if user has "bought" this item
  // 3. If not, return new NextResponse('Payment Required', { status: 402 });
  // -------------------------------------------

  try {
    // 1. Connect to MSP
    const mspClient = await MspClient.connect({ baseUrl: MSP_URL });

    // 2. Request the file download stream using the key
    const result = await mspClient.files.downloadFile(fileKey);

    // 3. Handle errors (e.g., file not found)
    if (result.status !== 200 || !result.stream) {
      console.error(`Download failed: ${result.status}`);
      return new NextResponse('File not found or MSP error', { status: 404 });
    }

    // 4. Stream the data back to the client
    const headers = new Headers();
    if (result.contentType) {
      headers.set('Content-Type', result.contentType);
    }
    // Set caching headers for better performance
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Return the stream directly
    // @ts-ignore: Next.js types for ReadableStream can be strict, logic is handled internally
    return new NextResponse(result.stream, { headers });

  } catch (error) {
    console.error('DataHaven Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}