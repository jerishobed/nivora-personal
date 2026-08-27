import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { shareContent, getCurrentIdToken } from '../lib/firebase';
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit3,
  BookOpen,
  X,
  Check,
  Tag,
  Smile,
  ArrowUpDown,
  Sparkle,
  Sparkles,
  Share2,
  Loader2,
  Wand2
} from 'lucide-react';

interface JournalViewProps {
  entries: JournalEntry[];
  onBack: () => void;
  onSaveEntry: (entry: Omit<JournalEntry, 'id'> & { id?: string }) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onSeedData: () => void;
  seedingLoading?: boolean;
}

const MOOD_OPTIONS: { id: JournalEntry['mood']; label: string; emoji: string }[] = [
  { id: 'calm', label: 'Calm', emoji: '🌿' },
  { id: 'inspired', label: 'Inspired', emoji: '✨' },
  { id: 'reflective', label: 'Reflective', emoji: '☕' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
  { id: 'grateful', label: 'Grateful', emoji: '🙏' },
  { id: 'stressed', label: 'Stressed', emoji: '🌧️' }
];

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onBack,
  onSaveEntry,
  onDeleteEntry,
  onSeedData,
  seedingLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [sharedEntryId, setSharedEntryId] = useState<string | null>(null);

  // Modal / Form state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [readingEntry, setReadingEntry] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMood, setFormMood] = useState<JournalEntry['mood']>('reflective');
  const [formTags, setFormTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Prompt-to-Journal State
  const [quickAiPrompt, setQuickAiPrompt] = useState('');
  const [modalAiPrompt, setModalAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleGenerateAiJournal = async (promptText: string, openEditor = true) => {
    if (!promptText.trim()) return;
    try {
      setIsAiGenerating(true);
      setErrorMsg(null);
      const idToken = await getCurrentIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/ai/generate-journal', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: promptText.trim() })
      });

      if (!res.ok) {
        throw new Error('AI generation request failed.');
      }

      const data = await res.json();

      setEditingEntry(null);
      setFormTitle(data.title || 'Personal Reflection');
      setFormContent(data.content || promptText.trim());
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormMood(data.mood || 'reflective');
      setFormTags(Array.isArray(data.tags) ? data.tags.join(', ') : 'Reflection');
      setQuickAiPrompt('');
      setModalAiPrompt('');

      if (openEditor) {
        setIsEditorOpen(true);
      }
    } catch (err: any) {
      console.error('AI Journal generation error:', err);
      setErrorMsg('Failed to generate reflection with AI. Please try again.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setFormTitle('');
    setFormContent('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMood('reflective');
    setFormTags('');
    setModalAiPrompt('');
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const openEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormDate(entry.date);
    setFormMood(entry.mood || 'reflective');
    setFormTags((entry.tags || []).join(', '));
    setErrorMsg(null);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      setErrorMsg('Please write your journal entry thoughts before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onSaveEntry({
        id: editingEntry ? editingEntry.id : undefined,
        title: formTitle.trim() || 'Untitled Reflection',
        content: formContent.trim(),
        date: formDate || new Date().toISOString().split('T')[0],
        mood: formMood,
        tags: parsedTags,
        createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setIsEditorOpen(false);
    } catch (err: any) {
      console.error('Error saving journal entry:', err);
      setErrorMsg('Unable to save your data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteEntry(id);
      setDeletingId(null);
      if (readingEntry?.id === id) {
        setReadingEntry(null);
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  // Filter and Sort Entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const matchesQuery =
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (entry.tags && entry.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

        const matchesMood = selectedMood === 'all' || entry.mood === selectedMood;

        return matchesQuery && matchesMood;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [entries, searchQuery, sortOrder, selectedMood]);

  const wordCount = formContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div id="nivora-journal-view" className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            id="journal-back-btn"
            onClick={onBack}
            className="p-2 rounded-[14px] bg-white/90 border border-[#e8ddd2] text-[#756b63] hover:text-[#1f1b18] hover:bg-[#eee7de] transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1f1b18]">Journal</h2>
            <p className="text-xs sm:text-sm text-[#756b63]">
              Capture thoughts, memories, reflections, and important moments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="journal-new-entry-btn"
            onClick={openNewEntry}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>
        </div>
      </div>

      {/* Quick AI Journal Bar - Instant Prompt to Reflection */}
      <div className="bg-gradient-to-br from-[#f3e8dc]/90 via-[#fffdfb] to-[#ebd9c7]/70 border border-[#dfd3c7] rounded-[22px] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[8px] bg-[#7b4a27] text-white flex items-center justify-center shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-[#1f1b18]">
              AI Prompt-to-Journal
            </h4>
            <span className="text-[10px] font-semibold bg-[#7b4a27] text-white px-2 py-0.2 rounded-full">
              Instant
            </span>
          </div>
          <span className="text-[11px] text-[#756b63] hidden sm:inline">
            Zero-friction reflection powered by Gemini
          </span>
        </div>
        <p className="text-xs text-[#756b63] mb-3 leading-relaxed">
          Type a quick thought, highlight, or mood. NIVORA AI will craft a structured reflection, title, mood &amp; tags.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateAiJournal(quickAiPrompt);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            id="journal-ai-quick-input"
            type="text"
            value={quickAiPrompt}
            onChange={(e) => setQuickAiPrompt(e.target.value)}
            placeholder="e.g. Morning run, fixed deployment issues, feeling energized &amp; productive..."
            disabled={isAiGenerating}
            className="flex-1 px-4 py-2.5 rounded-[14px] bg-white border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm placeholder-[#756b63]/60 focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 shadow-2xs"
          />
          <button
            id="journal-ai-quick-btn"
            type="submit"
            disabled={isAiGenerating || !quickAiPrompt.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isAiGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting Reflection...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create with AI</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Controls Bar: Search, Mood Filter, Sort */}
      <div className="bg-white/90 border border-[#e8ddd2] rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#756b63] absolute left-3.5 top-3" />
          <input
            id="journal-search-input"
            type="text"
            placeholder="Search entries or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            id="journal-mood-filter"
            value={selectedMood}
            onChange={(e) => setSelectedMood(e.target.value)}
            className="text-xs sm:text-sm py-2 px-3 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] focus:outline-hidden focus:border-[#7b4a27] cursor-pointer"
          >
            <option value="all">All Moods</option>
            {MOOD_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>

          <button
            id="journal-sort-toggle"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#756b63] hover:text-[#1f1b18] transition-colors cursor-pointer shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Entries List or Empty State */}
      {filteredEntries.length === 0 ? (
        <div
          id="journal-empty-state"
          className="bg-white/90 border border-[#e8ddd2] rounded-[24px] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs"
        >
          <div className="w-14 h-14 rounded-[18px] bg-[#f3e8dc] text-[#7b4a27] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[#1f1b18]">
            {searchQuery ? 'No matching reflections found' : 'Your journal is ready for your thoughts'}
          </h3>
          <p className="text-xs sm:text-sm text-[#756b63] max-w-sm mx-auto mt-2 mb-6">
            {searchQuery
              ? 'Try changing your search keywords or mood filter.'
              : 'Write private reflections, daily thoughts, or important milestones.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openNewEntry}
              className="w-full sm:w-auto px-5 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
            >
              Write First Reflection
            </button>
            {entries.length === 0 && (
              <button
                onClick={onSeedData}
                disabled={seedingLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-[14px] bg-[#f3e8dc] hover:bg-[#ebd9c7] text-[#7b4a27] text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                {seedingLoading ? 'Loading Sample...' : 'Load Sample Reflections'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map((entry) => {
            const moodObj = MOOD_OPTIONS.find((m) => m.id === entry.mood);
            return (
              <div
                key={entry.id}
                id={`journal-card-${entry.id}`}
                className="bg-white/90 border border-[#e8ddd2] rounded-[22px] p-5 sm:p-6 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => setReadingEntry(entry)}
              >
                <div>
                  {/* Card Header: Date & Mood */}
                  <div className="flex items-center justify-between text-xs text-[#756b63] mb-2.5">
                    <div className="flex items-center gap-1.5 font-medium text-[#7b4a27]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{entry.date}</span>
                    </div>
                    {moodObj && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f3e8dc] text-[#7b4a27] px-2.5 py-0.5 rounded-full">
                        <span>{moodObj.emoji}</span>
                        <span>{moodObj.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="text-base sm:text-lg font-bold text-[#1f1b18] mb-2 line-clamp-1 group-hover:text-[#7b4a27] transition-colors">
                    {entry.title || 'Untitled Reflection'}
                  </h4>

                  {/* Snippet */}
                  <p className="text-xs sm:text-sm text-[#756b63] line-clamp-4 leading-relaxed font-light">
                    {entry.content}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#f5f1eb] flex items-center justify-between">
                  {/* Tags / Word count */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {entry.tags && entry.tags.length > 0 ? (
                      <span className="text-[11px] bg-[#f5f1eb] border border-[#e8ddd2] text-[#756b63] px-2 py-0.5 rounded-[8px] truncate max-w-[120px]">
                        #{entry.tags[0]}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#756b63]/70">
                        {entry.wordCount || (entry.content.split(/\s+/).filter(Boolean).length)} words
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={async () => {
                        const text = `📖 Reflection: "${entry.title || 'Untitled'}" (${entry.date})\n\n${entry.content}\n\nShared via NIVORA`;
                        const res = await shareContent({ title: entry.title || 'Journal Reflection', text });
                        if (res.success) {
                          setSharedEntryId(entry.id);
                          setTimeout(() => setSharedEntryId(null), 2000);
                        }
                      }}
                      className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#7b4a27] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
                      title="Share reflection"
                    >
                      {sharedEntryId === entry.id ? (
                        <Check className="w-3.5 h-3.5 text-[#2e7d32]" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditEntry(entry)}
                      className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#7b4a27] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
                      title="Edit reflection"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(entry.id)}
                      className="p-1.5 rounded-[10px] text-[#756b63] hover:text-[#c62828] hover:bg-[#fff5f5] transition-colors cursor-pointer"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (Create / Edit) */}
      {isEditorOpen && (
        <div
          id="journal-editor-modal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-2xl p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-xl sm:text-2xl font-bold text-[#1f1b18]">
                {editingEntry ? 'Edit Reflection' : 'New Journal Reflection'}
              </h3>
              <p className="text-xs sm:text-sm text-[#756b63] mt-0.5">
                Capture thoughts with private, user-isolated Firestore encryption.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-[14px] bg-[#fff5f5] border border-[#fecaca] text-[#991b1b] text-xs">
                {errorMsg}
              </div>
            )}

            {/* AI Generator Helper inside modal */}
            {!editingEntry && (
              <div className="mb-4 p-3.5 rounded-[16px] bg-gradient-to-r from-[#f3e8dc]/70 to-[#fffdfb] border border-[#e8ddd2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7b4a27] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Assist: Draft Reflection from Prompt
                  </span>
                  <span className="text-[10px] text-[#756b63] hidden sm:inline">Auto-fills Title, Content, Mood &amp; Tags</span>
                </div>
                <div className="flex gap-2">
                  <input
                    id="journal-modal-ai-input"
                    type="text"
                    value={modalAiPrompt}
                    onChange={(e) => setModalAiPrompt(e.target.value)}
                    placeholder="e.g. Great client pitch, relaxed evening walking the dog..."
                    disabled={isAiGenerating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateAiJournal(modalAiPrompt, false);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 rounded-[12px] bg-white border border-[#dfd3c7] text-[#1f1b18] text-xs placeholder-[#756b63]/60 focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 shadow-2xs"
                  />
                  <button
                    id="journal-modal-ai-btn"
                    type="button"
                    onClick={() => handleGenerateAiJournal(modalAiPrompt, false)}
                    disabled={isAiGenerating || !modalAiPrompt.trim()}
                    className="px-3.5 py-2 rounded-[12px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 inline-flex items-center gap-1.5"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Drafting...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Draft</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#756b63] mb-1">
                    State of Mind / Mood
                  </label>
                  <select
                    value={formMood}
                    onChange={(e) => setFormMood(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                  >
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.emoji} {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Give your reflection a meaningful title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[#756b63]">
                    Your Thoughts &amp; Reflections
                  </label>
                  <span className="text-[11px] text-[#756b63]">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                  </span>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="What is on your mind today? Write freely about your projects, life, insights, or goals..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full min-h-[180px] p-4 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-sm sm:text-base leading-relaxed focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20 transition-all resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#756b63] mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus, Career, Wellness, Strategy"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] placeholder-[#756b63]/60 text-xs sm:text-sm focus:outline-hidden focus:border-[#7b4a27] focus:ring-2 focus:ring-[#7b4a27]/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-[14px] border border-[#dfd3c7] text-xs sm:text-sm font-medium text-[#756b63] hover:text-[#1f1b18] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="journal-save-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingEntry ? 'Update Reflection' : 'Save Reflection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reader View Modal */}
      {readingEntry && (
        <div
          id="journal-reader-modal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setReadingEntry(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e8ddd2] rounded-[24px] w-full max-w-2xl p-6 sm:p-9 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col justify-between"
          >
            <button
              onClick={() => setReadingEntry(null)}
              className="absolute top-5 right-5 text-[#756b63] hover:text-[#1f1b18] p-1.5 rounded-full hover:bg-[#f5f1eb] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto pr-1">
              <div className="flex items-center gap-2.5 text-xs text-[#7b4a27] font-semibold mb-3">
                <Calendar className="w-4 h-4" />
                <span>{readingEntry.date}</span>
                {readingEntry.mood && (
                  <span className="capitalize bg-[#f3e8dc] px-2.5 py-0.5 rounded-full text-[11px]">
                    {MOOD_OPTIONS.find((m) => m.id === readingEntry.mood)?.emoji}{' '}
                    {readingEntry.mood}
                  </span>
                )}
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-[#1f1b18] mb-4">
                {readingEntry.title || 'Untitled Reflection'}
              </h3>

              <div className="prose prose-stone max-w-none text-[#1f1b18] text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-serif">
                {readingEntry.content}
              </div>

              {readingEntry.tags && readingEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-[#f5f1eb]">
                  {readingEntry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#f5f1eb] text-[#756b63] px-2.5 py-1 rounded-[10px] border border-[#e8ddd2]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-5 mt-6 border-t border-[#e8ddd2] flex items-center justify-between">
              <div className="text-xs text-[#756b63]">
                {readingEntry.wordCount || readingEntry.content.split(/\s+/).filter(Boolean).length} words
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const text = `📖 Reflection: "${readingEntry.title || 'Untitled'}" (${readingEntry.date})\n\n${readingEntry.content}\n\nShared via NIVORA`;
                    const res = await shareContent({ title: readingEntry.title || 'Journal Reflection', text });
                    if (res.success) {
                      setSharedEntryId(readingEntry.id);
                      setTimeout(() => setSharedEntryId(null), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] bg-white border border-[#dfd3c7] hover:bg-[#eee7de] text-xs font-semibold text-[#756b63] hover:text-[#1f1b18] transition-colors cursor-pointer"
                >
                  {sharedEntryId === readingEntry.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#2e7d32]" />
                      <span className="text-[#2e7d32]">Shared!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#7b4a27]" />
                      <span>Share</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const e = readingEntry;
                    setReadingEntry(null);
                    openEditEntry(e);
                  }}
                  className="px-4 py-2 rounded-[14px] bg-[#f5f1eb] hover:bg-[#eee7de] text-xs font-semibold text-[#1f1b18] border border-[#e8ddd2] transition-colors cursor-pointer"
                >
                  Edit Reflection
                </button>
                <button
                  onClick={() => setReadingEntry(null)}
                  className="px-4 py-2 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
            <h4 className="text-lg font-bold text-[#1f1b18]">Delete Reflection?</h4>
            <p className="text-xs sm:text-sm text-[#756b63] mt-1 mb-5">
              This will permanently delete this reflection from your private Firestore database.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-[14px] border border-[#dfd3c7] text-xs font-semibold text-[#756b63] hover:text-[#1f1b18] cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-journal-btn"
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
