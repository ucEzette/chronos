"use client";

import { useState } from "react";
import { X, AlertTriangle, Flag, Shield, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemId: string;
    chainId: number;
    itemName: string;
    sellerAddress: string;
    reporterAddress: string;
}

const REPORT_REASONS = [
    { value: "scam", label: "Scam / Fraud", icon: "🚨", description: "Fake product, doesn't deliver what's promised" },
    { value: "nsfw", label: "NSFW / Adult Content", icon: "🔞", description: "Inappropriate adult or explicit content" },
    { value: "illegal", label: "Illegal Content", icon: "⚠️", description: "Violates laws or regulations" },
    { value: "copyright", label: "Copyright Infringement", icon: "©️", description: "Stolen or unauthorized content" },
    { value: "spam", label: "Spam / Duplicate", icon: "📧", description: "Repetitive or low-quality listings" },
    { value: "other", label: "Other", icon: "❓", description: "Other policy violation" },
];

export function ReportModal({
    isOpen,
    onClose,
    itemId,
    chainId,
    itemName,
    sellerAddress,
    reporterAddress,
}: ReportModalProps) {
    const [step, setStep] = useState<"reason" | "details" | "success">("reason");
    const [selectedReason, setSelectedReason] = useState<string>("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError("Please select a reason");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            if (!supabase) throw new Error("Reporting service unavailable");

            const { error: submitError } = await supabase
                .from("content_reports")
                .insert({
                    item_id: itemId,
                    chain_id: chainId,
                    item_name: itemName,
                    seller_address: sellerAddress,
                    reporter_address: reporterAddress,
                    reason: selectedReason,
                    description: description.trim() || null,
                    status: "pending",
                });

            if (submitError) throw submitError;

            setStep("success");
        } catch (err: any) {
            console.error("Report submission error:", err);
            setError(err.message || "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep("reason");
        setSelectedReason("");
        setDescription("");
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <Flag className="text-red-500" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Report Content</h3>
                            <p className="text-xs text-white/50 truncate max-w-[200px]">
                                {itemName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {step === "reason" && (
                        <div className="space-y-3">
                            <p className="text-sm text-white/60 mb-4">
                                Why are you reporting this content?
                            </p>

                            <div className="grid gap-2">
                                {REPORT_REASONS.map((reason) => (
                                    <button
                                        key={reason.value}
                                        onClick={() => setSelectedReason(reason.value)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedReason === reason.value
                                            ? "border-red-500/50 bg-red-500/10"
                                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                                            }`}
                                    >
                                        <span className="text-xl">{reason.icon}</span>
                                        <div>
                                            <p className="font-medium text-sm">{reason.label}</p>
                                            <p className="text-xs text-white/40">{reason.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => selectedReason && setStep("details")}
                                disabled={!selectedReason}
                                className="w-full mt-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {step === "details" && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">
                                        {REPORT_REASONS.find((r) => r.value === selectedReason)?.icon}
                                    </span>
                                    <span className="font-medium">
                                        {REPORT_REASONS.find((r) => r.value === selectedReason)?.label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setStep("reason")}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Change reason
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Additional Details <span className="text-white/40">(optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide more context about this report..."
                                    className="w-full h-24 p-3 rounded-xl bg-white/5 border border-white/10 focus:border-red-500/50 focus:outline-none resize-none text-sm placeholder:text-white/30"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep("reason")}
                                    className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors font-bold flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Submit Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Shield className="text-green-500" size={32} />
                            </div>
                            <h4 className="text-xl font-bold mb-2">Report Submitted</h4>
                            <p className="text-white/60 text-sm mb-6">
                                Thank you for helping keep ONEROAD safe. Our team will review this
                                report and take appropriate action.
                            </p>
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 rounded-xl bg-primary text-black font-bold hover:opacity-90 transition-opacity"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer note */}
                {step !== "success" && (
                    <div className="px-4 pb-4">
                        <p className="text-xs text-white/30 text-center">
                            False reports may result in account restrictions.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
