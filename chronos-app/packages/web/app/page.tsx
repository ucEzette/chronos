"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Lock, Shield, Globe, Users, Database, Wallet,
    ArrowRight, ChevronDown, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";

// Feature cards data
const FEATURES = [
    {
        icon: Lock,
        title: "Encrypted Delivery",
        description: "Military-grade AES-256 encryption protects your digital assets until payment is verified."
    },
    {
        icon: Shield,
        title: "Trustless Escrow",
        description: "Smart contracts hold funds securely. No middlemen, no disputes, no chargebacks."
    },
    {
        icon: Globe,
        title: "Multi-Chain Support",
        description: "Trade across DataHaven and Arc testnets with seamless chain switching."
    },
    {
        icon: Users,
        title: "Reputation System",
        description: "Build trust through reviews and sales history. Transparent seller scores."
    },
    {
        icon: Database,
        title: "IPFS Storage",
        description: "Decentralized file hosting ensures your content is always accessible."
    },
    {
        icon: Wallet,
        title: "Web3 Native",
        description: "Connect with MetaMask, WalletConnect, Coinbase, and more."
    }
];

// Stats
const STATS = [
    { value: "100%", label: "Decentralized" },
    { value: "0%", label: "Platform Fees" },
    { value: "∞", label: "Possibilities" },
    { value: "24/7", label: "Availability" }
];

// Hook for scroll-triggered animations
function useInView(threshold = 0.1) {
    const ref = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [threshold]);

    return { ref, isInView };
}

export default function LandingPage() {
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    // Intersection observers for sections
    const statsSection = useInView(0.2);
    const featuresSection = useInView(0.1);
    const howItWorksSection = useInView(0.2);
    const ctaSection = useInView(0.3);

    // Scroll handler
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fallback: force video visible after 1 second
    useEffect(() => {
        const timeout = setTimeout(() => setIsVideoLoaded(true), 1000);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="min-h-screen text-white overflow-x-hidden">
            {/* Hero Section with Video Background */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className={cn(
                            "w-full h-full object-cover transition-opacity duration-1000",
                            isVideoLoaded ? "opacity-40" : "opacity-0"
                        )}
                        onLoadedData={() => setIsVideoLoaded(true)}
                    >
                        <source src="/onewayAnimation.mp4" type="video/mp4" />
                    </video>
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1a2332]/80 via-[#1a2332]/60 to-[#1a2332]" />
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
                    {/* Floating Badge - Glass Style */}
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 btn-glass mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                        <Zap className="text-primary" size={16} />
                        <span className="text-sm font-medium text-white/90 tracking-wide">The Future of Digital Commerce</span>
                    </div>

                    {/* Main Heading - Grenze Gotisch */}
                    <h1
                        className="font-grenze text-6xl md:text-8xl lg:text-9xl font-bold uppercase tracking-tight mb-6 opacity-0 animate-fade-in-up"
                        style={{
                            transform: `translateY(${scrollY * 0.15}px)`,
                            animationDelay: '0.2s',
                            animationFillMode: 'forwards'
                        }}
                    >
                        <span className="text-primary drop-shadow-[0_0_30px_rgba(0,206,209,0.5)]">CHRONOS</span>
                    </h1>

                    {/* Tagline */}
                    <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
                        Decentralized marketplace for encrypted digital artifacts.
                    </p>
                    <p className="text-lg text-primary font-semibold mb-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
                        Trade securely. Own completely.
                    </p>

                    {/* Description */}
                    <p className="text-sm md:text-base text-white/50 max-w-xl mx-auto mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                        Buy and sell digital content with blockchain-powered security.
                        No middlemen. No censorship. Just pure, trustless commerce.
                    </p>

                    {/* CTA Buttons - Glass Style */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                        <Link
                            href="/marketplace"
                            className="group btn-glass-primary px-10 py-4 font-bold text-lg uppercase tracking-wider flex items-center gap-3 btn-shine"
                        >
                            <span>Launch App</span>
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                        </Link>
                        <a
                            href="#features"
                            className="btn-glass px-10 py-4 font-bold text-lg uppercase tracking-wider"
                        >
                            Learn More
                        </a>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
                        <ChevronDown className="text-white/40" size={32} />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section
                ref={statsSection.ref}
                className="relative py-20"
            >
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {STATS.map((stat, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "text-center p-6 glass-card glass-card-hover transition-all duration-500",
                                    statsSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                )}
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <p className="font-grenze text-4xl md:text-5xl font-bold text-primary mb-2 drop-shadow-[0_0_10px_rgba(0,206,209,0.4)]">
                                    {stat.value}
                                </p>
                                <p className="text-sm text-white/50 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section
                id="features"
                ref={featuresSection.ref}
                className="relative py-24"
            >
                <div className="max-w-6xl mx-auto px-6">
                    {/* Section Header */}
                    <div className={cn(
                        "text-center mb-16 transition-all duration-700",
                        featuresSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    )}>
                        <h2 className="font-grenze text-4xl md:text-6xl font-bold uppercase tracking-tight mb-4">
                            Why <span className="text-primary">Chronos</span>?
                        </h2>
                        <p className="text-white/50 max-w-2xl mx-auto">
                            Built for the next generation of digital commerce. Every feature designed with security and decentralization in mind.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "group p-6 glass-card glass-card-hover transition-all duration-500",
                                    featuresSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                )}
                                style={{ transitionDelay: `${200 + i * 100}ms` }}
                            >
                                <div className="size-14 rounded-full btn-glass-circle flex items-center justify-center text-primary mb-4 group-hover:shadow-glow-primary transition-all">
                                    <feature.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-white/50 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section
                ref={howItWorksSection.ref}
                className="relative py-24"
            >
                <div className="max-w-6xl mx-auto px-6">
                    <div className={cn(
                        "text-center mb-16 transition-all duration-700",
                        howItWorksSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    )}>
                        <h2 className="font-grenze text-4xl md:text-6xl font-bold uppercase tracking-tight mb-4">
                            How It <span className="text-primary">Works</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "01", title: "Connect Wallet", desc: "Link your Web3 wallet to access the decentralized marketplace." },
                            { step: "02", title: "Browse & Buy", desc: "Explore digital artifacts. Add to cart and checkout with crypto." },
                            { step: "03", title: "Receive Keys", desc: "Encrypted content unlocks automatically after blockchain confirmation." }
                        ].map((item, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "relative p-8 glass-card transition-all duration-500",
                                    howItWorksSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                                )}
                                style={{ transitionDelay: `${200 + i * 150}ms` }}
                            >
                                <div className="font-grenze text-7xl font-bold text-primary/10 absolute top-4 right-4">{item.step}</div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-white/50">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section
                ref={ctaSection.ref}
                className="relative py-24 overflow-hidden"
            >
                {/* Subtle glow accent */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <div className={cn(
                    "relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-700",
                    ctaSection.isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}>
                    <h2 className="font-grenze text-4xl md:text-7xl font-bold uppercase tracking-tight mb-6">
                        Ready to <span className="text-primary drop-shadow-[0_0_20px_rgba(0,206,209,0.5)]">Trade</span>?
                    </h2>
                    <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                        Join the decentralized revolution. Start buying and selling digital artifacts today.
                    </p>
                    <Link
                        href="/marketplace"
                        className="inline-flex items-center gap-3 btn-glass-primary px-12 py-5 font-bold text-xl uppercase tracking-wider btn-shine"
                    >
                        Enter Marketplace
                        <ArrowRight size={24} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}
