'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import { useCart } from './CartContext';
import { cn } from '@/lib/utils';
import {
    ShoppingCart, X, Trash2, Plus, Minus, ArrowRight, Package
} from 'lucide-react';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { items, removeFromCart, updateQuantity, clearCart, getItemCount, getTotalPrice } = useCart();

    const totalItems = getItemCount();
    const totalPrice = getTotalPrice();

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full max-w-md bg-[#020e14] border-l border-white/10 shadow-2xl z-[80] transition-transform duration-300 ease-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <ShoppingCart className="text-primary" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Shopping Cart</h2>
                            <p className="text-xs text-white/40">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="p-6 rounded-full bg-white/5 mb-4">
                                <Package size={40} className="text-white/20" />
                            </div>
                            <h3 className="text-white font-bold mb-2">Cart is Empty</h3>
                            <p className="text-white/40 text-sm mb-6">Add items to start shopping</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold border border-primary/20"
                            >
                                Continue Browsing
                            </button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={`${item.chainId}-${item.itemId}`}
                                className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                            >
                                {/* Thumbnail */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 shrink-0">
                                    {item.previewUrl ? (
                                        <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <Package size={20} className="text-white/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{item.name}</h4>
                                    <p className="text-[10px] text-white/40 mb-2">
                                        {item.chainId === 55931 ? 'DataHaven' : 'Arc'} • {item.fileType}
                                    </p>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(item.itemId, item.chainId, item.quantity - 1)}
                                            className="p-1 rounded bg-white/5 text-white/60 hover:bg-white/10"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="text-xs font-mono text-white w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.itemId, item.chainId, item.quantity + 1)}
                                            className="p-1 rounded bg-white/5 text-white/60 hover:bg-white/10"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Price & Remove */}
                                <div className="flex flex-col items-end justify-between">
                                    <button
                                        onClick={() => removeFromCart(item.itemId, item.chainId)}
                                        className="p-1 text-red-400/60 hover:text-red-400"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white font-mono">
                                            {formatEther(item.price * BigInt(item.quantity))}
                                        </p>
                                        <p className="text-[10px] text-white/40">
                                            {item.chainId === 55931 ? 'MOCK' : 'USDC'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-4 border-t border-white/10 space-y-4 shrink-0">
                        {/* Total */}
                        <div className="flex items-center justify-between">
                            <span className="text-white/60 text-sm">Total</span>
                            <div className="text-right">
                                <p className="text-xl font-bold text-white font-mono">
                                    {formatEther(totalPrice)}
                                </p>
                                <p className="text-[10px] text-white/40">Mixed currencies</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={clearCart}
                                className="px-4 py-3 bg-white/5 text-white/60 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/10 transition-all"
                            >
                                Clear
                            </button>
                            <Link
                                href="/checkout"
                                onClick={onClose}
                                className="flex-1 py-3 bg-primary text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white transition-all"
                            >
                                Checkout <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// Cart Icon Button for Navigation
export function CartButton() {
    const [isOpen, setIsOpen] = useState(false);
    const { getItemCount } = useCart();
    const count = getItemCount();

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
                <ShoppingCart size={18} />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </button>
            <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
