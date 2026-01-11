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

    // Clear cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_wallet');

    // Handle errors
    if (error) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=discord_denied`
        );
    }

    // Verify state to prevent CSRF
    if (!state || state !== storedState) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=invalid_state`
        );
    }

    if (!code || !walletAddress) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=missing_params`
        );
    }

    const config = OAUTH_CONFIG.discord;

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: getCallbackUrl('discord'),
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Discord token error:', errorData);
            throw new Error('Failed to get Discord access token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch Discord user info
        const userResponse = await fetch(config.userUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get Discord user info');
        }

        const userData = await userResponse.json();
        const discordUsername = userData.username;
        const discordId = userData.id;

        // Save to Supabase
        if (isSupabaseConfigured()) {
            const supabase = getSupabase();
            if (supabase) {
                await supabase
                    .from('profiles')
                    .upsert({
                        wallet_address: walletAddress.toLowerCase(),
                        discord: discordUsername,
                        discord_id: discordId,
                        discord_verified: true,
                    }, {
                        onConflict: 'wallet_address'
                    });
            }
        }

        // Also save to localStorage via redirect with query params
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?verified=discord&username=${encodeURIComponent(discordUsername)}`
        );

    } catch (error) {
        console.error('Discord OAuth error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=discord_failed`
        );
    }
}
