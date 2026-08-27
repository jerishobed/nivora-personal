import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Loader2, X, Check, ArrowRight, BookOpen, Wallet, AlertCircle } from 'lucide-react';
import { JournalEntry, Transaction } from '../types';
import { getCurrentIdToken } from '../lib/firebase';

interface VoiceMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSaveJournal: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  onSaveTransaction: (trans: Omit<Transaction, 'id'>) => Promise<void>;
}

export const VoiceMemoModal: React.FC<VoiceMemoModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSaveJournal,
  onSaveTransaction
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Parsed results from Gemini
  const [parsedResult, setParsedResult] = useState<{
    hasJournal: boolean;
    journal: {
      title: string;
      content: string;
      mood: JournalEntry['mood'];
      tags: string[];
    } | null;
    hasTransaction: boolean;
    transaction: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      description: string;
    } | null;
    summary: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setTranscript('');
      setParsedResult(null);
      setErrorMsg(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const startListening = () => {
    setErrorMsg(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Web Speech API is not supported in this browser. You can type your memo below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setErrorMsg(`Voice input: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition initialization error:', err);
      setErrorMsg('Could not access microphone.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  const handleProcessVoice = async () => {
    if (!transcript.trim()) {
      setErrorMsg('Please speak or type a note first.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      stopListening();

      const idToken = await getCurrentIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('/api/ai/voice-process', {
        method: 'POST',
        headers,
        body: JSON.stringify({ transcript: transcript.trim(), currency })
      });

      if (!res.ok) {
        throw new Error('AI processing failed.');
      }

      const data = await res.json();
      setParsedResult(data);
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setErrorMsg('Unable to parse voice note. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedResult) return;
    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const dateStr = now.split('T')[0];

      if (parsedResult.hasJournal && parsedResult.journal) {
        await onSaveJournal({
          title: parsedResult.journal.title || 'Voice Reflection',
          content: parsedResult.journal.content || transcript,
          date: dateStr,
          createdAt: now,
          updatedAt: now,
          mood: parsedResult.journal.mood || 'reflective',
          tags: parsedResult.journal.tags || ['VoiceMemo']
        });
      }

      if (parsedResult.hasTransaction && parsedResult.transaction) {
        await onSaveTransaction({
          amount: Number(parsedResult.transaction.amount) || 0,
          type: parsedResult.transaction.type || 'expense',
          category: parsedResult.transaction.category || 'Other',
          description: parsedResult.transaction.description || 'Voice logged transaction',
          date: dateStr,
          createdAt: now
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg('Error saving entries.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="voice-memo-modal"
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
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1f1b18]">
              Voice-to-Memo
            </h3>
            <p className="text-xs text-[#756b63]">
              Speak naturally. Gemini will detect reflections and expenses.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-[12px] bg-[#fff5f5] border border-[#fecaca] text-[#991b1b] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#e8f5e9] text-[#2e7d32] flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-[#1f1b18]">Recorded Successfully!</h4>
            <p className="text-xs text-[#756b63]">Saved to your private journal &amp; finance records.</p>
          </div>
        ) : !parsedResult ? (
          /* Recording / Transcription Interface */
          <div className="space-y-4">
            {/* Audio Animation / Mic Area */}
            <div className="bg-[#f5f1eb] border border-[#e8ddd2] rounded-[20px] p-6 text-center flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isListening
                    ? 'bg-[#c62828] text-white scale-110 animate-pulse ring-8 ring-[#c62828]/20'
                    : 'bg-[#7b4a27] hover:bg-[#63391d] text-white'
                }`}
                title={isListening ? 'Stop Recording' : 'Start Recording'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <p className="text-xs font-semibold text-[#1f1b18] mt-4">
                {isListening ? 'Listening... Speak your mind or expenses' : 'Tap microphone to start speaking'}
              </p>
              <p className="text-[11px] text-[#756b63] mt-0.5">
                e.g. &ldquo;Had lunch at cafe for $15, feeling refreshed and ready for work.&rdquo;
              </p>
            </div>

            {/* Live Transcript / Manual Input */}
            <div>
              <label className="block text-xs font-medium text-[#756b63] mb-1">
                Transcript / Spoken Notes
              </label>
              <textarea
                rows={3}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Spoken words will appear here, or you can type directly..."
                className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#fffdfb] border border-[#dfd3c7] text-[#1f1b18] text-xs sm:text-sm placeholder-[#756b63]/60 focus:outline-hidden focus:border-[#7b4a27]"
              />
            </div>

            <button
              type="button"
              onClick={handleProcessVoice}
              disabled={isProcessing || !transcript.trim()}
              className="w-full py-3 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Voice with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process with NIVORA AI</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Parsed Results Review */
          <div className="space-y-4">
            <div className="p-3.5 rounded-[14px] bg-[#f3e8dc]/60 border border-[#e8ddd2]">
              <p className="text-xs font-semibold text-[#7b4a27] mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Recognition Result
              </p>
              <p className="text-xs text-[#1f1b18]">{parsedResult.summary || 'Extracted details from your voice memo.'}</p>
            </div>

            {/* Extracted Journal */}
            {parsedResult.hasJournal && parsedResult.journal && (
              <div className="p-3.5 rounded-[16px] bg-white border border-[#dfd3c7] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#7b4a27] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Journal Reflection
                  </span>
                  <span className="text-[10px] bg-[#f3e8dc] text-[#7b4a27] px-2 py-0.2 rounded-full font-semibold">
                    Mood: {parsedResult.journal.mood}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-[#1f1b18]">{parsedResult.journal.title}</h5>
                <p className="text-xs text-[#756b63] leading-relaxed">{parsedResult.journal.content}</p>
              </div>
            )}

            {/* Extracted Transaction */}
            {parsedResult.hasTransaction && parsedResult.transaction && (
              <div className="p-3.5 rounded-[16px] bg-white border border-[#dfd3c7] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#7b4a27] flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    Financial Record
                  </span>
                  <span className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                    parsedResult.transaction.type === 'income' ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fff5f5] text-[#c62828]'
                  }`}>
                    {parsedResult.transaction.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#1f1b18] font-medium">{parsedResult.transaction.description}</span>
                  <span className="text-sm font-bold text-[#1f1b18]">
                    {currency} {parsedResult.transaction.amount}
                  </span>
                </div>
                <span className="inline-block text-[10px] text-[#756b63] bg-[#f5f1eb] px-2 py-0.5 rounded-full">
                  Category: {parsedResult.transaction.category}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setParsedResult(null)}
                className="flex-1 py-2.5 rounded-[14px] bg-[#f5f1eb] hover:bg-[#eee7de] text-[#756b63] text-xs font-semibold transition-colors cursor-pointer"
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-[14px] bg-[#7b4a27] hover:bg-[#63391d] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save All Entries</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
