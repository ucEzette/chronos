'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/categories';
import {
  Send, Github, Twitter, MessageCircle, Globe, Shield,
  Zap, ExternalLink, Mail, Heart, Radio
} from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="w-full mt-auto border-t border-white/10 glass-card relative z-10">
      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* Brand & Newsletter Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo & Tagline */}
            <div>
              <Link href="/" className="flex items-center gap-2 group">
                <div className="size-10 btn-glass-circle flex items-center justify-center text-primary group-hover:shadow-glow-primary transition-all">
                  <Zap size={20} />
                </div>
                <span className="text-xl font-black tracking-tight text-white">
                  CHRO<span className="text-primary">NOS</span>
                </span>
              </Link>
              <p className="mt-3 text-sm text-white/50 max-w-sm leading-relaxed">
                The decentralized marketplace for digital assets. Buy, sell, and trade encrypted files securely on-chain.
              </p>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
                Stay Updated
              </h4>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 glass-input text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className={cn(
                    "px-4 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2",
                    subscribed
                      ? "bg-green-500/20 text-green-400 border border-green-500/20"
                      : "btn-glass-primary"
                  )}
                >
                  {subscribed ? 'Subscribed!' : <Send size={16} />}
                </button>
              </form>
              <p className="text-[10px] text-white/30">
                Get notified about new features, top sellers, and exclusive drops.
              </p>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/runicsorcerer"
                target="_blank"
                rel="noreferrer"
                className="size-10 btn-glass-circle text-white/50 hover:text-primary hover:shadow-glow-primary transition-all"
                title="Twitter/X"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="size-10 btn-glass-circle text-white/50 hover:text-primary hover:shadow-glow-primary transition-all"
                title="Discord"
              >
                <MessageCircle size={18} />
              </a>
              <a
                href="#"
                className="size-10 btn-glass-circle text-white/50 hover:text-primary hover:shadow-glow-primary transition-all"
                title="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="#"
                className="size-10 btn-glass-circle text-white/50 hover:text-primary hover:shadow-glow-primary transition-all"
                title="Website"
              >
                <Globe size={18} />
              </a>
            </div>
          </div>

          {/* Marketplace Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Marketplace
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                  Discover
                </Link>
              </li>
              <li>
                <Link href="/create-listing" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                  Sell a Product
                </Link>
              </li>
              <li>
                <Link href="/?sort=NEWEST" className="text-sm text-white/70 hover:text-primary transition-colors">
                  New Releases
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Cart & Checkout
                </Link>
              </li>
            </ul>
          </div>

          {/* Developer Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Developers
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                  Documentation <ExternalLink size={10} />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                  Smart Contracts <ExternalLink size={10} />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                  GitHub <ExternalLink size={10} />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Bug Bounty
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Support Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Content Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  DMCA
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-white/70 hover:text-primary transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 bg-black/20">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright & Version */}
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span className="font-mono">© 2026 CHRONOS Protocol</span>
              <span className="hidden md:inline text-white/10">|</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                v2.1.0
              </span>
            </div>

            {/* Network Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  DataHaven
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                  Arc Testnet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[100px] bg-primary/5 blur-3xl pointer-events-none" />
    </footer>
  );
}