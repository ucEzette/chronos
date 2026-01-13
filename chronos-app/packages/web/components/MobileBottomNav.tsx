"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Home, ShoppingCart, PlusCircle, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { address, isConnected } = useAccount();

    // Don't show on homepage
    if (pathname === "/") return null;

    const navItems = [
        { href: "/marketplace", icon: ShoppingCart, label: "Market" },
        { href: "/create-listing", icon: PlusCircle, label: "Create" },
        { href: "/dashboard", icon: LayoutDashboard, label: "Dash" },
        { href: isConnected && address ? `/profile/${address}` : "/marketplace", icon: User, label: "Profile" },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#020e14]/95 backdrop-blur-xl border-t border-white/10 safe-bottom">
            <div className="flex items-center justify-around py-2 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href.split("?")[0]);
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.href)}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all min-w-[60px]",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-white/50 hover:text-white/80 active:scale-95"
                            )}
                        >
                            <Icon size={20} className={cn(isActive && "drop-shadow-[0_0_6px_rgba(19,236,218,0.6)]")} />
                            <span className="text-[10px] font-bold uppercase mt-1">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
