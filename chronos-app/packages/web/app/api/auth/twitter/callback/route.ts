import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { OAUTH_CONFIG, getCallbackUrl } from '@/lib/oauth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const cookieStore = cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    const walletAddress = cookieStore.get('oauth_wallet')?.value;
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;

    // Clear cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_wallet');
    cookieStore.delete('oauth_code_verifier');

    // Handle errors
    if (error) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=twitter_denied`
        );
    }

    // Verify state to prevent CSRF
    if (!state || state !== storedState) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=invalid_state`
        );
    }

    if (!code || !walletAddress || !codeVerifier) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=missing_params`
        );
    }

    const config = OAUTH_CONFIG.twitter;

    try {
        // Exchange code for access token (Twitter requires Basic Auth)
        const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

        const tokenResponse = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: getCallbackUrl('twitter'),
                code_verifier: codeVerifier,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Twitter token error:', errorData);
            throw new Error('Failed to get Twitter access token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch Twitter user info
        const userResponse = await fetch(config.userUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get Twitter user info');
        }

        const userData = await userResponse.json();
        const twitterUsername = userData.data.username;
        const twitterId = userData.data.id;

        // Save to Supabase
        if (isSupabaseConfigured()) {
            const supabase = getSupabase();
            if (supabase) {
                await supabase
                    .from('profiles')
                    .upsert({
                        wallet_address: walletAddress.toLowerCase(),
                        twitter: twitterUsername,
                        twitter_id: twitterId,
                        twitter_verified: true,
                    }, {
                        onConflict: 'wallet_address'
                    });
            }
        }

        // Redirect back with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?verified=twitter&username=${encodeURIComponent(twitterUsername)}`
        );

    } catch (error) {
        console.error('Twitter OAuth error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=twitter_failed`
        );
    }
}
