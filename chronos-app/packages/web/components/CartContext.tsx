'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Cart Item Interface
export interface CartItem {
    itemId: string;
    chainId: number;
    quantity: number;
    price: bigint;
    name: string;
    previewUrl: string;
    seller: string;
    fileType: string;
    category?: string;
}

// Cart Context Interface
interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (itemId: string, chainId: number) => void;
    updateQuantity: (itemId: string, chainId: number, quantity: number) => void;
    clearCart: () => void;
    getItemCount: () => number;
    getTotalPrice: () => bigint;
    isInCart: (itemId: string, chainId: number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'chronos_cart';

// Serialize cart for storage (BigInt to string)
function serializeCart(items: CartItem[]): string {
    return JSON.stringify(items.map(item => ({
        ...item,
        price: item.price.toString()
    })));
}

// Deserialize cart from storage (string to BigInt)
function deserializeCart(data: string): CartItem[] {
    try {
        const parsed = JSON.parse(data);
        return parsed.map((item: any) => ({
            ...item,
            price: BigInt(item.price)
        }));
    } catch {
        return [];
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [mounted, setMounted] = useState(false);

    // Load cart from localStorage on mount
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
            setItems(deserializeCart(stored));
        }
    }, []);

    // Save cart to localStorage on change
    useEffect(() => {
        if (mounted) {
            localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
        }
    }, [items, mounted]);

    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
        setItems(prev => {
            const existing = prev.find(i => i.itemId === item.itemId && i.chainId === item.chainId);
            if (existing) {
                // Increase quantity if already in cart
                return prev.map(i =>
                    i.itemId === item.itemId && i.chainId === item.chainId
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            // Add new item with quantity 1
            return [...prev, { ...item, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((itemId: string, chainId: number) => {
        setItems(prev => prev.filter(i => !(i.itemId === itemId && i.chainId === chainId)));
    }, []);

    const updateQuantity = useCallback((itemId: string, chainId: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(itemId, chainId);
            return;
        }
        setItems(prev => prev.map(i =>
            i.itemId === itemId && i.chainId === chainId
                ? { ...i, quantity }
                : i
        ));
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const getItemCount = useCallback(() => {
        return items.reduce((total, item) => total + item.quantity, 0);
    }, [items]);

    const getTotalPrice = useCallback(() => {
        return items.reduce((total, item) => total + (item.price * BigInt(item.quantity)), BigInt(0));
    }, [items]);

    const isInCart = useCallback((itemId: string, chainId: number) => {
        return items.some(i => i.itemId === itemId && i.chainId === chainId);
    }, [items]);

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            getItemCount,
            getTotalPrice,
            isInCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
