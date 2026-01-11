"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Lock, Database, Globe, Wallet, FileKey, Download, CheckCircle } from "lucide-react";
import { Footer } from "@/components/Footer";

// Top creators mock data
const CREATORS = [
    { name: "CryptoArtist_01", role: "Digital Art Creator", earned: "142.5 ETH" },
    { name: "DataVault_Pro", role: "Dataset Provider", earned: "98.2 ETH" },
    { name: "SoundWave_X", role: "Audio Producer", earned: "85.9 ETH" },
    { name: "CodeMaster_Dev", role: "Software Developer", earned: "64.1 ETH" }
];

// How It Works steps
const STEPS = [
    {
        step: "01",
        icon: Wallet,
        title: "Connect Wallet",
        description: "Link your Web3 wallet to access the decentralized marketplace securely."
    },
    {
        step: "02",
        icon: FileKey,
        title: "Encrypt & List",
        description: "Upload your file, set a price, and our system encrypts it with AES-256."
    },
    {
        step: "03",
        icon: Download,
        title: "Trade & Download",
        description: "Buyers purchase with crypto and instantly receive the decryption key."
    },
    {
        step: "04",
        icon: CheckCircle,
        title: "Verified Ownership",
        description: "All transactions are recorded on-chain for permanent, verifiable proof."
    }
];

