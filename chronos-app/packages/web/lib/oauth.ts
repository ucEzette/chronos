// OAuth Configuration and Utilities

export const OAUTH_CONFIG = {
    discord: {
        authorizeUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userUrl: 'https://discord.com/api/users/@me',
        scopes: ['identify'],
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    },
    github: {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        scopes: ['read:user'],
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    twitter: {
        authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        userUrl: 'https://api.twitter.com/2/users/me',
        scopes: ['users.read', 'tweet.read'],
        clientId: process.env.TWITTER_CLIENT_ID || '',
        clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    },
};

export function getCallbackUrl(provider: 'discord' | 'github' | 'twitter'): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/auth/${provider}/callback`;
}

// Generate a random state token for CSRF protection
export function generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate PKCE code verifier for Twitter
export function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

// Generate PKCE code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
