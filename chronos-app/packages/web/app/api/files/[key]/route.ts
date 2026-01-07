import { NextRequest, NextResponse } from 'next/server';
import { MspClient } from '@storagehub-sdk/msp-client';

const MSP_URL = process.env.NEXT_PUBLIC_MSP_URL || 'https://deo-dh-backend.testnet.datahaven-infra.network/';

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  const fileKey = params.key;

  if (!fileKey) return new NextResponse('Missing Key', { status: 400 });

  // Safety Net: If a legacy IPFS key hits the proxy, redirect immediately
  if (fileKey.startsWith("Qm")) {
     return NextResponse.redirect(`https://cloudflare-ipfs.com/ipfs/${fileKey}`);
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
    
    // DISABLE CACHING: Ensures we don't cache 404s while waiting for propagation
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    // @ts-ignore
    return new NextResponse(result.stream, { headers });

  } catch (error) {
    console.error('[Proxy Error]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}