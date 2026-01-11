// Anime Avatar System for ONEROAD
// Features anime fight characters like Naruto, villains, and popular anime characters

// Array of anime fight character avatar URLs from reliable CDNs
export const ANIME_AVATARS = [
    // Use DiceBear with anime-style seeds for reliable avatars
    // These generate consistent anime-style profile pictures
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Naruto&backgroundColor=ff7f00',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sasuke&backgroundColor=1a1a2e',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Itachi&backgroundColor=8B0000',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Kakashi&backgroundColor=708090',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Madara&backgroundColor=2f2f2f',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Pain&backgroundColor=9b4dca',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Eren&backgroundColor=3a5f0b',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Levi&backgroundColor=1c1c1c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Gojo&backgroundColor=0ea5e9',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sukuna&backgroundColor=dc2626',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Goku&backgroundColor=f97316',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Vegeta&backgroundColor=2563eb',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Luffy&backgroundColor=ef4444',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoro&backgroundColor=22c55e',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Tanjiro&backgroundColor=00bfff',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Zenitsu&backgroundColor=fbbf24',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Shanks&backgroundColor=b91c1c',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Kaido&backgroundColor=4b5563',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aizen&backgroundColor=6b21a8',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ichigo&backgroundColor=f97316',
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

// Generate a unique avatar URL based on wallet address
export function generateUniqueAvatar(address: string): string {
    // Use the wallet address as a seed for consistent but unique avatars
    const hash = address.toLowerCase().split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0);

    // Pick from our curated anime character list
    const index = hash % ANIME_AVATARS.length;
    return ANIME_AVATARS[index];
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
