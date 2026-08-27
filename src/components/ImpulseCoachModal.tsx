import React, { useState } from 'react';
import { ShoppingBag, Sparkles, Loader2, X, AlertCircle, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { ImpulseAnalysis } from '../types';
import { getCurrentIdToken, formatCurrency } from '../lib/firebase';

interface ImpulseCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  monthlyIncome: number;
  monthlyExpense: number;
  recentMood?: string;
}

const EMOTIONAL_STATES = [
  'Tired / Exhausted',
  'Bored / Seeking novelty',
  'Stressed / Anxious',
  'Excited / Celebratory',
  'Calm / Clear-headed',
  'Rushed / Under pressure'
];

export const ImpulseCoachModal: React.FC<ImpulseCoachModalProps> = ({
  isOpen,
  onClose,
  currency,
  monthlyIncome,
  monthlyExpense,
  recentMood = 'reflective'
}) => {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedFeeling, setSelectedFeeling] = useState(EMOTIONAL_STATES[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImpulseAnalysis | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!itemName.trim() || isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Please provide a valid item name and price.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);

      const idToken = await getCurrentIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/ai/impulse-check', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemName: itemName.trim(),
          price: numPrice,
          emotionalState: selectedFeeling,
          currency,
          monthlyIncome,
          monthlyExpense,
          recentMood
        })
      });

      if (!res.ok) {
        throw new Error('Impulse check failed.');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      console.error('Impulse check error:', err);
      setErrorMsg('Unable to analyze purchase. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setItemName('');
    setPrice('');
    setErrorMsg(null);
  };

  return (
    <div
      id="impulse-coach-modal"
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
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1f1b18]">
              &ldquo;Should I Buy This?&rdquo;
            </h3>
            <p className="text-xs text-[#756b63]">
              Mindful impulse purchase coach powered by NIVORA AI
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-[12px] bg-[#fff5f5] border border-[#fecaca] text-[#991b1b] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!analysis ? (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Item or Purchase Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Headphones"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Price ({currency})
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#756b63] mb-1.5">
                How are you feeling right now?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EMOTIONAL_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setSelectedFeeling(state)}
                    className={`text-left p-2.5 rounded-[12px] text-xs font-medium border transition-all cursor-pointer ${
                      selectedFeeling === state
                        ? 'bg-[#f3e8dc] border-[#7b4a27] text-[#7b4a27] font-semibold'
                        : 'bg-[#fffdfb] border-[#e8ddd2] text-[#1f1b18] hover:bg-[#f5f1eb]'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#f5f1eb] rounded-[14px] text-[11px] text-[#756b63] flex items-center justify-between">
              <span>Monthly Margin: <b>{formatCurrency(monthlyIncome - monthlyExpense, currency)}</b></span>
              <span>Recent Mood: <b>{recentMood}</b></span>
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !itemName.trim() || !price}
              className="w-full py-3 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Decision with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Purchase Decision</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Verdict Banner */}
            <div className={`p-4 rounded-[18px] border ${
              analysis.verdict === 'proceed'
                ? 'bg-[#e8f5e9]/80 border-[#a5d6a7] text-[#1b5e20]'
                : analysis.verdict === 'pause_24h'
                ? 'bg-[#fff8e1]/80 border-[#ffe082] text-[#b78103]'
                : 'bg-[#fff5f5]/80 border-[#ffcdd2] text-[#b71c1c]'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {analysis.verdict === 'proceed' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />
                ) : analysis.verdict === 'pause_24h' ? (
                  <Clock className="w-5 h-5 text-[#f57f17]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#c62828]" />
                )}
                <h4 className="font-bold text-sm sm:text-base">{analysis.headline}</h4>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{analysis.rationale}</p>
            </div>

            {/* Insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#f5f1eb] rounded-[14px] border border-[#e8ddd2]">
                <span className="font-bold text-[#7b4a27] block mb-1">Budget Impact</span>
                <p className="text-[#1f1b18] leading-snug">{analysis.budgetImpact}</p>
              </div>
              <div className="p-3 bg-[#f5f1eb] rounded-[14px] border border-[#e8ddd2]">
                <span className="font-bold text-[#7b4a27] block mb-1">Emotional Context</span>
                <p className="text-[#1f1b18] leading-snug">{analysis.emotionalReflection}</p>
              </div>
            </div>

            {/* Action Step */}
            <div className="p-3.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#756b63] tracking-wider block mb-1">
                Recommended Action Step
              </span>
              <p className="text-xs font-semibold text-[#1f1b18] flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-[#7b4a27] shrink-0" />
                {analysis.actionStep}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-[14px] bg-[#f5f1eb] hover:bg-[#eee7de] text-[#756b63] text-xs font-semibold transition-colors cursor-pointer"
              >
                Check Another Item
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
