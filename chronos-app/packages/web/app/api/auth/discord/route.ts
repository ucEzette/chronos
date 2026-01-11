import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAUTH_CONFIG, getCallbackUrl, generateState } from '@/lib/oauth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const config = OAUTH_CONFIG.discord;

    if (!config.clientId) {
        return NextResponse.json({ error: 'Discord OAuth not configured' }, { status: 500 });
    }

    // Generate state token for CSRF protection
    const state = generateState();

    // Store state and wallet in cookies for callback verification
    const cookieStore = cookies();
    cookieStore.set('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600 // 10 minutes
    });
    cookieStore.set('oauth_wallet', walletAddress.toLowerCase(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
    });

    // Build Discord authorization URL
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: getCallbackUrl('discord'),
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: state,
    });

    const authUrl = `${config.authorizeUrl}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
