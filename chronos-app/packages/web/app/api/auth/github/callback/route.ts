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
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=github_denied`
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

    const config = OAUTH_CONFIG.github;

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code,
                redirect_uri: getCallbackUrl('github'),
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('GitHub token error:', errorData);
            throw new Error('Failed to get GitHub access token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error('No access token in response');
        }

        // Fetch GitHub user info
        const userResponse = await fetch(config.userUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!userResponse.ok) {
            throw new Error('Failed to get GitHub user info');
        }

        const userData = await userResponse.json();
        const githubUsername = userData.login;
        const githubId = userData.id.toString();

        // Save to Supabase
        if (isSupabaseConfigured()) {
            const supabase = getSupabase();
            if (supabase) {
                await supabase
                    .from('profiles')
                    .upsert({
                        wallet_address: walletAddress.toLowerCase(),
                        github: githubUsername,
                        github_id: githubId,
                        github_verified: true,
                    }, {
                        onConflict: 'wallet_address'
                    });
            }
        }

        // Redirect back with success
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?verified=github&username=${encodeURIComponent(githubUsername)}`
        );

    } catch (error) {
        console.error('GitHub OAuth error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/profile/${walletAddress}?error=github_failed`
        );
    }
}
