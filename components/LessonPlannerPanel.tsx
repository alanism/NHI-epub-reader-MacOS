import React, { useState, useEffect } from 'react';
import { Book, LedgerEntry } from '../types';
import { aiService } from '../services/aiService';
import { ledgerService } from '../services/ledgerService';
import { X, ClipboardList, RefreshCw, Copy, Download, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonPlannerPanelProps {
  book: Book;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const LessonPlannerPanel: React.FC<LessonPlannerPanelProps> = ({ book, onClose, onOpenSettings }) => {
  const [studentAge, setStudentAge] = useState<number>(10);
  const [focus, setFocus] = useState<string>('Conceptual');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [generatedLesson, setGeneratedLesson] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    ledgerService.getEntriesByBook(book.id).then(setLedgerEntries);
  }, [book.id]);

  const handleGenerate = async () => {
    if (ledgerEntries.length === 0) return;
    if (studentAge < 4 || studentAge > 21) {
        setStatusMsg("Age must be between 4 and 21.");
        return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const ledgerContext = ledgerEntries
        .map(e => `[${e.type.toUpperCase()}] Source: ${e.content}\nAnalysis: ${e.analysisResult}`)
        .join('\n\n---\n\n');

      const result = await aiService.generateLessonPlan(
        book.title,
        book.author,
        studentAge,
        focus,
        ledgerContext
      );
      setGeneratedLesson(result);
    } catch (err) {
      console.error(err);
      setStatusMsg(err instanceof Error ? err.message : "Failed to generate lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLesson) return;
    await navigator.clipboard.writeText(generatedLesson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!generatedLesson) return;

    const sanitize = (str: string) => str.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 60);

    let authorRaw = book.author || 'UnknownAuthor';
    let authorLastName = authorRaw;
    if (authorRaw.includes(',')) {
        authorLastName = authorRaw.split(',')[0].trim();
    } else {
        const parts = authorRaw.trim().split(/\s+/);
        if (parts.length > 0) authorLastName = parts[parts.length - 1];
    }

    const authorSlug = sanitize(authorLastName) || 'UnknownAuthor';
    const titleSlug = sanitize(book.title || 'Untitled') || 'Untitled';
    const dateStr = new Date().toISOString().split('T')[0];

    const filename = `${authorSlug}-${titleSlug}-Lesson-${studentAge}-${dateStr}.txt`;
    
    // Convert markdown-ish to plain text roughly for the TXT export as per prompt "Plain text only"
    const plainText = generatedLesson.replace(/[#*`]/g, '');

    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <ClipboardList size={18} className="text-ucc-focus" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Lesson Planner
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-slate-900">
          {/* Landing Copy */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-slate-800 pb-6">
            Turn your research ledger into a structured, time-bound lesson for teaching history, civics, politics, and economics with depth.
          </p>

          {ledgerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
               <AlertCircle size={48} className="text-slate-300" />
               <p className="text-slate-500 dark:text-slate-400 max-w-xs italic">
                  No research entries found. Save at least one analysis before generating a lesson.
               </p>
            </div>
          ) : (
            <>
              {/* Settings Section */}
              <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Age</label>
                        <input 
                            type="number"
                            min={4}
                            max={21}
                            step={1}
                            value={studentAge}
                            onChange={(e) => setStudentAge(parseInt(e.target.value) || 4)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ucc-focus outline-none"
                        />
                        <p className="text-[10px] text-slate-400 italic">Target Duration: {studentAge + 1} minutes</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lesson Focus</label>
                        <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-1">
                            {['Conceptual', 'Application', 'Discussion-heavy'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFocus(f)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${focus === f ? 'bg-white dark:bg-slate-700 shadow text-ucc-active dark:text-ucc-focus' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    {f.split('-')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <RefreshCw className="animate-spin" /> : <ClipboardList size={18} />}
                    <span>{loading ? 'SYNTHESIZING...' : 'GENERATE LESSON'}</span>
                </button>

                {statusMsg && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-xs font-medium text-red-500 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                        <p>{statusMsg}</p>
                        <button
                            onClick={onOpenSettings}
                            className="mt-3 rounded-md bg-white px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            Open AI Settings
                        </button>
                    </div>
                )}
              </div>

              {/* Generated Result Section */}
              {generatedLesson && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated Lesson Plan</h3>
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={handleCopy}
                                className={`flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${copied ? 'text-ucc-active' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {copied ? <Check size={12} /> : <Copy size={12} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button 
                                onClick={handleExport}
                                className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                                <Download size={12} />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>

                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                        <ReactMarkdown>{generatedLesson}</ReactMarkdown>
                    </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
