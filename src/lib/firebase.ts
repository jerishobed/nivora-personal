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
import { JournalEntry, Transaction, UserProfile, Conversation, UserPreferences, SUPPORTED_CURRENCIES } from '../types';
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

  // Sample Journals
  const sampleJournals = [
    {
      title: 'Quarterly Reflections & Clarity',
      content: 'Taking time this morning with a cup of black coffee to review the past few weeks. I have felt steady progress on my creative initiatives, though balance between work and rest needs more mindful boundaries. Looking forward to simplifying my daily workflow and prioritizing daily walks.',
      date: getPastDateStr(1),
      mood: 'calm' as const,
      tags: ['Reflections', 'Focus', 'Mindfulness']
    },
    {
      title: 'Deep Work & Strategy Session',
      content: 'Spent 4 focused hours building out the core product architecture. Made great breakthroughs in state management and data modeling. The key realization today: simplicity beats clever complexity every time.',
      date: getPastDateStr(3),
      mood: 'focused' as const,
      tags: ['Work', 'Ideas', 'Architecture']
    },
    {
      title: 'Weekend Reset & Gratitude',
      content: 'A quiet afternoon reading and visiting the local botanical gardens with family. Grateful for good health, quiet moments, and the space to think clearly without constant notifications.',
      date: getPastDateStr(6),
      mood: 'grateful' as const,
      tags: ['Gratitude', 'Personal', 'Health']
    }
  ];

  // Sample Transactions
  const sampleTransactions = [
    { amount: 5200, type: 'income' as const, category: 'Salary', description: 'Monthly Direct Deposit', date: getPastDateStr(2) },
    { amount: 850, type: 'income' as const, category: 'Freelance', description: 'Design Consultation Retainer', date: getPastDateStr(8) },
    { amount: 1650, type: 'expense' as const, category: 'Housing', description: 'Monthly Apartment Rent', date: getPastDateStr(3) },
    { amount: 142.50, type: 'expense' as const, category: 'Food', description: 'Organic Market & Groceries', date: getPastDateStr(1) },
    { amount: 68.00, type: 'expense' as const, category: 'Bills', description: 'High-Speed Fiber Internet', date: getPastDateStr(5) },
    { amount: 45.00, type: 'expense' as const, category: 'Transport', description: 'Metro Transit Card Pass', date: getPastDateStr(7) },
    { amount: 120.00, type: 'expense' as const, category: 'Health', description: 'Wellness Center & Fitness Membership', date: getPastDateStr(9) },
    { amount: 38.50, type: 'expense' as const, category: 'Food', description: 'Artisan Coffee & Books', date: getPastDateStr(4) }
  ];

  for (const j of sampleJournals) {
    await saveJournalEntry(uid, j);
  }
  for (const t of sampleTransactions) {
    await saveTransaction(uid, t);
  }
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

