import React from 'react';
import { UserProfile, JournalEntry, Transaction, ViewTab } from '../types';
import { UserCard } from './UserCard';
import {
  BookOpen,
  Wallet,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  Layers,
  Sparkle
} from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  journalEntries: JournalEntry[];
  transactions: Transaction[];
  onNavigate: (tab: ViewTab) => void;
  onSignOut: () => void;
  onSeedData: () => void;
  onNewJournal: () => void;
  onNewTransaction: () => void;
  seedingLoading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  journalEntries,
  transactions,
  onNavigate,
  onSignOut,
  onSeedData,
  onNewJournal,
  onNewTransaction,
  seedingLoading = false
}) => {
  // Compute Financial Summaries
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((t) => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpense += t.amount;
  });
  const netBalance = totalIncome - totalExpense;

  const hasData = journalEntries.length > 0 || transactions.length > 0;

  return (
    <div id="nivora-dashboard" className="space-y-7">
      {/* Top User Header Card */}
      <UserCard user={user} onSignOut={onSignOut} />

      {/* Welcome / Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[18px] p-4 shadow-2xs">
          <p className="text-xs text-[#756b63] font-medium">Journal Entries</p>
          <p className="text-xl sm:text-2xl font-bold text-[#1f1b18] mt-1">
            {journalEntries.length}
          </p>
        </div>
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[18px] p-4 shadow-2xs">
          <p className="text-xs text-[#756b63] font-medium">Total Income</p>
          <p className="text-xl sm:text-2xl font-bold text-[#2e7d32] mt-1 truncate">
            ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[18px] p-4 shadow-2xs">
          <p className="text-xs text-[#756b63] font-medium">Total Expenses</p>
          <p className="text-xl sm:text-2xl font-bold text-[#7b4a27] mt-1 truncate">
            ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[18px] p-4 shadow-2xs">
          <p className="text-xs text-[#756b63] font-medium">Net Balance</p>
          <p
            className={`text-xl sm:text-2xl font-bold mt-1 truncate ${
              netBalance >= 0 ? 'text-[#1f1b18]' : 'text-[#c62828]'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* 3 Main Feature Cards matching Clean Minimalism design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Journal */}
        <div
          id="dashboard-feature-journal"
          className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-7 flex flex-col items-start shadow-sm hover:-translate-y-1 transition-transform"
        >
          <div className="w-14 h-14 bg-[#f3e8dc] rounded-2xl flex items-center justify-center mb-6">
            <BookOpen className="w-7 h-7 text-[#7b4a27]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1f1b18] mb-3">Journal</h3>
          <p className="text-[#756b63] leading-relaxed mb-6 flex-1 text-sm sm:text-base">
            Capture thoughts, memories, reflections, and important moments in your private space.
          </p>
          <div className="mt-auto w-full pt-4 border-t border-[#f5f1eb]">
            <div className="text-xs text-[#756b63] mb-3 uppercase tracking-wider font-semibold truncate">
              {journalEntries.length > 0
                ? `Recent: "${journalEntries[0].title || 'Morning Reflection...'}"`
                : '0 reflections logged'}
            </div>
            <button
              onClick={() => onNavigate('journal')}
              className="w-full py-3.5 bg-[#7b4a27] text-white rounded-[14px] font-bold hover:bg-[#603a1f] transition-colors cursor-pointer text-sm sm:text-base"
            >
              Open Journal
            </button>
          </div>
        </div>

        {/* Card 2: Finance */}
        <div
          id="dashboard-feature-finance"
          className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-7 flex flex-col items-start shadow-sm hover:-translate-y-1 transition-transform"
        >
          <div className="w-14 h-14 bg-[#f3e8dc] rounded-2xl flex items-center justify-center mb-6">
            <Wallet className="w-7 h-7 text-[#7b4a27]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1f1b18] mb-3">Finance</h3>
          <p className="text-[#756b63] leading-relaxed mb-6 flex-1 text-sm sm:text-base">
            Track income, expenses, spending patterns, and maintain your financial health.
          </p>
          <div className="mt-auto w-full pt-4 border-t border-[#f5f1eb]">
            <div className="text-xs text-[#7b4a27] mb-3 uppercase tracking-wider font-bold truncate">
              Balance: ${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="w-full py-3.5 bg-[#7b4a27] text-white rounded-[14px] font-bold hover:bg-[#603a1f] transition-colors cursor-pointer text-sm sm:text-base"
            >
              Open Finance
            </button>
          </div>
        </div>

        {/* Card 3: AI Insights */}
        <div
          id="dashboard-feature-ai"
          className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-7 flex flex-col items-start shadow-sm hover:-translate-y-1 transition-transform"
        >
          <div className="w-14 h-14 bg-[#f3e8dc] rounded-2xl flex items-center justify-center mb-6">
            <Sparkles className="w-7 h-7 text-[#7b4a27]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1f1b18] mb-3">AI Insights</h3>
          <p className="text-[#756b63] leading-relaxed mb-6 flex-1 text-sm sm:text-base">
            Ask NIVORA AI to help you understand your journal and find patterns in your finances.
          </p>
          <div className="mt-auto w-full pt-4 border-t border-[#f5f1eb]">
            <div className="text-xs text-[#756b63] mb-3 uppercase tracking-wider font-semibold truncate">
              {transactions.length > 0 || journalEntries.length > 0
                ? 'Gemini Flash Intelligence Active'
                : 'Ask questions about your data'}
            </div>
            <button
              onClick={() => onNavigate('ai')}
              className="w-full py-3.5 bg-[#7b4a27] text-white rounded-[14px] font-bold hover:bg-[#603a1f] transition-colors cursor-pointer text-sm sm:text-base"
            >
              Ask NIVORA AI
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Banner (with one-click seed button) */}
      {!hasData && (
        <div className="bg-[#f3e8dc]/70 border border-[#e8ddd2] rounded-[20px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#7b4a27] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#1f1b18]">
                Get Started with Sample Data
              </h4>
              <p className="text-xs sm:text-sm text-[#756b63] mt-0.5">
                Populate your private workspace with initial sample reflections and financial entries with one click.
              </p>
            </div>
          </div>
          <button
            id="dashboard-seed-sample-btn"
            onClick={onSeedData}
            disabled={seedingLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
          >
            {seedingLoading ? 'Loading Sample...' : 'Load Sample Data'}
          </button>
        </div>
      )}

      {/* Quick Actions & Recent Summary Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Journal Reflections */}
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#7b4a27]" />
                <h4 className="font-bold text-[#1f1b18]">Recent Reflections</h4>
              </div>
              <button
                onClick={onNewJournal}
                className="text-xs font-semibold text-[#7b4a27] hover:text-[#63391d] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </button>
            </div>

            {journalEntries.length === 0 ? (
              <div className="text-center py-8 text-[#756b63] text-sm">
                <p>No journal entries yet.</p>
                <button
                  onClick={onNewJournal}
                  className="mt-2 text-xs font-semibold text-[#7b4a27] underline cursor-pointer"
                >
                  Write your first thought
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {journalEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onNavigate('journal')}
                    className="p-3.5 rounded-[16px] bg-[#fffdfb] border border-[#e8ddd2] hover:border-[#7b4a27]/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-[#756b63] mb-1">
                      <span className="font-medium text-[#7b4a27]">{entry.date}</span>
                      {entry.mood && (
                        <span className="capitalize text-[11px] bg-[#f3e8dc] px-2 py-0.5 rounded-full text-[#7b4a27]">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <h5 className="font-semibold text-sm text-[#1f1b18] truncate">
                      {entry.title || 'Untitled Reflection'}
                    </h5>
                    <p className="text-xs text-[#756b63] line-clamp-2 mt-1">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#f5f1eb] text-right">
            <button
              onClick={() => onNavigate('journal')}
              className="text-xs font-semibold text-[#7b4a27] hover:underline cursor-pointer"
            >
              View all journal entries &rarr;
            </button>
          </div>
        </div>

        {/* Recent Financial Transactions */}
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#7b4a27]" />
                <h4 className="font-bold text-[#1f1b18]">Recent Transactions</h4>
              </div>
              <button
                onClick={onNewTransaction}
                className="text-xs font-semibold text-[#7b4a27] hover:text-[#63391d] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-[#756b63] text-sm">
                <p>No transactions recorded yet.</p>
                <button
                  onClick={onNewTransaction}
                  className="mt-2 text-xs font-semibold text-[#7b4a27] underline cursor-pointer"
                >
                  Record income or expense
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('finance')}
                    className="p-3 rounded-[14px] bg-[#fffdfb] border border-[#e8ddd2] flex items-center justify-between text-xs hover:border-[#7b4a27]/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          t.type === 'income'
                            ? 'bg-[#e8f5e9] text-[#2e7d32]'
                            : 'bg-[#f3e8dc] text-[#7b4a27]'
                        }`}
                      >
                        {t.type === 'income' ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1f1b18] truncate">
                          {t.description}
                        </p>
                        <p className="text-[11px] text-[#756b63]">
                          {t.date} &bull; {t.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold shrink-0 ml-2 ${
                        t.type === 'income' ? 'text-[#2e7d32]' : 'text-[#1f1b18]'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#f5f1eb] text-right">
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs font-semibold text-[#7b4a27] hover:underline cursor-pointer"
            >
              View all financial transactions &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
