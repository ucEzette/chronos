// Anime Avatar System for CHRONOS
// Provides built-in anime avatars with random assignment and custom upload support

// Array of built-in anime-style avatar URLs (using DiceBear API for consistent generation)
export const ANIME_AVATARS = [
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos1&backgroundColor=00E5FF',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos2&backgroundColor=8B5CF6',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos3&backgroundColor=F43F5E',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos4&backgroundColor=10B981',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos5&backgroundColor=F97316',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos6&backgroundColor=06B6D4',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos7&backgroundColor=EC4899',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos8&backgroundColor=6366F1',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos9&backgroundColor=84CC16',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos10&backgroundColor=EAB308',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos11&backgroundColor=0EA5E9',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=chronos12&backgroundColor=A855F7',
];

// Generate a deterministic avatar based on wallet address
export function getDefaultAvatar(address: string): string {
    // Use the address to generate a consistent index
    const hash = address.toLowerCase().split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0);
    const index = hash % ANIME_AVATARS.length;
    return ANIME_AVATARS[index];
}

// Generate a unique avatar URL based on wallet address (for more variety)
export function generateUniqueAvatar(address: string): string {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${address}&backgroundColor=00E5FF,8B5CF6,F43F5E,10B981`;
}

// Get user's avatar (custom or default)
export function getUserAvatar(address: string, customAvatarUrl?: string): string {
    if (customAvatarUrl && customAvatarUrl.trim().length > 0) {
        return customAvatarUrl;
    }
    return generateUniqueAvatar(address);
}

// Validate if URL is a valid image
export function isValidImageUrl(url: string): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        const ext = parsed.pathname.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '') ||
            url.includes('dicebear.com') ||
            url.includes('imgur.com') ||
            url.includes('ipfs');
    } catch {
        return false;
    }
}
