/**
 * File Upload API Route
 * 
 * Handles file uploads to decentralized storage.
 * S3 credentials are kept server-side for security.
 * 
 * POST /api/upload
 * Body: FormData with 'file' field
 * Returns: { cid, url, provider, size, contentType }
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Route Segment Config (App Router)
export const maxDuration = 60; // 60 seconds
export const dynamic = 'force-dynamic';

const FILEBASE_ENDPOINT = 'https://s3.filebase.com';
const FILEBASE_REGION = 'us-east-1';

// Create S3 client for Filebase
function getFilebaseClient(): S3Client | null {
    const accessKey = process.env.FILEBASE_ACCESS_KEY;
    const secretKey = process.env.FILEBASE_SECRET_KEY;

    if (!accessKey || !secretKey) {
        return null;
    }

    return new S3Client({
        endpoint: FILEBASE_ENDPOINT,
        region: FILEBASE_REGION,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        forcePathStyle: true,
    });
}

export async function POST(request: NextRequest) {
    try {
        console.log('[Upload] Starting file upload...');

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const isEncrypted = formData.get('encrypted') === 'true';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        console.log(`[Upload] File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

        const provider = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'mock';
        console.log(`[Upload] Using provider: ${provider}`);

        // Handle Filebase uploads
        if (provider === 'filebase') {
            const client = getFilebaseClient();

            if (!client) {
                console.error('[Upload] Filebase credentials not found');
                return NextResponse.json(
                    { error: 'Filebase not configured. Set FILEBASE_ACCESS_KEY and FILEBASE_SECRET_KEY.' },
                    { status: 500 }
                );
            }

            const bucket = process.env.FILEBASE_BUCKET || 'chronos-files';
            const gateway = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY || 'https://ipfs.filebase.io/ipfs';

            console.log(`[Upload] Bucket: ${bucket}, Gateway: ${gateway}`);

            // Generate unique key
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `${timestamp}-${randomId}-${safeFilename}`;

            console.log(`[Upload] Generated key: ${key}`);

            // Convert to buffer
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log(`[Upload] Buffer size: ${buffer.length} bytes`);

            try {
                // Upload to Filebase
                console.log('[Upload] Uploading to Filebase...');
                await client.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: buffer,
                    ContentType: file.type || 'application/octet-stream',
                    Metadata: {
                        encrypted: isEncrypted ? 'true' : 'false',
                        originalName: file.name,
                    },
                }));

                console.log('[Upload] Upload complete, fetching CID...');

                // Get CID from metadata
                const headResponse = await client.send(new HeadObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }));

                console.log('[Upload] HeadObject response metadata:', headResponse.Metadata);

                const cid = headResponse.Metadata?.['cid'];

                if (!cid) {
                    console.error('[Upload] No CID in response metadata');
                    return NextResponse.json(
                        { error: 'Failed to get CID from Filebase. Check that bucket is configured for IPFS.' },
                        { status: 500 }
                    );
                }

                console.log(`[Upload] Success! CID: ${cid}`);

                return NextResponse.json({
                    cid,
                    url: `${gateway}/${cid}`,
                    provider: 'filebase',
                    size: file.size,
                    contentType: file.type,
                });
            } catch (filebaseError: any) {
                console.error('[Upload] Filebase error:', filebaseError);
                return NextResponse.json(
                    { error: `Filebase upload failed: ${filebaseError.message}` },
                    { status: 500 }
                );
            }
        }

        // Mock provider for development
        console.log('[Upload] Using mock provider...');
        await new Promise(resolve => setTimeout(resolve, 500));

        const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let mockCid = 'Qm';
        for (let i = 0; i < 44; i++) {
            mockCid += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        console.log(`[Upload] Mock CID generated: ${mockCid}`);

        return NextResponse.json({
            cid: mockCid,
            url: '',
            provider: 'mock',
            size: file.size,
            contentType: file.type,
        });

    } catch (error: any) {
        console.error('[Upload] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
