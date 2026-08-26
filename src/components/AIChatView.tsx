import React, { useState, useRef, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import {
  JournalEntry,
  Transaction,
  ChatMessage,
  Conversation,
  UserProfile,
  ViewTab
} from '../types';
import {
  subscribeToConversations,
  saveConversation,
  deleteConversation as deleteFirestoreConv,
  getCurrentIdToken
} from '../lib/firebase';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Plus,
  History,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Wallet,
  Loader2,
  Brain,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  X,
  RefreshCw,
  Clock
} from 'lucide-react';

interface AIChatViewProps {
  user: UserProfile | null;
  journalEntries: JournalEntry[];
  transactions: Transaction[];
  onBack: () => void;
  onNavigate?: (tab: ViewTab) => void;
}

const STARTER_PROMPTS = [
  'How has my spending changed this month?',
  'What patterns do you notice in my journal?',
  'What are my biggest expenses?',
  'What can I improve this month?'
];

// Helper to generate a concise, human title from user question
const generateConversationTitle = (firstQuestion: string): string => {
  const q = firstQuestion.trim();
  const lower = q.toLowerCase();

  if (lower.includes('spending') && (lower.includes('month') || lower.includes('changed'))) {
    return 'Monthly Spending';
  }
  if (lower.includes('journal') && (lower.includes('pattern') || lower.includes('notice') || lower.includes('theme'))) {
    return 'Journal Patterns';
  }
  if (lower.includes('biggest expense') || lower.includes('largest expense') || lower.includes('top expense')) {
    return 'Biggest Expenses';
  }
  if (lower.includes('improve') || lower.includes('habit')) {
    return 'Monthly Improvements';
  }
  if (lower.includes('food') || lower.includes('grocery') || lower.includes('groceries') || lower.includes('dining')) {
    return 'Food Spending';
  }
  if (lower.includes('budget') || lower.includes('saving') || lower.includes('savings rate')) {
    return 'Savings & Budget';
  }
  if (lower.includes('mood') || lower.includes('mindset') || lower.includes('feeling') || lower.includes('reflection')) {
    return 'Mindset & Reflections';
  }
  if (lower.includes('income') || lower.includes('salary') || lower.includes('revenue')) {
    return 'Income Analysis';
  }

  // Fallback: clean up question prefixes and take up to 4 words
  const cleaned = q
    .replace(/^(can you |could you |please |tell me |what is |what are |how is |how are |how has |how much |why is |what )/i, '')
    .replace(/[?!.]+$/, '');
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  if (words.length > 2) {
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return 'Personal Insight';
};

// Helper for dynamic follow-up suggestions
const generateSuggestedFollowUps = (lastQuery: string, lastResponse: string): string[] => {
  const text = (lastQuery + ' ' + lastResponse).toLowerCase();

  if (text.includes('food') || text.includes('grocery') || text.includes('dining')) {
    return [
      'What was my biggest single expense?',
      'How does food compare to my other expense categories?',
      'How can I optimize my food spending?',
      'What habits appear in my reflections around meals and dining?'
    ];
  }
  if (text.includes('expense') || text.includes('spend') || text.includes('cost') || text.includes('housing') || text.includes('bills')) {
    return [
      'What was my biggest expense?',
      'How much did I spend on food?',
      'Show me my spending pattern',
      'How can I reduce my expenses?'
    ];
  }
  if (text.includes('journal') || text.includes('mood') || text.includes('reflection') || text.includes('mindset') || text.includes('work')) {
    return [
      'What recurring themes appear in my journal?',
      'How has my mindset evolved recently?',
      'What triggers my best focus days?',
      'Summarize my key personal realizations'
    ];
  }
  if (text.includes('income') || text.includes('savings') || text.includes('balance') || text.includes('cash')) {
    return [
      'What is my current net savings rate?',
      'What are my key financial strengths right now?',
      'How can I build a healthier buffer?',
      'What financial goals should I focus on this quarter?'
    ];
  }

  return [
    'How has my spending changed this month?',
    'What was my biggest expense?',
    'What patterns do you notice in my journal?',
    'What can I improve this month?'
  ];
};

export const AIChatView: React.FC<AIChatViewProps> = ({
  user,
  journalEntries,
  transactions,
  onBack,
  onNavigate
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>(() => `conv-${Date.now()}`);
  const [activeConvTitle, setActiveConvTitle] = useState<string>('New Conversation');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load / Subscribe to user's conversation history
  useEffect(() => {
    if (!user?.uid) {
      // Local fallback for guest / initial session
      try {
        const localKey = 'nivora_guest_conversations';
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setConversations(parsed);
          }
        }
      } catch (e) {}
      return;
    }

    const unsub = subscribeToConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
      },
      () => {
        // Fallback to local storage if Firestore error
        try {
          const localList: Conversation[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`nivora_conv_${user.uid}_`)) {
              const val = localStorage.getItem(key);
              if (val) localList.push(JSON.parse(val));
            }
          }
          localList.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          setConversations(localList);
        } catch (e) {}
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Helper to persist current active conversation
  const persistConversationState = async (
    convId: string,
    title: string,
    updatedMessages: ChatMessage[]
  ) => {
    const now = new Date().toISOString();
    const convObj: Conversation = {
      id: convId,
      title,
      messages: updatedMessages,
      createdAt: now,
      updatedAt: now
    };

    if (user?.uid) {
      await saveConversation(user.uid, convObj);
    } else {
      // Local cache for guests
      try {
        const localKey = 'nivora_guest_conversations';
        const existing: Conversation[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const filtered = existing.filter((c) => c.id !== convId);
        const updatedList = [convObj, ...filtered];
        localStorage.setItem(localKey, JSON.stringify(updatedList));
        setConversations(updatedList);
      } catch (e) {}
    }
  };

  // Start fresh conversation
  const handleStartNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    setActiveConvId(newId);
    setActiveConvTitle('New Conversation');
    setMessages([]);
    setShowHistoryModal(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Select an existing conversation from history
  const handleSelectConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveConvTitle(conv.title || 'Conversation');
    setMessages(conv.messages || []);
    setShowHistoryModal(false);
  };

  // Delete conversation
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (user?.uid) {
      await deleteFirestoreConv(user.uid, convId);
    } else {
      try {
        const localKey = 'nivora_guest_conversations';
        const existing: Conversation[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const updatedList = existing.filter((c) => c.id !== convId);
        localStorage.setItem(localKey, JSON.stringify(updatedList));
        setConversations(updatedList);
      } catch (e) {}
    }

    if (activeConvId === convId) {
      handleStartNewConversation();
    }
  };

  // Send message handler with multi-turn context
  const handleSendPrompt = async (promptText: string) => {
    const query = promptText.trim();
    if (!query || isLoading) return;

    setInputQuery('');

    // Determine conversation title if this is the first question
    let currentTitle = activeConvTitle;
    if (messages.length === 0 || activeConvTitle === 'New Conversation') {
      currentTitle = generateConversationTitle(query);
      setActiveConvTitle(currentTitle);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now()
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    setIsLoading(true);

    // Save user message immediately to storage
    persistConversationState(activeConvId, currentTitle, newMessagesList);

    try {
      // Build conversation history payload for multi-turn reasoning
      const historyPayload = messages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      // Retrieve Firebase ID Token for server-side verification
      const idToken = await getCurrentIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: query,
          journalEntries,
          transactions,
          conversationHistory: historyPayload
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Too many AI requests. Please try again shortly.');
        }
        throw new Error('API response returned an error status.');
      }

      const data = await res.json();
      const rawText = data.text || 'Insight generated.';
      const followUps = generateSuggestedFollowUps(query, rawText);

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: rawText,
        timestamp: Date.now(),
        sources: data.sources,
        suggestedFollowUps: followUps
      };

      const finalMessagesList = [...newMessagesList, assistantMessage];
      setMessages(finalMessagesList);

      // Persist full conversation with AI response
      persistConversationState(activeConvId, currentTitle, finalMessagesList);
    } catch (err: any) {
      console.warn('AI Assistant request note:', err?.message || err);

      const errorMessage = err?.message && err.message.includes('Too many AI requests')
        ? 'Too many AI requests. Please wait a moment before asking another question.'
        : 'Sorry, I couldn\'t generate that insight right now.';

      const errAiMessage: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: errorMessage,
        timestamp: Date.now(),
        isError: true,
        suggestedFollowUps: [
          'How has my spending changed this month?',
          'What patterns do you notice in my journal?',
          'What was my biggest expense?'
        ]
      };

      const finalMessagesList = [...newMessagesList, errAiMessage];
      setMessages(finalMessagesList);
      persistConversationState(activeConvId, currentTitle, finalMessagesList);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate last AI response
  const handleRegenerate = async (aiMsgId: string) => {
    if (isLoading) return;
    const msgIndex = messages.findIndex((m) => m.id === aiMsgId);
    if (msgIndex === -1) return;

    // Find previous user message
    const previousUserMsg = messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.sender === 'user');

    if (previousUserMsg) {
      // Remove this AI message and re-send the prompt
      const trimmed = messages.slice(0, msgIndex);
      setMessages(trimmed);
      handleSendPrompt(previousUserMsg.text);
    }
  };

  // Copy AI response text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  // Feedback handler (helpful / unhelpful)
  const handleFeedback = (msgId: string, fb: 'helpful' | 'unhelpful') => {
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return { ...m, feedback: m.feedback === fb ? undefined : fb };
      }
      return m;
    });
    setMessages(updated);
    persistConversationState(activeConvId, activeConvTitle, updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(inputQuery);
    }
  };

  // Check if current conversation touches finance or journal
  const activeSuggestedFollowUps = useMemo(() => {
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === 'assistant' && !m.isError);
    if (lastAiMsg?.suggestedFollowUps && lastAiMsg.suggestedFollowUps.length > 0) {
      return lastAiMsg.suggestedFollowUps;
    }
    return [
      'What was my biggest expense?',
      'How much did I spend on food?',
      'Show me my spending pattern',
      'What patterns do you notice in my journal?'
    ];
  }, [messages]);

  return (
    <div id="nivora-ai-insights-view" className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-[#e8ddd2] p-4 rounded-[20px] shadow-xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            id="ai-back-btn"
            onClick={onBack}
            className="p-2 rounded-[12px] bg-[#fffdfb] border border-[#e8ddd2] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1f1b18] tracking-tight">
                NIVORA AI
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#f3e8dc] text-[#7b4a27] px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Intelligence
              </span>
            </div>
            <p className="text-xs text-[#756b63] truncate max-w-xs sm:max-w-md">
              {messages.length > 0 ? activeConvTitle : 'Your private intelligence layer'}
            </p>
          </div>
        </div>

        {/* Right: History, New Chat, & Context badges */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Conversation History Modal Trigger */}
          <button
            id="ai-history-btn"
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold text-[#1f1b18] bg-[#fffdfb] hover:bg-[#f5f1eb] border border-[#e8ddd2] transition-colors cursor-pointer"
            title="View recent conversations"
          >
            <History className="w-3.5 h-3.5 text-[#7b4a27]" />
            <span>Conversations</span>
            {conversations.length > 0 && (
              <span className="text-[10px] bg-[#f3e8dc] text-[#7b4a27] px-1.5 py-0.2 rounded-full font-bold">
                {conversations.length}
              </span>
            )}
          </button>

          {/* New Conversation Button */}
          <button
            id="ai-new-conversation-btn"
            onClick={handleStartNewConversation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-xs font-semibold text-white bg-[#7b4a27] hover:bg-[#63391d] transition-all cursor-pointer shadow-2xs"
            title="Start new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Conversation</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white/90 border border-[#e8ddd2] rounded-[24px] shadow-xs flex flex-col h-[calc(100vh-250px)] min-h-[480px] md:h-[650px] md:max-h-[78vh] overflow-hidden relative">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
              <div className="w-14 h-14 rounded-[20px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mb-4 shadow-2xs">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-[#1f1b18] tracking-tight">
                NIVORA AI
              </h3>
              <p className="text-sm font-medium text-[#7b4a27] mt-1">
                Your private intelligence layer.
              </p>
              <p className="text-xs sm:text-sm text-[#756b63] mt-2 mb-8 max-w-md leading-relaxed">
                Ask me about your journal, finances, spending patterns, habits, or personal reflections.
              </p>

              {/* Starter Prompts */}
              <div className="w-full text-left space-y-2">
                <p className="text-xs font-semibold text-[#756b63] uppercase tracking-wider mb-2.5">
                  Suggested Starter Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendPrompt(prompt)}
                      className="text-left p-3.5 rounded-[16px] bg-[#fffdfb] hover:bg-[#f3e8dc]/60 border border-[#dfd3c7] hover:border-[#7b4a27]/40 text-xs sm:text-sm text-[#1f1b18] transition-all cursor-pointer shadow-2xs group flex items-start gap-2.5"
                    >
                      <Sparkles className="w-4 h-4 text-[#7b4a27] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="leading-snug font-medium">{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Grounding Summary */}
              <div className="mt-8 flex items-center gap-3 text-[11px] text-[#756b63] bg-[#fffdfb] px-3.5 py-1.5 rounded-full border border-[#e8ddd2]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#7b4a27]" />
                  <b>{journalEntries.length}</b> Reflections
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-[#7b4a27]" />
                  <b>{transactions.length}</b> Records
                </span>
              </div>
            </div>
          ) : (
            /* Conversation Messages */
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* AI Avatar */}
                  {msg.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-[12px] bg-[#7b4a27] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs mt-1">
                      N
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User Bubble */}
                    {msg.sender === 'user' ? (
                      <div className="rounded-[20px] rounded-br-[4px] p-4 bg-[#7b4a27] text-white shadow-xs text-sm sm:text-[15px] leading-relaxed">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ) : (
                      /* AI Bubble */
                      <div className="rounded-[20px] rounded-tl-[4px] p-4 sm:p-5 bg-[#fffdfb] border border-[#e8ddd2] text-[#1f1b18] shadow-xs w-full">
                        {/* AI Label & Time */}
                        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#f5f1eb]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#7b4a27] uppercase tracking-wider">
                              NIVORA AI
                            </span>
                            <span className="text-[11px] text-[#756b63]">&bull; Insight</span>
                          </div>
                          <span className="text-[10px] text-[#756b63]">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Message Content */}
                        {msg.isError ? (
                          <div className="space-y-3 py-1">
                            <p className="text-sm text-[#1f1b18] font-medium">
                              Sorry, I couldn't generate that insight right now.
                            </p>
                            <button
                              onClick={() => handleRegenerate(msg.id)}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold text-[#7b4a27] bg-[#f3e8dc] hover:bg-[#ebd9c7] transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Try again</span>
                            </button>
                          </div>
                        ) : (
                          <div className="markdown-body space-y-3 prose prose-stone max-w-none text-sm sm:text-[15px] leading-relaxed">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        )}

                        {/* Grounding Source Info */}
                        {msg.sources && !msg.isError && (
                          <div className="mt-3.5 pt-2.5 border-t border-[#e8ddd2]/60 flex items-center gap-2 text-[11px] text-[#756b63]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2e7d32]" />
                            <span>
                              Grounded in {msg.sources.journalCount} journal reflections &bull;{' '}
                              {msg.sources.transactionCount} transactions
                            </span>
                          </div>
                        )}

                        {/* Message Action Bar (Copy, Regenerate, Feedback, Navigation Shortcuts) */}
                        {!msg.isError && (
                          <div className="mt-3.5 pt-2.5 border-t border-[#f5f1eb] flex flex-wrap items-center justify-between gap-2 text-xs text-[#756b63]">
                            {/* Standard Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyText(msg.id, msg.text)}
                                className="inline-flex items-center gap-1 p-1.5 rounded-[8px] hover:bg-[#f5f1eb] hover:text-[#1f1b18] transition-colors cursor-pointer"
                                title="Copy response"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#2e7d32]" />
                                    <span className="text-[11px] text-[#2e7d32] font-semibold">
                                      Copied
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Copy</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleRegenerate(msg.id)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1 p-1.5 rounded-[8px] hover:bg-[#f5f1eb] hover:text-[#1f1b18] transition-colors cursor-pointer disabled:opacity-50"
                                title="Regenerate insight"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Regenerate</span>
                              </button>

                              <button
                                onClick={() => handleFeedback(msg.id, 'helpful')}
                                className={`p-1.5 rounded-[8px] hover:bg-[#f5f1eb] transition-colors cursor-pointer ${
                                  msg.feedback === 'helpful'
                                    ? 'text-[#2e7d32] bg-[#f0fdf4]'
                                    : 'hover:text-[#1f1b18]'
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleFeedback(msg.id, 'unhelpful')}
                                className={`p-1.5 rounded-[8px] hover:bg-[#f5f1eb] transition-colors cursor-pointer ${
                                  msg.feedback === 'unhelpful'
                                    ? 'text-[#c62828] bg-[#fef2f2]'
                                    : 'hover:text-[#1f1b18]'
                                }`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Contextual Navigation Shortcuts */}
                            {onNavigate && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onNavigate('finance')}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] bg-[#f5f1eb] hover:bg-[#ebd9c7] text-[11px] font-semibold text-[#7b4a27] transition-colors cursor-pointer"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>View Finance</span>
                                </button>
                                <button
                                  onClick={() => onNavigate('journal')}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] bg-[#f5f1eb] hover:bg-[#ebd9c7] text-[11px] font-semibold text-[#7b4a27] transition-colors cursor-pointer"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>View Journal</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing / Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3 justify-start animate-in fade-in">
                  <div className="w-8 h-8 rounded-[12px] bg-[#7b4a27] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs mt-1">
                    N
                  </div>
                  <div className="bg-[#fffdfb] border border-[#e8ddd2] rounded-[20px] rounded-tl-[4px] p-4 sm:p-5 shadow-xs flex items-center gap-3 text-xs sm:text-sm text-[#756b63]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#7b4a27]" />
                    <span>NIVORA AI is reviewing your journals and financial records...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Dynamic Suggested Follow-ups Chips */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-[#f5f1eb] bg-[#fffdfb]/80 overflow-x-auto flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-[#756b63] shrink-0">Suggested:</span>
            {activeSuggestedFollowUps.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(prompt)}
                disabled={isLoading}
                className="text-[11px] font-medium bg-white border border-[#dfd3c7] hover:border-[#7b4a27] text-[#1f1b18] px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 shadow-2xs hover:bg-[#f3e8dc]/40"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Sticky Chat Composer / Input Bar */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-[#e8ddd2] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(inputQuery);
            }}
            className="flex items-end gap-2.5"
          >
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                rows={2}
                placeholder="Ask NIVORA AI about your journal, spending, patterns, or habits..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-[16px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all resize-none disabled:opacity-60 leading-relaxed"
              />
            </div>
            <button
              id="ai-send-btn"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-3.5 rounded-[16px] bg-[#7b4a27] hover:bg-[#63391d] text-white transition-all shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#756b63]">
            <span>Press Enter to send &bull; Shift + Enter for new line</span>
            <span className="hidden sm:inline">User-Scoped &bull; Private &amp; Isolated</span>
          </div>
        </div>
      </div>

      {/* Conversations History Drawer / Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#fffdfb] border border-[#e8ddd2] rounded-[24px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e8ddd2] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#7b4a27]" />
                <h3 className="text-lg font-bold text-[#1f1b18]">Conversation History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <button
                onClick={handleStartNewConversation}
                className="w-full p-3.5 rounded-[16px] border-2 border-dashed border-[#7b4a27]/40 hover:border-[#7b4a27] bg-[#f3e8dc]/30 hover:bg-[#f3e8dc]/60 text-[#7b4a27] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer mb-3"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Conversation</span>
              </button>

              {conversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#756b63]">
                  <MessageSquare className="w-8 h-8 mx-auto text-[#dfd3c7] mb-2" />
                  <p>No saved conversations yet.</p>
                  <p className="text-[11px] text-[#756b63]/80 mt-1">
                    Your conversations will appear here automatically.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const firstMsg = conv.messages?.[0]?.text || '';
                  const msgCount = conv.messages?.length || 0;
                  const dateStr = conv.updatedAt
                    ? new Date(conv.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Recently';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-3.5 rounded-[16px] border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isActive
                          ? 'bg-[#f3e8dc] border-[#7b4a27] shadow-2xs'
                          : 'bg-white border-[#e8ddd2] hover:bg-[#f5f1eb]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#1f1b18] truncate">
                            {conv.title || 'Conversation'}
                          </h4>
                          {isActive && (
                            <span className="text-[10px] font-bold text-[#7b4a27] bg-white px-2 py-0.2 rounded-full border border-[#7b4a27]/20">
                              Active
                            </span>
                          )}
                        </div>
                        {firstMsg && (
                          <p className="text-xs text-[#756b63] truncate mt-0.5">
                            {firstMsg}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-[#756b63] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#7b4a27]" />
                            {dateStr}
                          </span>
                          <span>&bull;</span>
                          <span>{msgCount} messages</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="p-2 rounded-[10px] text-[#756b63] hover:text-[#c62828] hover:bg-[#fff5f5] transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e8ddd2] bg-[#f5f1eb] flex items-center justify-between text-xs text-[#756b63]">
              <span>{conversations.length} saved conversations</span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3.5 py-1.5 rounded-[10px] bg-white border border-[#e8ddd2] text-[#1f1b18] font-semibold hover:bg-[#eee7de] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
