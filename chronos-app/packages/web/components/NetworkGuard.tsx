"use client";

import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { datahaven, arcTestnet } from '@/lib/chains';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Supported chain IDs
const DATAHAVEN_ID = 55931;
const ARC_ID = 5042002;
const SUPPORTED_CHAIN_IDS = [DATAHAVEN_ID, ARC_ID];

interface NetworkGuardProps {
    children: React.ReactNode;
    requiredChainId?: number;
}

export function NetworkGuard({ children, requiredChainId }: NetworkGuardProps) {
    const { chain, isConnected } = useAccount();
    const { switchChain, isPending } = useSwitchChain();
    const [showWarning, setShowWarning] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const isWrongNetwork = isConnected && chain && !SUPPORTED_CHAIN_IDS.includes(chain.id);
    const needsSpecificNetwork = requiredChainId && isConnected && chain && chain.id !== requiredChainId;

    useEffect(() => {
        if (isWrongNetwork || needsSpecificNetwork) {
            setShowWarning(true);
            setDismissed(false);
        } else {
            setShowWarning(false);
        }
    }, [chain?.id, isWrongNetwork, needsSpecificNetwork]);

    const handleSwitchToDataHaven = () => {
        try {
            switchChain?.({ chainId: DATAHAVEN_ID });
        } catch (e) {
            console.error('Failed to switch network:', e);
        }
    };

    const handleSwitchToArc = () => {
        try {
            switchChain?.({ chainId: ARC_ID });
        } catch (e) {
            console.error('Failed to switch network:', e);
        }
    };

    const getChainName = (id: number) => {
        if (id === DATAHAVEN_ID) return 'DataHaven Testnet';
        if (id === ARC_ID) return 'Arc Testnet';
        return 'Unknown Network';
    };

    const getTargetChainName = () => {
        if (requiredChainId) return getChainName(requiredChainId);
        return 'DataHaven Testnet';
    };

    // Show network warning banner
    if (showWarning && !dismissed) {
        return (
            <>
                {/* Network Warning Banner */}
                <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 to-orange-600 text-white py-3 px-4 shadow-lg">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="animate-pulse" />
                            <div>
                                <p className="font-bold text-sm">
                                    {isWrongNetwork
                                        ? 'Unsupported Network Detected'
                                        : `Please switch to ${getTargetChainName()}`
                                    }
                                </p>
                                <p className="text-xs text-white/80">
                                    {isWrongNetwork
                                        ? `You're connected to ${chain?.name || 'an unsupported network'}. ONEROAD supports DataHaven and Arc testnets.`
                                        : `This action requires ${getTargetChainName()}.`
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSwitchToDataHaven}
                                disabled={isPending}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                    "bg-white text-red-600 hover:bg-white/90",
                                    isPending && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isPending ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                    "Switch to DataHaven"
                                )}
                            </button>

                            <button
                                onClick={handleSwitchToArc}
                                disabled={isPending}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                    "bg-white/20 text-white hover:bg-white/30",
                                    isPending && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                Arc Testnet
                            </button>

                            <button
                                onClick={() => setDismissed(true)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add padding to content for banner */}
                <div className="pt-16">
                    {children}
                </div>
            </>
        );
    }

    return <>{children}</>;
}

// Hook for programmatic network switching
export function useNetworkSwitch() {
    const { chain, isConnected } = useAccount();
    const { switchChain, isPending, error } = useSwitchChain();

    const isSupported = chain && SUPPORTED_CHAIN_IDS.includes(chain.id);

    const switchToDataHaven = async () => {
        try {
            await switchChain?.({ chainId: DATAHAVEN_ID });
            return true;
        } catch (e) {
            console.error('Failed to switch network:', e);
            return false;
        }
    };

    const switchToArc = async () => {
        try {
            await switchChain?.({ chainId: ARC_ID });
            return true;
        } catch (e) {
            console.error('Failed to switch network:', e);
            return false;
        }
    };

    return {
        currentChain: chain,
        isConnected,
        isSupported,
        isPending,
        error,
        switchToDataHaven,
        switchToArc,
        supportedChains: [datahaven, arcTestnet],
        DATAHAVEN_ID,
        ARC_ID
    };
}

// Alert component for inline network warnings
export function NetworkAlert({ requiredChainId }: { requiredChainId?: number }) {
    const { chain, isConnected } = useAccount();
    const { switchChain, isPending } = useSwitchChain();

    const isWrongNetwork = isConnected && chain && !SUPPORTED_CHAIN_IDS.includes(chain.id);
    const needsSwitch = requiredChainId && isConnected && chain && chain.id !== requiredChainId;

    if (!isWrongNetwork && !needsSwitch) return null;

    const targetChainId = requiredChainId || DATAHAVEN_ID;
    const targetName = targetChainId === DATAHAVEN_ID ? 'DataHaven Testnet' : 'Arc Testnet';

    const handleSwitch = () => {
        switchChain?.({ chainId: targetChainId === DATAHAVEN_ID ? DATAHAVEN_ID : ARC_ID });
    };

    return (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-4">
            <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-400 mt-0.5" />
                <div className="flex-1">
                    <p className="font-bold text-orange-400 text-sm">
                        {isWrongNetwork ? 'Wrong Network' : 'Network Switch Required'}
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                        {isWrongNetwork
                            ? `Connect to DataHaven or Arc testnet to continue.`
                            : `Please switch to ${targetName} for this action.`
                        }
                    </p>
                </div>
                <button
                    onClick={handleSwitch}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                    {isPending ? <RefreshCw size={12} className="animate-spin" /> : 'Switch'}
                </button>
            </div>
        </div>
    );
}
