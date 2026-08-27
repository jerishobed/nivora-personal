import React, { useState } from 'react';
import { UserProfile, UserPreferences, SUPPORTED_CURRENCIES } from '../types';
import {
  X,
  User,
  Coins,
  ShieldCheck,
  Share2,
  Download,
  Save,
  Check,
  Copy,
  Sparkles,
  Zap,
  Lock,
  Loader2,
  LogOut
} from 'lucide-react';
import { shareContent } from '../lib/firebase';

interface SettingsModalProps {
  user: UserProfile;
  preferences: UserPreferences;
  onSavePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  onClose: () => void;
  onSignOut: () => void;
  journalCount: number;
  transactionCount: number;
  onExportData?: () => void;
  onSeedData?: () => Promise<void> | void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  preferences,
  onSavePreferences,
  onClose,
  onSignOut,
  journalCount,
  transactionCount,
  onExportData,
  onSeedData
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || preferences.bio || '');
  const [selectedCurrency, setSelectedCurrency] = useState(preferences.currency || 'USD');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const activeCurrencyConfig =
    SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSavePreferences({
        displayName: displayName.trim() || undefined,
        bio: bio.trim(),
        currency: selectedCurrency
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareApp = async () => {
    const res = await shareContent({
      title: 'NIVORA — Personal Journal & Finance Intelligence',
      text: 'Track your reflections and finances in an isolated, private AI intelligence space.'
    });
    if (res.success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fffdfb] border border-[#e8ddd2] rounded-[28px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#e8ddd2] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#1f1b18]">
                Preferences &amp; Settings
              </h3>
              <p className="text-xs text-[#756b63]">
                Manage profile, currency, and private intelligence settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[12px] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Section 1: Profile Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#756b63] uppercase tracking-wider">
              <User className="w-4 h-4 text-[#7b4a27]" />
              <span>Profile Information</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1f1b18] mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-[14px] bg-white border border-[#dfd3c7] text-[#1f1b18] text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1f1b18] mb-1.5">
                  Personal Focus / Bio <span className="text-[#756b63] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Mindful Living &amp; Financial Independence"
                  maxLength={100}
                  className="w-full px-4 py-2.5 rounded-[14px] bg-white border border-[#dfd3c7] text-[#1f1b18] text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#e8ddd2]/70" />

          {/* Section 2: Preferred Currency Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#756b63] uppercase tracking-wider">
                <Coins className="w-4 h-4 text-[#7b4a27]" />
                <span>Default Currency</span>
              </div>
              <span className="text-xs font-bold text-[#7b4a27] bg-[#f3e8dc] px-2.5 py-0.5 rounded-full">
                Active: {activeCurrencyConfig.symbol} ({activeCurrencyConfig.code})
              </span>
            </div>

            <p className="text-xs text-[#756b63]">
              Select which currency symbol and format to use across your financial metrics, income/expense tracking, and AI insights.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setSelectedCurrency(curr.code)}
                    className={`p-3 rounded-[16px] border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#f3e8dc] border-[#7b4a27] shadow-2xs'
                        : 'bg-white border-[#e8ddd2] hover:bg-[#f5f1eb] hover:border-[#dfd3c7]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-[#1f1b18]">
                        {curr.symbol}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-[#7b4a27] text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-[#1f1b18]">{curr.code}</p>
                      <p className="text-[10px] text-[#756b63] truncate">{curr.name.split('(')[0].trim()}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-[#e8ddd2]/70" />

          {/* Section 3: Free-Tier Zero-Cost Budget Protection */}
          <div className="space-y-3 bg-[#f5f1eb]/80 border border-[#e8ddd2] rounded-[20px] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
              <h4 className="text-xs sm:text-sm font-bold text-[#1f1b18]">
                Zero-Cost Budget Protection
              </h4>
              <span className="text-[10px] font-bold bg-[#f0fdf4] text-[#166534] px-2 py-0.5 rounded-full border border-[#bbf7d0]">
                Active
              </span>
            </div>
            <p className="text-xs text-[#756b63] leading-relaxed">
              NIVORA is optimized for zero-cost operation. Token usage is clamped to 900 tokens per answer with a 10 req/min sliding-window ceiling to ensure you stay within Google Cloud free-tier limits without accidental billing.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-[#1f1b18] pt-1">
              <div className="bg-white p-2 rounded-[12px] border border-[#e8ddd2] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#7b4a27]" />
                <span>Rate limit: 10 req/min</span>
              </div>
              <div className="bg-white p-2 rounded-[12px] border border-[#e8ddd2] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#2e7d32]" />
                <span>User-Scoped Isolation</span>
              </div>
            </div>
          </div>

          <hr className="border-[#e8ddd2]/70" />

          {/* Section 4: Share & Export */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#756b63] uppercase tracking-wider">
              <Share2 className="w-4 h-4 text-[#7b4a27]" />
              <span>Share &amp; Export</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleShareApp}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[14px] bg-white border border-[#dfd3c7] text-[#1f1b18] hover:bg-[#f5f1eb] text-xs font-semibold transition-colors cursor-pointer"
              >
                {shareSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-[#2e7d32]" />
                    <span className="text-[#2e7d32]">Shared / Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#7b4a27]" />
                    <span>Share NIVORA</span>
                  </>
                )}
              </button>

              {onExportData && (
                <button
                  type="button"
                  onClick={onExportData}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[14px] bg-white border border-[#dfd3c7] text-[#1f1b18] hover:bg-[#f5f1eb] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#7b4a27]" />
                  <span>Export Data ({journalCount + transactionCount})</span>
                </button>
              )}
            </div>

            {/* One-click Demo Storyline Seeder */}
            {onSeedData && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await onSeedData();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-[14px] bg-[#f3e8dc] hover:bg-[#ebd9c7] text-[#7b4a27] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Demo Presentation Storyline (10 Journals, 14 Transactions, 3 Goals)</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Discreet Sign Out */}
          <div className="pt-2 flex items-center justify-between text-xs text-[#756b63]">
            <span>Signed in as: <b className="text-[#1f1b18]">{user.email || 'Guest'}</b></span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1 text-[#c62828] hover:underline cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#e8ddd2] bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-[14px] bg-[#f5f1eb] text-[#756b63] hover:text-[#1f1b18] text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
