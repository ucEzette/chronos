"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";

export default function ProfileRedirect() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected && address) {
      router.replace(`/profile/${address}`);
    } else {
      router.replace("/");
    }
  }, [address, isConnected, router]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#020e14] text-cyan-400">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin w-10 h-10" />
        <p className="font-mono text-sm tracking-widest animate-pulse">LOCATING USER...</p>
      </div>
    </div>
  );
}