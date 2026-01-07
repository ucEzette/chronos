import { NextRequest, NextResponse } from 'next/server';
import { MspClient } from '@storagehub-sdk/msp-client';

const MSP_URL = process.env.NEXT_PUBLIC_MSP_URL || 'https://deo-dh-backend.testnet.datahaven-infra.network/';

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  let fileKey = params.key;

  if (!fileKey) return new NextResponse('Missing Key', { status: 400 });

  // --- SANITIZATION ---
  // Ensure we are passing ONLY the Hex Key to the MSP
  // If the key comes in as "api/files/0x123", strip the prefix.
  if (fileKey.includes("files/")) {
    fileKey = fileKey.split("files/").pop() || fileKey;
  }

  try {
    const mspClient = await MspClient.connect({ baseUrl: MSP_URL });
    const result = await mspClient.files.downloadFile(fileKey);

    if (result.status !== 200 || !result.stream) {
      console.warn(`[Proxy 404] Key: ${fileKey}`);
      return new NextResponse('File not found', { status: 404 });
    }

    const headers = new Headers();
    if (result.contentType) headers.set('Content-Type', result.contentType);
    
    // Disable caching to prevent 404s from sticking during upload propagation
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    // @ts-ignore
    return new NextResponse(result.stream, { headers });

  } catch (error) {
    console.error('[Proxy Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}