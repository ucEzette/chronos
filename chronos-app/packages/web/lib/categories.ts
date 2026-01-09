import {
    Box,
    Palette,
    Brush,
    Code,
    Brain,
    Heart,
    Music,
    Camera,
    Briefcase,
    GraduationCap,
    Book,
    Headphones,
    Film,
    Gamepad2,
    FileText,
    Package,
    type LucideIcon
} from 'lucide-react';

export interface Category {
    id: string;
    name: string;
    icon: LucideIcon;
    subcategories: string[];
    description: string;
}

export const CATEGORIES: Category[] = [
    {
        id: '3d',
        name: '3D',
        icon: Box,
        subcategories: ['Models', 'Assets', 'Tools', 'Animations', 'Textures'],
        description: '3D models, assets & tools'
    },
    {
        id: 'design',
        name: 'Design',
        icon: Palette,
        subcategories: ['Graphics', 'UI Kits', 'Templates', 'Icons', 'Mockups', 'Fonts'],
        description: 'Graphics, UI kits & templates'
    },
    {
        id: 'drawing',
        name: 'Drawing & Painting',
        icon: Brush,
        subcategories: ['Digital Art', 'Brushes', 'Illustrations', 'Procreate', 'Photoshop'],
        description: 'Digital art, brushes & illustrations'
    },
    {
        id: 'software',
        name: 'Software Development',
        icon: Code,
        subcategories: ['Plugins', 'Scripts', 'APIs', 'Libraries', 'Boilerplates', 'Tools'],
        description: 'Code, plugins & utilities'
    },
    {
        id: 'self-improvement',
        name: 'Self-Improvement',
        icon: Brain,
        subcategories: ['Guides', 'Planners', 'Journals', 'Productivity', 'Mindfulness'],
        description: 'Personal growth guides & planners'
    },
    {
        id: 'fitness',
        name: 'Fitness & Health',
        icon: Heart,
        subcategories: ['Workouts', 'Nutrition', 'Meal Plans', 'Yoga', 'Wellness'],
        description: 'Workout plans & health content'
    },
    {
        id: 'music',
        name: 'Music & Sound Design',
        icon: Music,
        subcategories: ['Tracks', 'Sound Packs', 'Loops', 'Samples', 'SFX', 'Stems'],
        description: 'Music tracks & sound packs'
    },
    {
        id: 'photography',
        name: 'Photography',
        icon: Camera,
        subcategories: ['Photo Packs', 'Presets', 'LUTs', 'Lightroom', 'Stock Photos'],
        description: 'Photo packs & presets'
    },
    {
        id: 'business',
        name: 'Business & Money',
        icon: Briefcase,
        subcategories: ['Templates', 'Courses', 'Spreadsheets', 'Contracts', 'Proposals'],
        description: 'Business templates & financial tools'
    },
    {
        id: 'education',
        name: 'Education',
        icon: GraduationCap,
        subcategories: ['Tutorials', 'Courses', 'Worksheets', 'Languages', 'Coding'],
        description: 'Tutorials & lesson materials'
    },
    {
        id: 'comics',
        name: 'Comics & Novels',
        icon: Book,
        subcategories: ['Comics', 'Manga', 'Graphic Novels', 'Fiction', 'Short Stories'],
        description: 'Comic books & visual stories'
    },
    {
        id: 'audio',
        name: 'Audio',
        icon: Headphones,
        subcategories: ['Podcasts', 'Audiobooks', 'Voice Over', 'ASMR', 'Interviews'],
        description: 'Podcasts & audio files'
    },
    {
        id: 'films',
        name: 'Films & Video',
        icon: Film,
        subcategories: ['Short Films', 'Stock Video', 'Documentaries', 'Tutorials', 'VFX'],
        description: 'Videos & short films'
    },
    {
        id: 'gaming',
        name: 'Gaming',
        icon: Gamepad2,
        subcategories: ['Game Assets', 'Mods', 'Guides', 'Maps', 'Characters', 'Unity', 'Unreal'],
        description: 'Game assets, tools & guides'
    },
    {
        id: 'templates',
        name: 'Templates',
        icon: FileText,
        subcategories: ['Notion', 'Canva', 'PowerPoint', 'Google Docs', 'Figma', 'Excel'],
        description: 'Productivity templates'
    },
    {
        id: 'other',
        name: 'Other',
        icon: Package,
        subcategories: [],
        description: 'Unique & miscellaneous products'
    },
];

// Helper to get category by ID
export function getCategoryById(id: string): Category | undefined {
    return CATEGORIES.find(cat => cat.id === id);
}

// Helper to get all subcategories for a category
export function getSubcategories(categoryId: string): string[] {
    const category = getCategoryById(categoryId);
    return category?.subcategories || [];
}

// Get all category IDs
export function getCategoryIds(): string[] {
    return CATEGORIES.map(cat => cat.id);
}

// Product types (how products are sold)
export const PRODUCT_TYPES = [
    { id: 'digital', name: 'Digital Product', description: 'Files & downloads' },
    { id: 'course', name: 'Course or Tutorial', description: 'Structured lessons' },
    { id: 'ebook', name: 'E-book', description: 'Book or written guide' },
    { id: 'bundle', name: 'Bundle', description: 'Multiple products grouped' },
    { id: 'membership', name: 'Membership', description: 'Subscription access' },
] as const;

export type ProductType = typeof PRODUCT_TYPES[number]['id'];
