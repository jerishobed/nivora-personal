import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { JournalEntry, Transaction, UserProfile, Conversation, UserPreferences, SUPPORTED_CURRENCIES, Goal } from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

const config = firebaseConfigJson as Record<string, any>;

// Initialize Firebase App
const app = !getApps().length ? initializeApp(config) : getApp();

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Database
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Auth Helpers
export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const loginWithEmail = async (email: string, pass: string): Promise<FirebaseUser> => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const registerWithEmail = async (email: string, pass: string, name?: string): Promise<FirebaseUser> => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && result.user) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
};

export const loginAsDemo = async (): Promise<FirebaseUser> => {
  const result = await signInAnonymously(auth);
  if (result.user && !result.user.displayName) {
    await updateProfile(result.user, { displayName: 'Guest Explorer' });
  }
  return result.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentIdToken = async (forceRefresh = false): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await currentUser.getIdToken(forceRefresh);
};

export const formatCurrency = (amount: number, currencyCode = 'USD'): string => {
  const curr = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${amount < 0 ? '-' : ''}${curr.symbol}${formatted}`;
};

export const mapFirebaseUser = (user: FirebaseUser | null, extraPrefs?: Partial<UserProfile>): UserProfile | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: extraPrefs?.displayName || user.displayName || (user.isAnonymous ? 'Guest Explorer' : user.email?.split('@')[0] || 'Nivora User'),
    photoURL: user.photoURL,
    bio: extraPrefs?.bio || '',
    currency: extraPrefs?.currency || 'USD',
    isAnonymous: user.isAnonymous
  };
};

// User Profile & Preferences (User-scoped: users/{uid}/settings/preferences)
export const subscribeToUserPreferences = (
  uid: string,
  callback: (prefs: UserPreferences) => void
) => {
  const prefRef = doc(db, 'users', uid, 'settings', 'preferences');
  return onSnapshot(
    prefRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          currency: data.currency || 'USD',
          displayName: data.displayName,
          bio: data.bio || ''
        });
      } else {
        callback({ currency: 'USD', bio: '' });
      }
    },
    (err) => {
      console.warn('Preferences subscription warning:', err);
    }
  );
};

export const saveUserPreferences = async (
  uid: string,
  prefs: Partial<UserPreferences>
): Promise<void> => {
  const prefRef = doc(db, 'users', uid, 'settings', 'preferences');
  const payload = {
    ...prefs,
    updatedAt: new Date().toISOString(),
    _serverTimestamp: serverTimestamp()
  };

  // Sync with Firebase Auth displayName if provided
  if (prefs.displayName && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, { displayName: prefs.displayName });
    } catch (e) {
      console.warn('Could not update Auth displayName:', e);
    }
  }

  // Update local cache
  try {
    localStorage.setItem(`nivora_prefs_${uid}`, JSON.stringify(prefs));
  } catch (e) {}

  await setDoc(prefRef, payload, { merge: true });
};

// Universal Share Helper
export const shareContent = async (options: {
  title: string;
  text: string;
  url?: string;
}): Promise<{ success: boolean; method: 'native' | 'clipboard' }> => {
  const shareData = {
    title: options.title,
    text: options.text,
    url: options.url || window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback: Copy formatted text to clipboard
  try {
    const textToCopy = `${options.title}\n\n${options.text}${options.url ? `\n\nLink: ${options.url}` : ''}`;
    await navigator.clipboard.writeText(textToCopy);
    return { success: true, method: 'clipboard' };
  } catch (e) {
    return { success: false, method: 'clipboard' };
  }
};

// Journal Firestore API (User-scoped: users/{uid}/journal/{entryId})
export const subscribeToJournal = (
  uid: string,
  callback: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) => {
  const journalRef = collection(db, 'users', uid, 'journal');
  const q = query(journalRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Untitled Reflection',
          content: data.content || '',
          date: data.date || new Date().toISOString().split('T')[0],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          tags: data.tags || [],
          mood: data.mood || 'reflective',
          wordCount: (data.content || '').trim().split(/\s+/).filter(Boolean).length
        };
      });
      callback(items);
    },
    (error) => {
      console.error('Firestore journal subscription error:', error);
      if (onError) onError(error);
    }
  );
};

export const saveJournalEntry = async (
  uid: string,
  entry: Partial<JournalEntry> & { content: string }
): Promise<string> => {
  const journalCollection = collection(db, 'users', uid, 'journal');
  const entryId = entry.id || doc(journalCollection).id;
  const docRef = doc(db, 'users', uid, 'journal', entryId);

  const now = new Date().toISOString();
  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;

  const dataToSave = {
    title: (entry.title || '').trim() || 'Untitled Reflection',
    content: entry.content,
    date: entry.date || now.split('T')[0],
    tags: entry.tags || [],
    mood: entry.mood || 'reflective',
    wordCount,
    updatedAt: now,
    createdAt: entry.createdAt || now,
    _serverTimestamp: serverTimestamp()
  };

  await setDoc(docRef, dataToSave, { merge: true });
  return entryId;
};

export const deleteJournalEntry = async (uid: string, entryId: string): Promise<void> => {
  const docRef = doc(db, 'users', uid, 'journal', entryId);
  await deleteDoc(docRef);
};

// Transactions Firestore API (User-scoped: users/{uid}/transactions/{transactionId})
export const subscribeToTransactions = (
  uid: string,
  callback: (transactions: Transaction[]) => void,
  onError?: (err: Error) => void
) => {
  const transRef = collection(db, 'users', uid, 'transactions');
  const q = query(transRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          amount: Number(data.amount) || 0,
          type: data.type === 'income' ? 'income' : 'expense',
          category: data.category || 'Other',
          description: data.description || 'Transaction',
          date: data.date || new Date().toISOString().split('T')[0],
          createdAt: data.createdAt || new Date().toISOString()
        };
      });
      callback(items);
    },
    (error) => {
      console.error('Firestore transaction subscription error:', error);
      if (onError) onError(error);
    }
  );
};

export const saveTransaction = async (
  uid: string,
  transaction: Partial<Transaction> & { amount: number; type: 'income' | 'expense'; description: string }
): Promise<string> => {
  const transCollection = collection(db, 'users', uid, 'transactions');
  const transId = transaction.id || doc(transCollection).id;
  const docRef = doc(db, 'users', uid, 'transactions', transId);

  const now = new Date().toISOString();
  const dataToSave = {
    amount: Number(transaction.amount) || 0,
    type: transaction.type,
    category: transaction.category || 'Other',
    description: transaction.description.trim() || 'Transaction',
    date: transaction.date || now.split('T')[0],
    createdAt: transaction.createdAt || now,
    _serverTimestamp: serverTimestamp()
  };

  await setDoc(docRef, dataToSave, { merge: true });
  return transId;
};

export const deleteTransaction = async (uid: string, transId: string): Promise<void> => {
  const docRef = doc(db, 'users', uid, 'transactions', transId);
  await deleteDoc(docRef);
};

// Seed initial sample data for new users to explore
export const seedSampleData = async (uid: string): Promise<void> => {
  const today = new Date();
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Full Rich Demo Storyline (10 Journals spanning 4 weeks)
  const sampleJournals = [
    {
      title: 'Setting Fresh Monthly Intentions',
      content: 'Starting this month with clear, intentional boundaries. Finalized our new product prototype and mapped out a disciplined savings target for upcoming travel. Feeling clear and aligned.',
      date: getPastDateStr(28),
      mood: 'inspired' as const,
      tags: ['Strategy', 'Goals', 'Productivity']
    },
    {
      title: 'Deep Work Sprint & Late Delivery',
      content: 'Pushed hard to resolve infrastructure bottlenecks before the launch deadline. Ordered late-night delivery dinner because I was too depleted to cook. Reminding myself that rest is productive.',
      date: getPastDateStr(24),
      mood: 'stressed' as const,
      tags: ['Engineering', 'Deadlines', 'Work']
    },
    {
      title: 'Morning Trail Run & Mental Clarity',
      content: 'Woke up early for a 5k trail run before opening my laptop. The crisp morning air brought immense clarity. Zero urge to check social media or impulse browse.',
      date: getPastDateStr(21),
      mood: 'calm' as const,
      tags: ['Wellness', 'Fitness', 'Nature']
    },
    {
      title: 'Client Consulting Milestone Delivered',
      content: 'Delivered the final milestone for our client consulting sprint. Grateful for smooth collaboration, positive feedback, and prompt invoice approval.',
      date: getPastDateStr(17),
      mood: 'grateful' as const,
      tags: ['Freelance', 'Milestone', 'Career']
    },
    {
      title: 'Mid-Month Financial & Habits Review',
      content: 'Reviewed spending across living and discretionary buckets. Noticed that dining expenses crept up during high-stress sprint days, but weekend mindfulness helped reset my budget trajectory.',
      date: getPastDateStr(14),
      mood: 'focused' as const,
      tags: ['Finance', 'Habits', 'Review']
    },
    {
      title: 'Weekend Book Club & Coffee Tasting',
      content: 'Spent a leisurely Saturday afternoon discussing behavioral psychology and value-based living with close friends over pour-over coffees. Great perspectives on intentional living.',
      date: getPastDateStr(10),
      mood: 'reflective' as const,
      tags: ['Community', 'Learning', 'Mindfulness']
    },
    {
      title: 'Building Cloud Architecture & Flow State',
      content: 'Submerged in uninterrupted flow state optimizing our cloud backend services. Everything deployed cleanly with sub-second latency and zero errors.',
      date: getPastDateStr(7),
      mood: 'focused' as const,
      tags: ['Engineering', 'Flow', 'Milestone']
    },
    {
      title: 'Restorative Evening & Weekly Meal Prep',
      content: 'Took time to cook fresh wholesome meals for the week. Cooking is therapeutic and saves significantly on weekday takeout.',
      date: getPastDateStr(4),
      mood: 'calm' as const,
      tags: ['Wellness', 'Home', 'Mindfulness']
    },
    {
      title: 'Celebrating Product Launch',
      content: 'Our product release is officially live! Celebrated this huge milestone with dinner with the team. Proud of our persistence and craftsmanship.',
      date: getPastDateStr(2),
      mood: 'inspired' as const,
      tags: ['Celebration', 'Milestone', 'Team']
    },
    {
      title: 'Clarity, Balance & Next Horizon',
      content: 'Reflecting on the harmony built between mindful daily thoughts and conscious financial progress. Entering the new week with grounded calm and clear focus.',
      date: getPastDateStr(0),
      mood: 'grateful' as const,
      tags: ['Gratitude', 'Clarity', 'Vision']
    }
  ];

  // Full Rich Financial Ledger (14 Transactions)
  const sampleTransactions = [
    { amount: 4500.0, type: 'income' as const, category: 'Salary', description: 'Monthly Creative Director Salary', date: getPastDateStr(26) },
    { amount: 1400.0, type: 'expense' as const, category: 'Housing', description: 'Monthly Apartment Rent', date: getPastDateStr(25) },
    { amount: 48.5, type: 'expense' as const, category: 'Food', description: 'Late-night Sprint Delivery Dinner', date: getPastDateStr(24) },
    { amount: 120.0, type: 'expense' as const, category: 'Bills', description: 'High-Speed Fiber Internet & Utilities', date: getPastDateStr(23) },
    { amount: 145.5, type: 'expense' as const, category: 'Food', description: 'Whole Foods Organic Groceries', date: getPastDateStr(20) },
    { amount: 85.0, type: 'expense' as const, category: 'Health', description: 'Monthly Gym & Climbing Membership', date: getPastDateStr(18) },
    { amount: 1250.0, type: 'income' as const, category: 'Freelance', description: 'Client UI Consulting Milestone 2', date: getPastDateStr(16) },
    { amount: 18.0, type: 'expense' as const, category: 'Food', description: 'Specialty Pour-over Coffee & Pastry', date: getPastDateStr(15) },
    { amount: 35.0, type: 'expense' as const, category: 'Education', description: 'Design & AI Masterclass Subscription', date: getPastDateStr(14) },
    { amount: 130.0, type: 'expense' as const, category: 'Food', description: 'Weekly Farmers Market & Pantry Restock', date: getPastDateStr(12) },
    { amount: 24.0, type: 'expense' as const, category: 'Transport', description: 'Metro & Transit Card Reload', date: getPastDateStr(9) },
    { amount: 45.0, type: 'expense' as const, category: 'Shopping', description: 'Ergonomic Desk Accessories', date: getPastDateStr(5) },
    { amount: 95.0, type: 'expense' as const, category: 'Food', description: 'Fresh Produce & Meal Prep Groceries', date: getPastDateStr(3) },
    { amount: 72.0, type: 'expense' as const, category: 'Entertainment', description: 'Team Milestone Celebration Dinner', date: getPastDateStr(2) }
  ];

  // 4 Smart Milestone Goals
  const sampleGoals = [
    {
      title: 'Emergency Peace-of-Mind Fund (6 Months)',
      targetAmount: 5000,
      currentAmount: 4200,
      category: 'savings' as const,
      targetDate: '2026-12-31'
    },
    {
      title: 'Kyoto & Tokyo Autumn Mindful Trip',
      targetAmount: 2800,
      currentAmount: 1750,
      category: 'travel' as const,
      targetDate: '2026-10-15'
    },
    {
      title: 'Mindfulness & Silent Wellness Retreat',
      targetAmount: 800,
      currentAmount: 800,
      category: 'wellness' as const,
      targetDate: '2026-09-01'
    },
    {
      title: 'AI Product Design Certification',
      targetAmount: 1200,
      currentAmount: 900,
      category: 'education' as const,
      targetDate: '2026-11-30'
    }
  ];

  // Save Preferences
  try {
    await saveUserPreferences(uid, {
      displayName: 'Alex Morgan',
      bio: 'Product Designer & Tech Creator exploring mindful living, intentional finance, and personal growth.',
      currency: 'USD'
    });
  } catch (e) {}

  // Save Journals
  for (const j of sampleJournals) {
    await saveJournalEntry(uid, j);
  }

  // Save Transactions
  for (const t of sampleTransactions) {
    await saveTransaction(uid, t);
  }

  // Save Goals
  for (const g of sampleGoals) {
    await saveGoal(uid, g);
  }

  // Save Sample AI Conversation
  try {
    await saveConversation(uid, {
      id: 'demo-analysis-thread',
      title: 'Mind & Money Behavioral Analysis',
      messages: [
        {
          id: 'msg-1',
          sender: 'user',
          text: 'Can you analyze how my reflections relate to my dining and grocery spending over the past month?',
          timestamp: Date.now() - 3600000
        },
        {
          id: 'msg-2',
          sender: 'assistant',
          text: `Looking across your past 4 weeks of entries, here are the key behavioral patterns in your data:

### 1. The Work-Stress Delivery Correlation
• **Observation**: During deep work sprint deadlines (e.g., when logged as **Stressed** 24 days ago), takeout delivery spending increased ($48.50) due to decision fatigue and depletion.
• **Takeaway**: Meal prepping on calm Sundays reduced takeout needs by **65%** during the week.

### 2. High-Clarity Days Boost Savings
• **Observation**: On days following morning trail runs and restorative weekends (logged as **Calm** and **Grateful**), impulsive online shopping was zero.
• **Financial Impact**: Net savings reached **$3,000+** this month across salary and freelance consulting.

### 3. Milestone Progress
• **Emergency Peace-of-Mind Fund**: **84% funded** ($4,200 / $5,000).
• **Wellness Retreat**: **100% Achieved! 🎉**`,
          timestamp: Date.now() - 3550000
        }
      ]
    });
  } catch (e) {}
};

// Conversations Firestore API (User-scoped: users/{uid}/conversations/{conversationId})
export const subscribeToConversations = (
  uid: string,
  callback: (conversations: Conversation[]) => void,
  onError?: (err: Error) => void
) => {
  const convRef = collection(db, 'users', uid, 'conversations');
  const q = query(convRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Conversation[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'New Conversation',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          messages: Array.isArray(data.messages) ? data.messages : []
        };
      });
      callback(items);
    },
    (error) => {
      console.warn('Firestore conversation subscription error (falling back to local cache):', error);
      if (onError) onError(error);
    }
  );
};

export const saveConversation = async (
  uid: string,
  conversation: Partial<Conversation> & { id: string; messages: any[] }
): Promise<string> => {
  const docRef = doc(db, 'users', uid, 'conversations', conversation.id);
  const now = new Date().toISOString();

  // Also cache locally for instant availability
  try {
    const localKey = `nivora_conv_${uid}_${conversation.id}`;
    localStorage.setItem(localKey, JSON.stringify(conversation));
  } catch (e) {
    // Ignore localStorage quota errors
  }

  const dataToSave = {
    id: conversation.id,
    title: (conversation.title || 'New Conversation').slice(0, 100),
    messages: conversation.messages,
    createdAt: conversation.createdAt || now,
    updatedAt: now,
    _serverTimestamp: serverTimestamp()
  };

  try {
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (err) {
    console.warn('Could not save conversation to Firestore, preserved in local cache:', err);
  }
  return conversation.id;
};

export const deleteConversation = async (uid: string, convId: string): Promise<void> => {
  try {
    localStorage.removeItem(`nivora_conv_${uid}_${convId}`);
  } catch (e) {}

  try {
    const docRef = doc(db, 'users', uid, 'conversations', convId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Error deleting conversation from Firestore:', err);
  }
};

// Goals Firestore subscriptions and management
export const subscribeToGoals = (
  uid: string,
  callback: (goals: Goal[]) => void,
  onError?: (err: any) => void
) => {
  const goalsCollection = collection(db, 'users', uid, 'goals');
  const q = query(goalsCollection, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Goal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || 'Goal',
          targetAmount: Number(data.targetAmount) || 0,
          currentAmount: Number(data.currentAmount) || 0,
          category: data.category || 'savings',
          targetDate: data.targetDate,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });
      callback(items);
    },
    (error) => {
      console.warn('Firestore goals subscription error:', error);
      if (onError) onError(error);
    }
  );
};

export const saveGoal = async (
  uid: string,
  goal: Partial<Goal> & { title: string; targetAmount: number }
): Promise<string> => {
  const goalsCollection = collection(db, 'users', uid, 'goals');
  const goalId = goal.id || doc(goalsCollection).id;
  const docRef = doc(db, 'users', uid, 'goals', goalId);
  const now = new Date().toISOString();

  const dataToSave = {
    id: goalId,
    title: goal.title.trim(),
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    category: goal.category || 'savings',
    targetDate: goal.targetDate || '',
    createdAt: goal.createdAt || now,
    updatedAt: now,
    _serverTimestamp: serverTimestamp()
  };

  await setDoc(docRef, dataToSave, { merge: true });
  return goalId;
};

export const deleteGoal = async (uid: string, goalId: string): Promise<void> => {
  const docRef = doc(db, 'users', uid, 'goals', goalId);
  await deleteDoc(docRef);
};

