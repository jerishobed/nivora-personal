export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' }
];

export interface UserPreferences {
  currency: string;
  displayName?: string;
  bio?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  currency?: string;
  isAnonymous?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  mood?: 'calm' | 'inspired' | 'reflective' | 'stressed' | 'grateful' | 'focused' | 'other';
  wordCount?: number;
}

export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'Salary' | 'Business' | 'Freelance' | 'Investment' | 'Other';
export type ExpenseCategory = 'Food' | 'Transport' | 'Housing' | 'Bills' | 'Shopping' | 'Health' | 'Education' | 'Entertainment' | 'Other';
export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory | string;
  description: string;
  date: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: {
    journalCount?: number;
    transactionCount?: number;
  };
  suggestedFollowUps?: string[];
  feedback?: 'helpful' | 'unhelpful';
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  topExpenseCategory: string;
  categoryTotals: Record<string, number>;
}

export type ViewTab = 'dashboard' | 'journal' | 'finance' | 'ai';
