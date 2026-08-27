import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  logoutUser,
  mapFirebaseUser,
  subscribeToJournal,
  subscribeToTransactions,
  saveJournalEntry,
  deleteJournalEntry,
  saveTransaction,
  deleteTransaction,
  seedSampleData,
  subscribeToUserPreferences,
  saveUserPreferences
} from './lib/firebase';
import { UserProfile, JournalEntry, Transaction, ViewTab, UserPreferences } from './types';
import { LandingPage } from './components/LandingPage';
import { BrandHeader } from './components/BrandHeader';
import { Dashboard } from './components/Dashboard';
import { JournalView } from './components/JournalView';
import { FinanceView } from './components/FinanceView';
import { AIChatView } from './components/AIChatView';
import { SettingsModal } from './components/SettingsModal';
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    currency: 'USD',
    bio: ''
  });

  // Firestore collections state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const user = mapFirebaseUser(firebaseUser);
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Subscriptions for authenticated user
  useEffect(() => {
    if (!currentUser?.uid) {
      setJournalEntries([]);
      setTransactions([]);
      return;
    }

    const unsubJournal = subscribeToJournal(
      currentUser.uid,
      (entries) => {
        setJournalEntries(entries);
      },
      (err) => {
        console.error('Journal subscription error:', err);
      }
    );

    const unsubTransactions = subscribeToTransactions(
      currentUser.uid,
      (records) => {
        setTransactions(records);
      },
      (err) => {
        console.error('Transaction subscription error:', err);
      }
    );

    const unsubPrefs = subscribeToUserPreferences(
      currentUser.uid,
      (prefs) => {
        setPreferences(prefs);
        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            displayName: prefs.displayName || prev.displayName,
            bio: prefs.bio || '',
            currency: prefs.currency || 'USD'
          };
        });
      }
    );

    return () => {
      unsubJournal();
      unsubTransactions();
      unsubPrefs();
    };
  }, [currentUser?.uid]);

  const handleSavePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!currentUser?.uid) return;
    try {
      await saveUserPreferences(currentUser.uid, newPrefs);
      setPreferences((prev) => ({ ...prev, ...newPrefs }));
      if (newPrefs.displayName) {
        setCurrentUser((prev) => prev ? { ...prev, displayName: newPrefs.displayName! } : null);
      }
      showToast('Preferences updated.');
    } catch (err) {
      console.error('Error updating preferences:', err);
      showToast('Unable to update preferences.', 'error');
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      user: {
        displayName: currentUser?.displayName,
        email: currentUser?.email,
        currency: preferences.currency,
        bio: preferences.bio
      },
      exportedAt: new Date().toISOString(),
      journalEntries,
      transactions
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivora-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully.');
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setActiveTab('dashboard');
      showToast('Signed out of NIVORA.');
    } catch (err: any) {
      console.error('Sign out error:', err);
      showToast('Error signing out.', 'error');
    }
  };

  const handleSeedData = async () => {
    if (!currentUser?.uid) return;
    try {
      setSeedingLoading(true);
      await seedSampleData(currentUser.uid);
      showToast('Sample reflections & transactions loaded successfully.');
    } catch (err: any) {
      console.error('Seed data error:', err);
      showToast('Unable to load sample data. Please try again.', 'error');
    } finally {
      setSeedingLoading(false);
    }
  };

  const handleSaveJournal = async (entry: Omit<JournalEntry, 'id'> & { id?: string }) => {
    if (!currentUser?.uid) return;
    await saveJournalEntry(currentUser.uid, entry);
    showToast(entry.id ? 'Reflection updated.' : 'Reflection recorded.');
  };

  const handleDeleteJournal = async (id: string) => {
    if (!currentUser?.uid) return;
    await deleteJournalEntry(currentUser.uid, id);
    showToast('Reflection deleted.');
  };

  const handleSaveTransaction = async (t: Omit<Transaction, 'id'> & { id?: string }) => {
    if (!currentUser?.uid) return;
    await saveTransaction(currentUser.uid, t);
    showToast(t.id ? 'Transaction updated.' : 'Transaction recorded.');
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser?.uid) return;
    await deleteTransaction(currentUser.uid, id);
    showToast('Transaction deleted.');
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f1eb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-[16px] bg-[#7b4a27] text-white font-bold text-2xl flex items-center justify-center mb-4 shadow-sm animate-pulse">
          N
        </div>
        <h2 className="text-xl font-bold text-[#1f1b18]">NIVORA</h2>
        <div className="flex items-center gap-2 text-xs text-[#756b63] mt-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7b4a27]" />
          <span>Restoring secure session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated Landing Page
  if (!currentUser) {
    return <LandingPage />;
  }

  // Authenticated Application Shell
  return (
    <div className="min-h-screen bg-[#f5f1eb] text-[#1f1b18] flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-[16px] shadow-lg border text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-white text-[#1f1b18] border-[#e8ddd2]'
                : 'bg-[#fff5f5] text-[#991b1b] border-[#fecaca]'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2e7d32]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#c62828]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Top Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#e8ddd2] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <BrandHeader compact onClick={() => setActiveTab('dashboard')} />

          {/* Desktop Navigation Tabs (Visible on md+ screens) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#f5f1eb] p-1 rounded-[16px] border border-[#e8ddd2]">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#1f1b18] shadow-2xs'
                  : 'text-[#756b63] hover:text-[#1f1b18]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#7b4a27]" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-journal"
              onClick={() => setActiveTab('journal')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-white text-[#1f1b18] shadow-2xs'
                  : 'text-[#756b63] hover:text-[#1f1b18]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#7b4a27]" />
              <span>Journal</span>
              {journalEntries.length > 0 && (
                <span className="text-[10px] bg-[#f3e8dc] text-[#7b4a27] px-1.5 py-0.2 rounded-full">
                  {journalEntries.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-finance"
              onClick={() => setActiveTab('finance')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-white text-[#1f1b18] shadow-2xs'
                  : 'text-[#756b63] hover:text-[#1f1b18]'
              }`}
            >
              <Wallet className="w-4 h-4 text-[#7b4a27]" />
              <span>Finance</span>
              {transactions.length > 0 && (
                <span className="text-[10px] bg-[#f3e8dc] text-[#7b4a27] px-1.5 py-0.2 rounded-full">
                  {transactions.length}
                </span>
              )}
            </button>

            <button
              id="nav-tab-ai"
              onClick={() => setActiveTab('ai')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-white text-[#7b4a27] shadow-2xs'
                  : 'text-[#756b63] hover:text-[#7b4a27]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#7b4a27]" />
              <span>AI Insights</span>
            </button>
          </nav>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="header-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-[12px] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
              title="Settings & Preferences"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4 text-[#7b4a27]" />
            </button>
            <button
              id="header-ask-ai-btn"
              onClick={() => setActiveTab('ai')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[14px] bg-[#f3e8dc] hover:bg-[#ebd9c7] text-[#7b4a27] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - with bottom padding on mobile to account for fixed bottom navigation */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={currentUser}
            currency={preferences.currency}
            journalEntries={journalEntries}
            transactions={transactions}
            onNavigate={setActiveTab}
            onSignOut={handleSignOut}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSeedData={handleSeedData}
            onNewJournal={() => setActiveTab('journal')}
            onNewTransaction={() => setActiveTab('finance')}
            seedingLoading={seedingLoading}
          />
        )}

        {activeTab === 'journal' && (
          <JournalView
            entries={journalEntries}
            onBack={() => setActiveTab('dashboard')}
            onSaveEntry={handleSaveJournal}
            onDeleteEntry={handleDeleteJournal}
            onSeedData={handleSeedData}
            seedingLoading={seedingLoading}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            transactions={transactions}
            currency={preferences.currency}
            onBack={() => setActiveTab('dashboard')}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onSeedData={handleSeedData}
            seedingLoading={seedingLoading}
          />
        )}

        {activeTab === 'ai' && (
          <AIChatView
            user={currentUser}
            currency={preferences.currency}
            journalEntries={journalEntries}
            transactions={transactions}
            onBack={() => setActiveTab('dashboard')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && currentUser && (
        <SettingsModal
          user={currentUser}
          preferences={preferences}
          onSavePreferences={handleSavePreferences}
          onClose={() => setIsSettingsOpen(false)}
          onSignOut={handleSignOut}
          journalCount={journalEntries.length}
          transactionCount={transactions.length}
          onExportData={handleExportData}
        />
      )}

      {/* Footer - accounts for mobile bottom bar with bottom margin on small screens */}
      <footer className="py-8 mb-20 md:mb-0 border-t border-[#e8ddd2] bg-[#f5f1eb] text-center">
        <p className="text-[#756b63] text-xs font-medium uppercase tracking-[0.2em]">
          Private &bull; Encrypted &bull; Intelligent
        </p>
      </footer>

      {/* Fixed Mobile Bottom Navigation Bar (Visible only on mobile/tablet widths) */}
      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8ddd2] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="grid grid-cols-4 max-w-md mx-auto px-2 pt-2 pb-[max(env(safe-area-inset-bottom,0px),0.65rem)]">
          {/* 1. Home / Dashboard */}
          <button
            id="mobile-nav-home"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[14px] transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-[#7b4a27] font-bold bg-[#f3e8dc]/50'
                : 'text-[#756b63] font-medium hover:text-[#1f1b18] hover:bg-[#f5f1eb]/50'
            }`}
          >
            <div className="relative">
              <LayoutDashboard className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'scale-110' : ''}`} />
            </div>
            <span className="text-[11px] leading-tight tracking-tight">Home</span>
          </button>

          {/* 2. Journal */}
          <button
            id="mobile-nav-journal"
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[14px] transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'text-[#7b4a27] font-bold bg-[#f3e8dc]/50'
                : 'text-[#756b63] font-medium hover:text-[#1f1b18] hover:bg-[#f5f1eb]/50'
            }`}
          >
            <div className="relative">
              <BookOpen className={`w-5 h-5 transition-transform ${activeTab === 'journal' ? 'scale-110' : ''}`} />
              {journalEntries.length > 0 && (
                <span className="absolute -top-1 -right-2 text-[9px] font-bold bg-[#7b4a27] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {journalEntries.length > 99 ? '99+' : journalEntries.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight tracking-tight">Journal</span>
          </button>

          {/* 3. Finance */}
          <button
            id="mobile-nav-finance"
            onClick={() => setActiveTab('finance')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[14px] transition-all cursor-pointer ${
              activeTab === 'finance'
                ? 'text-[#7b4a27] font-bold bg-[#f3e8dc]/50'
                : 'text-[#756b63] font-medium hover:text-[#1f1b18] hover:bg-[#f5f1eb]/50'
            }`}
          >
            <div className="relative">
              <Wallet className={`w-5 h-5 transition-transform ${activeTab === 'finance' ? 'scale-110' : ''}`} />
              {transactions.length > 0 && (
                <span className="absolute -top-1 -right-2 text-[9px] font-bold bg-[#7b4a27] text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {transactions.length > 99 ? '99+' : transactions.length}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-tight tracking-tight">Finance</span>
          </button>

          {/* 4. AI Insights */}
          <button
            id="mobile-nav-ai"
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[14px] transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'text-[#7b4a27] font-bold bg-[#f3e8dc]/50'
                : 'text-[#756b63] font-medium hover:text-[#1f1b18] hover:bg-[#f5f1eb]/50'
            }`}
          >
            <div className="relative">
              <Sparkles className={`w-5 h-5 transition-transform ${activeTab === 'ai' ? 'scale-110' : ''}`} />
            </div>
            <span className="text-[11px] leading-tight tracking-tight">AI Insights</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
