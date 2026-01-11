'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Send, Github, Twitter, MessageCircle, Globe, Mail } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

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
    <footer className="w-full bg-background border-t border-white/10 pt-16 pb-8 px-4 sm:px-6 md:px-16 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 sm:gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/oneway-logo.jpg"
                alt="Oneway Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="text-lg font-extrabold tracking-tight font-display">ONEWAY</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
              The decentralized marketplace for digital assets. Buy, sell, and trade encrypted files securely on-chain.
            </p>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${subscribed
                  ? "bg-green-500/20 text-green-400"
                  : "btn-primary"
                  }`}
              >
                {subscribed ? '✓' : <Send size={14} />}
              </button>
            </form>
          </div>

          {/* Platform Links */}
          <div>
            <h5 className="text-white font-bold mb-4 sm:mb-6">Platform</h5>
            <ul className="space-y-3 text-slate-500 text-sm">
              <li><Link href="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link></li>
              <li><Link href="/create-listing" className="hover:text-primary transition-colors">Create Listing</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h5 className="text-white font-bold mb-4 sm:mb-6">Categories</h5>
            <ul className="space-y-3 text-slate-500 text-sm">
              {CATEGORIES.slice(0, 5).map(cat => (
                <li key={cat.id}>
                  <Link href={`/marketplace?category=${cat.id}`} className="hover:text-primary transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h5 className="text-white font-bold mb-4 sm:mb-6">Connect</h5>
            <ul className="space-y-3 text-slate-500 text-sm">
              <li>
                <a href="https://x.com/runicsorcerer" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Twitter size={14} /> Twitter (X)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                  <MessageCircle size={14} /> Discord
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Github size={14} /> GitHub
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Globe size={14} /> Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
          <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.15em]">
            © 2024 Oneway Protocol. All rights reserved.
          </p>
          <div className="flex gap-6 text-[10px] uppercase font-bold tracking-[0.15em] text-slate-600">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}