export default function LandingPage() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
            {/* Video Background */}
            <div className="fixed inset-0 z-0 overflow-hidden">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.5, filter: 'brightness(1.3) contrast(1.1)' }}
                >
                    <source src="/oneroad.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
            </div>

            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/90 backdrop-blur-md px-4 sm:px-6 md:px-16 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <Image
                            src="/oneroad-logo.jpg"
                            alt="Oneroad Logo"
                            width={40}
                            height={40}
                            className="rounded-lg"
                        />
                        <span className="text-xl font-extrabold tracking-tight font-display">ONEROAD</span>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-10">
                        <Link href="/marketplace" className="text-sm font-semibold hover:text-primary transition-colors">Marketplace</Link>
                        <Link href="/create-listing" className="text-sm font-semibold hover:text-primary transition-colors">Create</Link>
                        <a href="#how-it-works" className="text-sm font-semibold hover:text-primary transition-colors">How It Works</a>
                        <a href="#features" className="text-sm font-semibold hover:text-primary transition-colors">Features</a>
                    </nav>

                    {/* Mobile Nav Links */}
                    <div className="flex md:hidden items-center gap-3">
                        <Link href="/marketplace" className="text-xs font-bold hover:text-primary transition-colors">Market</Link>
                        <Link href="/create-listing" className="text-xs font-bold hover:text-primary transition-colors">Create</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/marketplace" className="btn-primary text-sm">
                            Launch App
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-16 pt-12 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[60vh]">

                    {/* Left: Hero Content */}
                    <div className={`flex flex-col gap-6 sm:gap-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        {/* Status Badge */}
                        <div className="status-badge w-fit">
                            <span className="status-dot" />
                            Testnet Live
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.1] tracking-tight font-display">
                            The Decentralized Marketplace for{" "}
                            <span className="text-primary">Digital Assets.</span>
                        </h1>

                        {/* Subheading */}
                        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-lg leading-relaxed">
                            Trade encrypted files securely on-chain. No middlemen. No censorship.
                            Just pure, trustless commerce with instant crypto payments.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                            <Link href="/marketplace" className="btn-primary btn-lg btn-shine w-full sm:w-auto justify-center">
                                Start Trading
                                <ArrowRight size={20} />
                            </Link>
                            <Link href="/create-listing" className="btn-secondary btn-lg w-full sm:w-auto justify-center">
                                Create Listing
                            </Link>
                        </div>

                        {/* Social Proof */}
                        <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="size-10 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                                <span className="text-white font-bold">12.4k+</span> active sellers
                            </p>
                        </div>
                    </div>

                    {/* Right: Logo/Mascot Display */}
                    <div className={`relative group transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} hidden lg:flex items-center justify-center`}>
                        <div className="absolute -inset-8 bg-primary/20 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                        <Image
                            src="/oneroad-logo.jpg"
                            alt="Oneroad Mascot"
                            width={400}
                            height={400}
                            className="rounded-3xl border-2 border-primary/30 shadow-[0_0_60px_rgba(19,236,218,0.3)]"
                        />
                    </div>
                </div>

                {/* Trust Bar */}
                <div className="mt-24 sm:mt-32 pt-12 border-t border-white/5">
                    <p className="text-center text-slate-500 text-xs font-bold tracking-widest uppercase mb-10">
                        Built on Leading Blockchain Infrastructure
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2 font-black text-lg sm:text-2xl">
                            <Globe size={20} /> LISK
                        </div>
                        <div className="flex items-center gap-2 font-black text-lg sm:text-2xl">
                            <Shield size={20} /> BASE
                        </div>
                        <div className="flex items-center gap-2 font-black text-lg sm:text-2xl">
                            <Database size={20} /> ARC
                        </div>
                        <div className="flex items-center gap-2 font-black text-lg sm:text-2xl">
                            <Lock size={20} /> DATAHAVEN
                        </div>
                    </div>
                </div>

                {/* How It Works Section */}
                <section id="how-it-works" className="mt-24 sm:mt-32">
                    <div className="mb-12 sm:mb-16 text-center">
                        <h2 className="text-3xl sm:text-4xl font-black mb-4 font-display">
                            How It <span className="text-primary">Works</span>
                        </h2>
                        <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
                            Four simple steps to start trading encrypted digital assets securely.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <div key={i} className="glass-card rounded-2xl p-6 border border-white/10 group hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-4xl font-black text-primary/30 font-mono">{step.step}</span>
                                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background transition-all">
                                            <Icon size={24} />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 font-display">{step.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Features Bento Grid */}
                <section id="features" className="mt-24 sm:mt-32">
                    <div className="mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl font-black mb-4 font-display">
                            A complete ecosystem for{" "}
                            <span className="text-primary">digital creators.</span>
                        </h2>
                        <p className="text-slate-400 text-base sm:text-lg">
                            Powerful tools built on decentralized infrastructure.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Large Feature Card */}
                        <div className="md:col-span-8 glass-card glass-card-hover rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
                            <div>
                                <div className="size-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                                    <Lock size={24} />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black mb-4 font-display">Encrypted Privacy-First Trading</h3>
                                <p className="text-slate-400 text-base sm:text-lg max-w-md leading-relaxed">
                                    Your files are encrypted end-to-end. Only the purchaser holds the key, and you maintain 100% ownership on-chain.
                                </p>
                            </div>
                            <div className="mt-6 sm:mt-8 flex gap-4">
                                <span className="px-3 py-1 bg-white/5 rounded text-xs font-bold text-slate-300">AES-256</span>
                                <span className="px-3 py-1 bg-white/5 rounded text-xs font-bold text-slate-300">ZKP Ready</span>
                            </div>
                        </div>

                        {/* Accent Card */}
                        <div className="md:col-span-4 bg-primary rounded-2xl p-6 sm:p-8 text-background flex flex-col justify-between group cursor-pointer hover:shadow-glow-xl transition-all">
                            <div className="size-12 bg-background/10 rounded-lg flex items-center justify-center mb-6">
                                <ArrowRight className="text-background" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black mb-2 font-display">Instant Settlement</h3>
                                <p className="text-background/70 font-bold text-sm sm:text-base leading-tight">
                                    Payments distributed instantly via smart contracts.
                                </p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <ArrowRight className="text-3xl group-hover:translate-x-2 transition-transform" size={32} />
                            </div>
                        </div>

                        {/* Centered Card */}
                        <div className="md:col-span-4 glass-card rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col items-center justify-center text-center">
                            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                                <Database size={32} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2 font-display">IPFS Storage</h3>
                            <p className="text-slate-500 text-sm">
                                Distributed storage across the globe for 100% uptime.
                            </p>
                        </div>

                        {/* Wide Card */}
                        <div className="md:col-span-8 glass-card rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
                            <div className="w-full md:w-1/2">
                                <h3 className="text-xl sm:text-2xl font-black mb-4 font-display">Multi-Chain Support</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Trade across multiple testnets with seamless chain switching.
                                </p>
                                <button className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                                    View Supported Chains <ArrowRight size={14} />
                                </button>
                            </div>
                            <div className="w-full md:w-1/2 bg-white/5 rounded-xl border border-white/10 p-4 font-mono text-[10px] text-primary/70">
                                <div className="flex gap-1 mb-2">
                                    <div className="size-2 rounded-full bg-red-400/20" />
                                    <div className="size-2 rounded-full bg-yellow-400/20" />
                                    <div className="size-2 rounded-full bg-green-400/20" />
                                </div>
                                {"// Supported Networks"}<br />
                                {"chains: ["}<br />
                                {"  { id: 55931, name: 'DataHaven' },"}<br />
                                {"  { id: 5042002, name: 'Arc Testnet' }"}<br />
                                {"]"}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Top Creators */}
                <section id="creators" className="mt-24 sm:mt-32">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black mb-4 font-display">Top Creators</h2>
                            <p className="text-slate-400 text-base sm:text-lg">Leading the new economy of decentralized commerce.</p>
                        </div>
                        <Link href="/marketplace" className="text-primary font-bold flex items-center gap-2 group">
                            Explore Marketplace
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {CREATORS.map((creator, i) => (
                            <div key={i} className="glass-card glass-card-hover rounded-2xl p-6 border border-white/10">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-4">
                                        <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                                            {creator.name.charAt(0)}
                                        </div>
                                        <div className="absolute bottom-0 right-0 bg-primary text-background size-6 rounded-full flex items-center justify-center">
                                            <Shield size={12} />
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-black italic">{creator.name}</h4>
                                    <p className="text-xs text-slate-500 mb-6">{creator.role}</p>
                                    <div className="w-full pt-4 border-t border-white/5">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Total Earned</p>
                                        <p className="text-xl font-black text-primary">{creator.earned}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="mt-32 sm:mt-40 mb-20">
                    <div className="relative rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-background to-primary/5 p-8 sm:p-12 md:p-24 border border-primary/20 overflow-hidden text-center">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(19,236,218,0.1),transparent)] pointer-events-none" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-6 sm:mb-8 leading-tight font-display">
                                Ready to start trading?
                            </h2>
                            <p className="text-slate-400 text-base sm:text-lg md:text-xl mb-8 sm:mb-12">
                                Connect your wallet and start buying or selling digital assets in less than 5 minutes.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/marketplace" className="btn-primary btn-xl btn-shine justify-center">
                                    Launch Marketplace
                                </Link>
                                <Link href="/create-listing" className="btn-secondary btn-xl justify-center">
                                    Create Listing
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}
