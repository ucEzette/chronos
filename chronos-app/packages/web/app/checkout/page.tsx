'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useCart } from '@/components/CartContext';
import { PAYLOCK_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import {
    ShoppingCart, ArrowLeft, Trash2, Loader2, Check, AlertCircle, Package
} from 'lucide-react';
import Link from 'next/link';

interface CheckoutItem {
    itemId: string;
    chainId: number;
    status: 'pending' | 'processing' | 'success' | 'error';
    txHash?: string;
    error?: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { address, chain } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { switchChainAsync } = useSwitchChain();
    const { items, removeFromCart, clearCart, getTotalPrice } = useCart();

    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleCheckout = async () => {
        if (items.length === 0 || !address) return;

        setIsProcessing(true);
        setCheckoutItems(items.map(item => ({
            itemId: item.itemId,
            chainId: item.chainId,
            status: 'pending'
        })));

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            setCurrentIndex(i);

            // Update status to processing
            setCheckoutItems(prev => prev.map((ci, idx) =>
                idx === i ? { ...ci, status: 'processing' } : ci
            ));

            try {
                // Switch chain if needed
                if (chain?.id !== item.chainId) {
                    await switchChainAsync({ chainId: item.chainId });
                }

                const contractAddr = CONTRACT_ADDRESSES[item.chainId];

                // Execute purchase
                const tx = await writeContractAsync({
                    address: contractAddr,
                    abi: PAYLOCK_ABI,
                    functionName: 'buyItem',
                    args: [BigInt(item.itemId)],
                    value: item.price * BigInt(item.quantity)
                });

                // Update status to success
                setCheckoutItems(prev => prev.map((ci, idx) =>
                    idx === i ? { ...ci, status: 'success', txHash: tx } : ci
                ));

                // Remove from cart
                removeFromCart(item.itemId, item.chainId);

            } catch (e: any) {
                // Update status to error
                setCheckoutItems(prev => prev.map((ci, idx) =>
                    idx === i ? { ...ci, status: 'error', error: e.message || 'Transaction failed' } : ci
                ));
            }
        }

        setIsProcessing(false);
    };

    const successCount = checkoutItems.filter(ci => ci.status === 'success').length;
    const errorCount = checkoutItems.filter(ci => ci.status === 'error').length;
    const allComplete = checkoutItems.length > 0 && checkoutItems.every(ci => ci.status === 'success' || ci.status === 'error');

    return (
        <div className="min-h-screen bg-[#020e14] text-white flex flex-col">
            <Navigation />

            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Checkout</h1>
                        <p className="text-sm text-white/40">{items.length} item{items.length !== 1 ? 's' : ''} in cart</p>
                    </div>
                </div>

                {items.length === 0 && checkoutItems.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-6 rounded-full bg-white/5 mb-4">
                            <ShoppingCart size={40} className="text-white/20" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
                        <p className="text-white/40 mb-6">Add items to your cart to checkout</p>
                        <Link
                            href="/"
                            className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-white transition-all"
                        >
                            Browse Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Items List */}
                        <div className="lg:col-span-2 space-y-4">
                            {(checkoutItems.length > 0 ? checkoutItems : items.map(item => ({
                                itemId: item.itemId,
                                chainId: item.chainId,
                                status: 'pending' as const
                            }))).map((ci, idx) => {
                                const item = items.find(i => i.itemId === ci.itemId && i.chainId === ci.chainId);

                                return (
                                    <div
                                        key={`${ci.chainId}-${ci.itemId}`}
                                        className={cn(
                                            "flex gap-4 p-4 rounded-xl border transition-all",
                                            ci.status === 'success' ? "bg-green-500/10 border-green-500/20" :
                                                ci.status === 'error' ? "bg-red-500/10 border-red-500/20" :
                                                    ci.status === 'processing' ? "bg-primary/10 border-primary/30" :
                                                        "bg-white/5 border-white/10"
                                        )}
                                    >
                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-900 shrink-0">
                                            {item?.previewUrl ? (
                                                <img src={item.previewUrl} alt={item?.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                    <Package size={20} className="text-white/20" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white truncate">{item?.name || 'Item'}</h3>
                                            <p className="text-xs text-white/40">
                                                {ci.chainId === 55931 ? 'DataHaven' : 'Arc'} • Qty: {item?.quantity || 1}
                                            </p>
                                            {ci.status === 'error' && (
                                                <p className="text-xs text-red-400 mt-1">{ci.error}</p>
                                            )}
                                        </div>

                                        {/* Status/Price */}
                                        <div className="flex flex-col items-end justify-between shrink-0">
                                            {ci.status === 'processing' ? (
                                                <Loader2 size={16} className="text-primary animate-spin" />
                                            ) : ci.status === 'success' ? (
                                                <Check size={16} className="text-green-400" />
                                            ) : ci.status === 'error' ? (
                                                <AlertCircle size={16} className="text-red-400" />
                                            ) : !isProcessing ? (
                                                <button
                                                    onClick={() => item && removeFromCart(item.itemId, item.chainId)}
                                                    className="p-1 text-white/40 hover:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : null}

                                            {item && (
                                                <p className="text-sm font-bold font-mono">
                                                    {formatEther(item.price * BigInt(item.quantity))}
                                                    <span className="text-[10px] text-white/40 ml-1">
                                                        {ci.chainId === 55931 ? 'MOCK' : ci.chainId === 421614 ? 'ETH' : 'USDC'}
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Sidebar */}
                        <div className="space-y-4">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                                <h3 className="font-bold text-lg mb-4">Order Summary</h3>

                                <div className="space-y-2 mb-4 pb-4 border-b border-white/10">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/60">Items</span>
                                        <span>{items.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/60">Total Quantity</span>
                                        <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-white/60">Total</span>
                                    <span className="text-2xl font-bold font-mono">
                                        {formatEther(getTotalPrice())}
                                    </span>
                                </div>

                                {allComplete ? (
                                    <div className="space-y-3">
                                        <p className="text-center text-sm">
                                            <span className="text-green-400">{successCount} successful</span>
                                            {errorCount > 0 && <span className="text-red-400"> • {errorCount} failed</span>}
                                        </p>
                                        <Link
                                            href="/dashboard"
                                            className="block w-full py-3 bg-primary text-black rounded-xl font-bold text-center hover:bg-white transition-all"
                                        >
                                            View Purchases
                                        </Link>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isProcessing || items.length === 0 || !address}
                                        className={cn(
                                            "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                                            isProcessing
                                                ? "bg-primary/20 text-primary cursor-wait"
                                                : "bg-primary text-black hover:bg-white"
                                        )}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Processing {currentIndex + 1}/{items.length}
                                            </>
                                        ) : (
                                            <>Complete Purchase</>
                                        )}
                                    </button>
                                )}

                                {!address && (
                                    <p className="text-xs text-center text-yellow-400 mt-3">
                                        Connect wallet to checkout
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
