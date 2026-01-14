"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import {
    Book, Terminal, Shield, Key, FileText,
    ChevronRight, ExternalLink, Globe, Server,
    CreditCard, Lock, RefreshCw, AlertTriangle
} from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

// --- Types ---
interface DocSection {
    id: string;
    title: string;
    icon: any;
    content: React.ReactNode;
}

// --- Components ---

const CodeBlock = ({ label, value }: { label: string; value: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[#050b14] border border-white/10 rounded-xl overflow-hidden my-4 group">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                <span className="text-xs font-mono text-white/50 uppercase tracking-wider">{label}</span>
                <button
                    onClick={handleCopy}
                    className="text-[10px] text-primary hover:text-white transition-colors uppercase font-bold"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <div className="p-4 font-mono text-xs md:text-sm text-white/80 break-all selection:bg-primary/30">
                {value}
            </div>
        </div>
    );
};

const Section = ({ id, title, icon: Icon, children }: { id: string, title: string, icon: any, children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-32 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Icon size={24} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        <div className="space-y-6 text-white/70 leading-relaxed font-light">
            {children}
        </div>
    </section>
);

// --- Content Definitions ---

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("intro");

    // Handle scroll spy
    useEffect(() => {
        const handleScroll = () => {
            const sections = ["intro", "getting-started", "features", "contracts", "encryption", "faq"];
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top >= 0 && rect.top <= 300) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollTo = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Header height
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="min-h-screen bg-background text-white font-display overflow-x-hidden flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(0,224,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,198,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[128px]" />
            </div>

            <Navigation />

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-6 py-12 relative z-10">

                <div className="flex flex-col lg:flex-row gap-12">

                    {/* Sidebar Navigation */}
                    <aside className="lg:w-64 shrink-0 hidden lg:block">
                        <div className="sticky top-32 space-y-8">
                            <div>
                                <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 px-3">Documentation</h3>
                                <nav className="space-y-1">
                                    {[
                                        { id: "intro", label: "Introduction", icon: Book },
                                        { id: "getting-started", label: "Getting Started", icon: Terminal },
                                        { id: "features", label: "Core Features", icon: StarIcon },
                                        { id: "encryption", label: "Encryption Protocol", icon: Lock },
                                        { id: "contracts", label: "Smart Contracts", icon: FileText },
                                        { id: "faq", label: "FAQ", icon: HelpIcon },
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => scrollTo(item.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left group",
                                                activeSection === item.id
                                                    ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(0,229,255,0.1)]"
                                                    : "text-white/60 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon size={16} className={cn("transition-colors", activeSection === item.id ? "text-primary" : "text-white/40 group-hover:text-white")} />
                                            {item.label}
                                            {activeSection === item.id && (
                                                <ChevronRight size={14} className="ml-auto text-primary animate-in slide-in-from-left-2 fade-in duration-300" />
                                            )}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 border border-white/5">
                                <h4 className="font-bold text-white text-sm mb-2">Need Help?</h4>
                                <p className="text-xs text-white/60 mb-3">Join our community for support and updates.</p>
                                <div className="flex gap-2">
                                    <a href="#" className="flex-1 py-2 text-center bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Discord</a>
                                    <a href="#" className="flex-1 py-2 text-center bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-colors">Twitter</a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 max-w-4xl min-w-0">

                        {/* Header */}
                        <div className="mb-16 border-b border-white/10 pb-8">
                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6">
                                Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Docs</span>
                            </h1>
                            <p className="text-xl text-white/60 max-w-2xl font-light">
                                Comprehensive guide to the OneRoad Protocol architecture, smart contracts, and encrypted marketplace mechanics.
                            </p>
                        </div>

                        {/* SECTIONS */}

                        <Section id="intro" title="Introduction" icon={Globe}>
                            <p>
                                OneRoad is a decentralized, censorship-resistant marketplace protocol designed for the secure exchange of digital assets. Unlike traditional platforms, OneRoad utilizes a unique <strong>Paylock</strong> mechanism combined with client-side PGP/AES encryption to ensure that:
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                                {[
                                    { title: "Trustless Exchange", desc: "Funds are held in escrow until the decryption key is verified on-chain." },
                                    { title: "Privacy First", desc: "Files and metadata are encrypted before ever leaving your device." },
                                    { title: "Multi-Chain", desc: "Seamlessly aggregated liquidity across DataHaven, Arc, and Arbitrum." },
                                    { title: "Resilient Storage", desc: "Content is stored on decentralized networks (IPFS/Arweave) via DataHaven." }
                                ].map((f, i) => (
                                    <li key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <h4 className="font-bold text-white mb-1">{f.title}</h4>
                                        <p className="text-xs text-white/50">{f.desc}</p>
                                    </li>
                                ))}
                            </ul>
                        </Section>

                        <Section id="getting-started" title="Getting Started" icon={Terminal}>
                            <p>
                                To interact with OneRoad, you must have a Web3 wallet installed. We support standard EVM wallets like MetaMask, Rainbow, and Coinbase Wallet.
                            </p>

                            <div className="mt-6 space-y-4">
                                <h3 className="text-lg font-bold text-white">1. Connect Your Wallet</h3>
                                <p>Click the "Connect Wallet" button in the top right corner. You can browse the marketplace without connecting, but purchasing or listing items requires an active connection.</p>

                                <h3 className="text-lg font-bold text-white">2. Select a Network</h3>
                                <p>OneRoad operates on multiple networks. Use the network selector in the navigation bar to switch between:</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 text-xs font-bold">DataHaven (DH)</span>
                                    <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/30 text-xs font-bold">Arc Testnet (ARC)</span>
                                    <span className="px-3 py-1 rounded-full bg-orange-900/30 text-orange-400 border border-orange-500/30 text-xs font-bold">Arbitrum Sepolia (ARB)</span>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-6 flex gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-amber-500 text-sm">Testnet Only</h4>
                                    <p className="text-xs text-amber-200/70 mt-1">OneRoad is currently in Alpha. All supported networks are testnets. Do not use real assets.</p>
                                </div>
                            </div>
                        </Section>

                        <Section id="features" title="Core Features" icon={Server}>
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                        <CreditCard size={20} className="text-primary" /> Buying Assets
                                    </h3>
                                    <p>
                                        When you purchase an item, your funds effectively enter a smart contract "lock".
                                        The seller observes this on-chain event and must deliver the specific decryption key for your address.
                                        Once the key is delivered, the funds are released to the seller.
                                    </p>
                                    <div className="pl-6 border-l-2 border-primary/20 mt-4 space-y-2">
                                        <p className="text-sm"><strong className="text-white">1. Purchase:</strong> You pay the list price + gas.</p>
                                        <p className="text-sm"><strong className="text-white">2. Wait:</strong> The seller is notified to deliver the specific key.</p>
                                        <p className="text-sm"><strong className="text-white">3. Decrypt:</strong> Once delivered, the UI automatically decrypts your file.</p>
                                        <p className="text-sm"><strong className="text-white">4. Refund:</strong> If the seller fails to deliver within 24 hours, you can reclaim your funds.</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                        <TagIcon size={20} className="text-primary" /> Selling & Listing
                                    </h3>
                                    <p>
                                        Sellers can list any digital file. The application automatically handles the encryption process.
                                        You provide the file, price, and supply cap. The protocol generates a unique key pair for the item.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        <Section id="encryption" title="Encryption Protocol" icon={Lock}>
                            <p>
                                Security is paramount. OneRoad employs a hybrid encryption scheme to ensure that neither the platform nor the network validators can access your content.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="font-bold text-white mb-2">Client-Side Encryption</h4>
                                    <p className="text-xs opacity-70">
                                        Files are encrypted in your browser using AES-256 before upload. The AES key itself is encrypted using the protocol's master key schema, ensuring only the intended recipient can ever unlock it.
                                    </p>
                                </div>
                                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                    <h4 className="font-bold text-white mb-2">On-Chain Delivery</h4>
                                    <p className="text-xs opacity-70">
                                        The decryption key is never stored in a central database. It is delivered on-chain via the <code className="bg-black/30 px-1 rounded">deliverKey</code> transaction, encrypted specifically for the buyer's public address.
                                    </p>
                                </div>
                            </div>
                        </Section>

                        <Section id="contracts" title="Smart Contracts" icon={FileText}>
                            <p className="mb-6">
                                Verify the authenticity of the OneRoad Protocol by checking our deployed contract addresses on the block explorers.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-2">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                        DataHaven Testnet (Chain ID: 55931)
                                    </h3>
                                    <CodeBlock label="Paylock Contract" value={CONTRACT_ADDRESSES[55931]} />
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                        Arc Testnet (Chain ID: 5042002)
                                    </h3>
                                    <CodeBlock label="Paylock Contract" value={CONTRACT_ADDRESSES[5042002]} />
                                </div>

                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-2">
                                        <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                        Arbitrum Sepolia (Chain ID: 421614)
                                    </h3>
                                    <CodeBlock label="Paylock Contract" value={CONTRACT_ADDRESSES[421614]} />
                                </div>
                            </div>
                        </Section>

                        <Section id="faq" title="FAQ" icon={HelpIcon}>
                            <div className="space-y-4">
                                <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-white">
                                        What happens if a seller never delivers?
                                        <ChevronRight className="transition-transform group-open:rotate-90 text-white/40" size={16} />
                                    </summary>
                                    <div className="px-4 pb-4 text-sm text-white/60">
                                        The Paylock smart contract includes a time-lock mechanism. If the key is not delivered within the specified window (default 24 hours), the buyer can call the reclaimFunds function to get a full refund.
                                    </div>
                                </details>

                                <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-white">
                                        Are there platform fees?
                                        <ChevronRight className="transition-transform group-open:rotate-90 text-white/40" size={16} />
                                    </summary>
                                    <div className="px-4 pb-4 text-sm text-white/60">
                                        Yes, the protocol charges a small service fee on each successful sale to maintain the network and front-end infrastructure. This fee is automatically deducted from the seller's payout.
                                    </div>
                                </details>

                                <details className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                    <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-white">
                                        Is my content really private?
                                        <ChevronRight className="transition-transform group-open:rotate-90 text-white/40" size={16} />
                                    </summary>
                                    <div className="px-4 pb-4 text-sm text-white/60">
                                        The content is encrypted before it leaves your browser. However, metadata (name, description, preview image) is public to allow for marketplace browsing. Only the actual file payload is encrypted.
                                    </div>
                                </details>
                            </div>
                        </Section>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

// Icons
function StarIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}

function TagIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
            <path d="M7 7h.01" />
        </svg>
    )
}

function HelpIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    )
}
