import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, Loader2, X, Share2, Check, TrendingUp, BookOpen, Heart, Quote } from 'lucide-react';
import { JournalEntry, Transaction, WeeklyDigest } from '../types';
import { getCurrentIdToken, formatCurrency, shareContent } from '../lib/firebase';

interface WeeklyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  journalEntries: JournalEntry[];
  transactions: Transaction[];
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  isOpen,
  onClose,
  currency,
  journalEntries,
  transactions
}) => {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !digest) {
      loadWeeklyDigest();
    }
  }, [isOpen]);

  const loadWeeklyDigest = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const moodsList = journalEntries.map((j) => j.mood || 'reflective').slice(0, 10);
      const categoriesList = transactions.map((t) => t.category).slice(0, 10);

      const idToken = await getCurrentIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/ai/weekly-digest', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currency,
          totalIncome,
          totalExpense,
          journalsCount: journalEntries.length,
          transactionsCount: transactions.length,
          moodsList,
          categoriesList
        })
      });

      if (!res.ok) {
        throw new Error('Could not generate weekly summary.');
      }

      const data = await res.json();
      setDigest(data);
    } catch (err: any) {
      console.error('Weekly digest error:', err);
      setErrorMsg('Failed to generate weekly digest.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!digest) return;
    const text = `📊 NIVORA Weekly Mind & Money Report:\n` +
      `• Dominant Mood: ${digest.dominantMood}\n` +
      `• Net Saved: ${formatCurrency(digest.netSaved, currency)}\n` +
      `• Reflections Logged: ${digest.reflectionsCount}\n` +
      `• AI Insight: ${digest.keyCorrelation}\n` +
      `• Weekly Mantra: "${digest.mantra}"\n\n` +
      `Track your thoughts & wealth on NIVORA.`;

    const res = await shareContent({ title: 'NIVORA Weekly Mind & Money Report', text });
    if (res.success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="weekly-digest-modal"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-lg p-6 sm:p-7 shadow-xl relative animate-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[14px] bg-[#7b4a27] text-white flex items-center justify-center shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1f1b18]">
              Weekly Mind &amp; Money Digest
            </h3>
            <p className="text-xs text-[#756b63]">
              Personalized 7-day behavioral summary powered by Gemini
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-14 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#7b4a27] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#1f1b18]">Analyzing your reflections and finances...</p>
            <p className="text-[11px] text-[#756b63]">Synthesizing behavioral patterns and weekly harmony.</p>
          </div>
        ) : digest ? (
          <div className="space-y-4">
            {/* Infographic Summary Header */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-[#f5f1eb] rounded-[16px] border border-[#e8ddd2]">
                <Heart className="w-4 h-4 text-[#7b4a27] mx-auto mb-1" />
                <span className="text-[10px] text-[#756b63] font-medium block">Dominant Mood</span>
                <span className="text-xs font-bold text-[#1f1b18] truncate block">{digest.dominantMood}</span>
              </div>

              <div className="p-3 bg-[#f5f1eb] rounded-[16px] border border-[#e8ddd2]">
                <TrendingUp className="w-4 h-4 text-[#2e7d32] mx-auto mb-1" />
                <span className="text-[10px] text-[#756b63] font-medium block">Net Saved</span>
                <span className="text-xs font-bold text-[#1f1b18] truncate block">
                  {formatCurrency(digest.netSaved, currency)}
                </span>
              </div>

              <div className="p-3 bg-[#f5f1eb] rounded-[16px] border border-[#e8ddd2]">
                <BookOpen className="w-4 h-4 text-[#7b4a27] mx-auto mb-1" />
                <span className="text-[10px] text-[#756b63] font-medium block">Reflections</span>
                <span className="text-xs font-bold text-[#1f1b18] block">{digest.reflectionsCount}</span>
              </div>
            </div>

            {/* AI Key Behavioral Correlation */}
            <div className="p-4 rounded-[18px] bg-gradient-to-br from-[#f3e8dc]/80 to-[#fffdfb] border border-[#dfd3c7] shadow-2xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#7b4a27]">
                <Sparkles className="w-4 h-4" />
                <span>Weekly Behavioral Pattern</span>
              </div>
              <p className="text-xs text-[#1f1b18] leading-relaxed">
                {digest.keyCorrelation}
              </p>
            </div>

            {/* Weekly Mindset Mantra */}
            <div className="p-4 rounded-[18px] bg-[#fffdfb] border border-[#e8ddd2] shadow-2xs text-center space-y-1">
              <Quote className="w-4 h-4 text-[#7b4a27] mx-auto opacity-70" />
              <p className="text-xs sm:text-sm font-semibold italic text-[#1f1b18]">
                &ldquo;{digest.mantra}&rdquo;
              </p>
              <span className="text-[10px] text-[#756b63] font-medium">Your Mindset Anchor for Next Week</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={loadWeeklyDigest}
                className="flex-1 py-2.5 rounded-[14px] bg-[#f5f1eb] hover:bg-[#eee7de] text-[#756b63] text-xs font-semibold transition-colors cursor-pointer"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                {shareSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied &amp; Shared!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Share Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-[#756b63]">Could not load digest.</p>
            <button
              onClick={loadWeeklyDigest}
              className="mt-3 px-4 py-2 rounded-[12px] bg-[#7b4a27] text-white text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
