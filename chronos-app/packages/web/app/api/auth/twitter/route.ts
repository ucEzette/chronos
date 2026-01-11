import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAUTH_CONFIG, getCallbackUrl, generateState, generateCodeVerifier, generateCodeChallenge } from '@/lib/oauth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
        return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const config = OAUTH_CONFIG.twitter;

    if (!config.clientId) {
        return NextResponse.json({ error: 'Twitter OAuth not configured' }, { status: 500 });
    }

    // Generate state and PKCE tokens
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state, wallet, and PKCE verifier in cookies
    const cookieStore = cookies();
    cookieStore.set('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
    });
    cookieStore.set('oauth_wallet', walletAddress.toLowerCase(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
    });
    cookieStore.set('oauth_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600
    });

    // Build Twitter authorization URL (OAuth 2.0 with PKCE)
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: getCallbackUrl('twitter'),
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    const authUrl = `${config.authorizeUrl}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
