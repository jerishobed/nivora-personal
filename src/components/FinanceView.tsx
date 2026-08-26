import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  Wallet,
  X,
  PieChart,
  Filter,
  DollarSign,
  ArrowUpDown,
  Sparkle
} from 'lucide-react';

interface FinanceViewProps {
  transactions: Transaction[];
  onBack: () => void;
  onSaveTransaction: (transaction: Omit<Transaction, 'id'> & { id?: string }) => Promise<void>;
  onDeleteTransaction: (transId: string) => Promise<void>;
  onSeedData: () => void;
  seedingLoading?: boolean;
}

const INCOME_CATEGORIES = ['Salary', 'Business', 'Freelance', 'Investment', 'Other'];
const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Bills',
  'Shopping',
  'Health',
  'Education',
  'Entertainment',
  'Other'
];

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  onBack,
  onSaveTransaction,
  onDeleteTransaction,
  onSeedData,
  seedingLoading = false
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Food');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openNewTransaction = (defaultType: TransactionType = 'expense') => {
    setEditingTrans(null);
    setFormType(defaultType);
    setFormAmount('');
    setFormCategory(defaultType === 'income' ? 'Salary' : 'Food');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const openEditTransaction = (t: Transaction) => {
    setEditingTrans(t);
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormCategory(t.category);
    setFormDescription(t.description);
    setFormDate(t.date);
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(formAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }
    if (!formDescription.trim()) {
      setErrorMsg('Please provide a description or merchant name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onSaveTransaction({
        id: editingTrans ? editingTrans.id : undefined,
        amount: numAmt,
        type: formType,
        category: formCategory,
        description: formDescription.trim(),
        date: formDate || new Date().toISOString().split('T')[0],
        createdAt: editingTrans ? editingTrans.createdAt : new Date().toISOString()
      });

      setIsEditorOpen(false);
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      setErrorMsg('Unable to save your transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteTransaction(id);
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // Compute Totals
  const { totalIncome, totalExpense, netBalance, categoryTotals, topCategory } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'income') {
        inc += t.amount;
      } else {
        exp += t.amount;
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      }
    });

    let maxCat = 'None';
    let maxVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    });

    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp,
      categoryTotals: catMap,
      topCategory: maxCat
    };
  }, [transactions]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
        const matchesQuery =
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.amount.toString().includes(searchQuery);

        return matchesType && matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortOrder === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, filterType, filterCategory, searchQuery, sortOrder]);

  return (
    <div id="nivora-finance-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="finance-back-btn"
            onClick={onBack}
            className="p-2 rounded-[14px] bg-white/90 border border-[#e8ddd2] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#eee7de] transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1f1b18]">Finance</h2>
            <p className="text-xs sm:text-sm text-[#756b63]">
              Track income, expenses, spending patterns, and financial health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="finance-add-expense-btn"
            onClick={() => openNewTransaction('expense')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] bg-white border border-[#dfd3c7] hover:bg-[#eee7de] text-[#1f1b18] text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-[#7b4a27]" />
            <span>Add Expense</span>
          </button>
          <button
            id="finance-add-income-btn"
            onClick={() => openNewTransaction('income')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[22px] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#756b63] mb-2 font-medium">
            <span>Total Income</span>
            <div className="w-7 h-7 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#2e7d32]">
            ${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#756b63] mt-1">Recorded inflows</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[22px] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#756b63] mb-2 font-medium">
            <span>Total Expenses</span>
            <div className="w-7 h-7 rounded-full bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#7b4a27]">
            ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#756b63] mt-1">
            Top category: <span className="font-semibold text-[#1f1b18]">{topCategory}</span>
          </p>
        </div>

        {/* Current Net Balance */}
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[22px] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#756b63] mb-2 font-medium">
            <span>Current Net Balance</span>
            <div className="w-7 h-7 rounded-full bg-[#f5f1eb] text-[#1f1b18] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#7b4a27]" />
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-bold ${
              netBalance >= 0 ? 'text-[#1f1b18]' : 'text-[#c62828]'
            }`}
          >
            {netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-[#756b63] mt-1">
            {totalIncome > 0 ? `${Math.round((netBalance / totalIncome) * 100)}% net retained` : 'Awaiting income'}
          </p>
        </div>
      </div>

      {/* Expense Category Breakdown Meter */}
      {totalExpense > 0 && (
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[22px] p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-sm font-bold text-[#1f1b18] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#7b4a27]" />
              <span>Expense Categories</span>
            </h4>
            <span className="text-xs text-[#756b63]">
              ${totalExpense.toFixed(2)} total
            </span>
          </div>

          <div className="space-y-2.5">
            {(Object.entries(categoryTotals) as [string, number][])
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([cat, amt]) => {
                const percent = Math.round((amt / totalExpense) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1f1b18]">{cat}</span>
                      <span className="text-[#756b63]">
                        ${amt.toFixed(2)} <span className="text-[10px]">({percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#f5f1eb] rounded-full h-2 overflow-hidden border border-[#e8ddd2]/50">
                      <div
                        className="bg-[#7b4a27] h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white/90 border border-[#e8ddd2] rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Type Toggle Tabs */}
        <div className="flex items-center p-1 rounded-[14px] bg-[#f5f1eb] border border-[#e8ddd2] w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-[11px] text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-[#1f1b18] shadow-2xs'
                : 'text-[#756b63] hover:text-[#1f1b18]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3.5 py-1.5 rounded-[11px] text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'expense'
                ? 'bg-white text-[#7b4a27] shadow-2xs'
                : 'text-[#756b63] hover:text-[#1f1b18]'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3.5 py-1.5 rounded-[11px] text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'income'
                ? 'bg-white text-[#2e7d32] shadow-2xs'
                : 'text-[#756b63] hover:text-[#1f1b18]'
            }`}
          >
            Income
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#756b63] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-1.5 text-xs sm:text-sm rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 focus:outline-hidden focus:border-[#7b4a27]"
          />
        </div>

        {/* Category & Sort */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs py-2 px-3 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] focus:outline-hidden focus:border-[#7b4a27] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#756b63] hover:text-[#1f1b18] focus:outline-hidden focus:border-[#7b4a27] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Transaction List or Empty State */}
      {filteredTransactions.length === 0 ? (
        <div
          id="finance-empty-state"
          className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs"
        >
          <div className="w-14 h-14 rounded-[18px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#1f1b18]">
            {searchQuery || filterCategory !== 'all' || filterType !== 'all'
              ? 'No matching transactions'
              : 'No transactions recorded yet'}
          </h3>
          <p className="text-xs sm:text-sm text-[#756b63] max-w-sm mx-auto mt-2 mb-6">
            {searchQuery || filterCategory !== 'all' || filterType !== 'all'
              ? 'Adjust your filters or search keywords.'
              : 'Start logging your income and daily expenses to unlock NIVORA financial insights.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openNewTransaction('expense')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
            >
              Record First Transaction
            </button>
            {transactions.length === 0 && (
              <button
                onClick={onSeedData}
                disabled={seedingLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-[14px] bg-[#f3e8dc] hover:bg-[#ebd9c7] text-[#7b4a27] text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {seedingLoading ? 'Loading Sample...' : 'Load Sample Finances'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 border border-[#e8ddd2] rounded-[24px] overflow-hidden shadow-xs">
          <div className="divide-y divide-[#f5f1eb]">
            {filteredTransactions.map((t) => (
              <div
                key={t.id}
                id={`transaction-row-${t.id}`}
                className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#fffdfb] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${
                      t.type === 'income'
                        ? 'bg-[#e8f5e9] text-[#2e7d32]'
                        : 'bg-[#f3e8dc] text-[#7b4a27]'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-semibold text-sm sm:text-base text-[#1f1b18] truncate">
                      {t.description}
                    </h5>
                    <div className="flex items-center gap-2 text-xs text-[#756b63] mt-0.5">
                      <span>{t.date}</span>
                      <span>&bull;</span>
                      <span className="bg-[#f5f1eb] text-[#756b63] px-2 py-0.5 rounded-[8px] border border-[#e8ddd2] text-[11px]">
                        {t.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <span
                    className={`text-base sm:text-lg font-bold ${
                      t.type === 'income' ? 'text-[#2e7d32]' : 'text-[#1f1b18]'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditTransaction(t)}
                      className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#7b4a27] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
                      title="Edit transaction"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(t.id)}
                      className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#c62828] hover:bg-[#fff5f5] transition-colors cursor-pointer"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Modal (Create / Edit) */}
      {isEditorOpen && (
        <div
          id="transaction-modal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-md p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-xl font-bold text-[#1f1b18]">
                {editingTrans ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <p className="text-xs text-[#756b63] mt-0.5">
                Saved securely in your private Firestore collection.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-[14px] bg-[#fff5f5] border border-[#fecaca] text-[#991b1b] text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#f5f1eb] rounded-[14px] border border-[#e8ddd2]">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('expense');
                    setFormCategory('Food');
                  }}
                  className={`py-2 rounded-[11px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    formType === 'expense'
                      ? 'bg-white text-[#7b4a27] shadow-xs'
                      : 'text-[#756b63]'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('income');
                    setFormCategory('Salary');
                  }}
                  className={`py-2 rounded-[11px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    formType === 'income'
                      ? 'bg-white text-[#2e7d32] shadow-xs'
                      : 'text-[#756b63]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Income</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Amount ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#756b63] absolute left-3.5 top-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-base font-bold focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Description / Payee
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grocery Market, Freelance Client, Electric Bill"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27] cursor-pointer"
                  >
                    {(formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-[14px] border border-[#dfd3c7] text-xs font-semibold text-[#756b63] hover:text-[#1f1b18] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="transaction-save-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingTrans ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e8ddd2] rounded-[22px] max-w-sm w-full p-6 text-center shadow-xl"
          >
            <div className="w-12 h-12 rounded-[16px] bg-[#fff5f5] text-[#c62828] flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-[#1f1b18]">Delete Transaction?</h4>
            <p className="text-xs sm:text-sm text-[#756b63] mt-1 mb-5">
              This transaction will be permanently removed from your Firestore records.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-[14px] border border-[#dfd3c7] text-xs font-semibold text-[#756b63] hover:text-[#1f1b18] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-transaction-btn"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-[14px] bg-[#c62828] hover:bg-[#b71c1c] text-white text-xs font-semibold shadow-2xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
