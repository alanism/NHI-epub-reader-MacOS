
import React, { useState, useEffect, useRef } from 'react';
import { Book, QuizConfig, QuizQuestion, LedgerEntry } from '../types';
import { aiService } from '../services/aiService';
import { ledgerService } from '../services/ledgerService';
import { X, Play, RefreshCw, Clock, CheckCircle, XCircle, Target, BrainCircuit, Copy, Save, Check } from 'lucide-react';

interface QuizPanelProps {
  book: Book;
  onClose: () => void;
  onOpenSettings: () => void;
}

type QuizState = 'SETTINGS' | 'READY' | 'ACTIVE' | 'RESULTS';

export const QuizPanel: React.FC<QuizPanelProps> = ({ book, onClose, onOpenSettings }) => {
  const [viewState, setViewState] = useState<QuizState>('SETTINGS');
  const [loading, setLoading] = useState(false);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Configuration State
  const [config, setConfig] = useState<QuizConfig>({
    mode: 'whole-book',
    questionCount: 10,
    difficulty: 'Medium',
    timePerQuestion: 60
  });

  // Quiz Runner State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  // Fix: Using any for timerRef to avoid NodeJS namespace issues in browser environment
  const timerRef = useRef<any>(null);

  // Load ledger availability on mount
  useEffect(() => {
    ledgerService.getEntriesByBook(book.id).then(entries => {
      setLedgerCount(entries.length);
      // If no entries, force whole-book
      if (entries.length === 0) {
        setConfig(prev => ({ ...prev, mode: 'whole-book' }));
      }
    });
  }, [book.id]);

  // Timer Logic
  useEffect(() => {
    if (viewState === 'ACTIVE' && config.timePerQuestion > 0) {
      setTimeLeft(config.timePerQuestion);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
             handleTimeout();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [viewState, currentQuestionIndex]);

  const handleTimeout = () => {
    // Auto-advance logic
    const qId = questions[currentQuestionIndex].id;
    // Mark as -1 (unanswered/timeout) if not already answered
    handleAnswer(-1);
  };

  const handleAnswer = (choiceIndex: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const q = questions[currentQuestionIndex];
    setUserAnswers(prev => ({ ...prev, [q.id]: choiceIndex }));

    // Short delay then advance
    setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setViewState('RESULTS');
        }
    }, 300); // 300ms snap transition
  };

  const generateQuiz = async () => {
    setLoading(true);
    setSavedIds(new Set()); // Reset saved state for new quiz
    setCopiedId(null);
    setError(null);
    try {
      // 1. Prepare Text Context
      // Gather text from TOC. Simple aggregation for V1.
      const fullText = book.toc.map(chapter => book.contentMap[chapter.id]).join('\n');
      
      // 2. Prepare Ledger Context
      let ledgerEntries: string[] = [];
      if (config.mode === 'ledger-weighted') {
        const rawEntries = await ledgerService.getEntriesByBook(book.id);
        ledgerEntries = rawEntries.map(e => `[${e.type}] ${e.content}\nAI Analysis: ${e.analysisResult || 'N/A'}`);
      }

      // 3. Call Gemini
      const generatedQuestions = await aiService.generateQuiz(
        book.title,
        book.author,
        fullText,
        ledgerEntries,
        config
      );

      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setViewState('READY');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (q: QuizQuestion) => {
    const userIdx = userAnswers[q.id];
    const isSkipped = userIdx === -1;
    const userAnswer = isSkipped ? '(Time Expired)' : q.choices[userIdx];
    const correctAnswer = q.choices[q.correctIndex];
    const sourceRef = q.sourceReference ? `${book.title} — ${q.sourceReference}` : `${book.title} — Quiz Result`;

    const textToCopy = `Question:
${q.prompt}

Your Answer:
${userAnswer}

Correct Answer:
${correctAnswer}

Explanation:
${q.explanation}

Source:
${sourceRef}`;

    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddToLedger = async (q: QuizQuestion) => {
    if (savedIds.has(q.id)) return;

    const userIdx = userAnswers[q.id];
    const isCorrect = userIdx === q.correctIndex;
    const correctAnswer = q.choices[q.correctIndex];

    const analysisContent = `${q.explanation}

Correct Answer:
${correctAnswer}

[Saved from Quiz Result]`;

    const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        bookId: book.id,
        bookTitle: book.title,
        timestamp: Date.now(),
        type: 'quiz',
        content: q.prompt,
        analysisResult: analysisContent,
        contextType: 'non-fiction', // default assumption for quiz context
        tags: ['quiz-derived', isCorrect ? 'correct' : 'incorrect']
    };

    try {
        await ledgerService.addEntry(entry);
        setSavedIds(prev => new Set(prev).add(q.id));
    } catch (err) {
        console.error("Failed to add quiz entry to ledger", err);
        alert("Failed to save to ledger.");
    }
  };

  // Result Actions State
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Render Functions ---

  const renderSettings = () => (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quiz Source</h3>
            <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-1">
                <button
                    onClick={() => setConfig({ ...config, mode: 'whole-book' })}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${config.mode === 'whole-book' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    Whole Book
                </button>
                <button
                    onClick={() => setConfig({ ...config, mode: 'ledger-weighted' })}
                    disabled={ledgerCount === 0}
                    className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${config.mode === 'ledger-weighted' ? 'bg-white dark:bg-slate-700 shadow text-ucc-active dark:text-ucc-focus' : 'text-slate-500 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                    Ledger-Weighted
                </button>
            </div>
            {ledgerCount === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center">
                    * Ledger-Weighted quizzes unlock after your first saved analysis.
                </p>
            )}
        </div>

        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Questions</h3>
            <div className="flex space-x-2">
                {[5, 10, 20].map(count => (
                    <button
                        key={count}
                        onClick={() => setConfig({ ...config, questionCount: count })}
                        className={`flex-1 py-2 border rounded-md text-sm font-mono transition-colors ${config.questionCount === count ? 'border-ucc-focus bg-ucc-focus/5 text-ucc-active dark:text-ucc-focus' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                        {count}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timer (Per Question)</h3>
            <div className="flex space-x-2">
                {[0, 30, 60, 90].map(seconds => (
                    <button
                        key={seconds}
                        onClick={() => setConfig({ ...config, timePerQuestion: seconds })}
                        className={`flex-1 py-2 border rounded-md text-sm font-mono transition-colors ${config.timePerQuestion === seconds ? 'border-ucc-focus bg-ucc-focus/5 text-ucc-active dark:text-ucc-focus' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                        {seconds === 0 ? 'OFF' : `${seconds}s`}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Difficulty</h3>
             <div className="flex space-x-2">
                {['Easy', 'Medium', 'Hard'].map(diff => (
                    <button
                        key={diff}
                        onClick={() => setConfig({ ...config, difficulty: diff as any })}
                        className={`flex-1 py-2 border rounded-md text-sm transition-colors ${config.difficulty === diff ? 'border-ucc-focus bg-ucc-focus/5 text-ucc-active dark:text-ucc-focus' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}
                    >
                        {diff}
                    </button>
                ))}
            </div>
        </div>

        <button 
            onClick={generateQuiz}
            disabled={loading}
            className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-bold tracking-wide hover:bg-slate-800 dark:hover:bg-slate-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-wait"
        >
            {loading ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
            <span>{loading ? 'GENERATING...' : 'GENERATE QUIZ'}</span>
        </button>

        {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                <p>{error}</p>
                <button
                    onClick={onOpenSettings}
                    className="mt-3 rounded-md bg-white px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                    Open AI Settings
                </button>
            </div>
        )}
    </div>
  );

  const renderReady = () => {
    const wholeBookCount = questions.filter(q => q.sourceType === 'whole-book').length;
    const ledgerCount = questions.filter(q => q.sourceType === 'ledger').length;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{book.title}</h3>
                <p className="font-mono text-ucc-active dark:text-ucc-focus uppercase tracking-widest text-sm">Quiz #{Math.floor(Math.random() * 1000)}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 w-full space-y-4 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Questions</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{questions.length}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Whole Book</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{wholeBookCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Ledger Weighted</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{ledgerCount}</span>
                </div>
                 <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Est. Duration</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">~{Math.ceil((questions.length * 45) / 60)} min</span>
                </div>
            </div>

            <div className="w-full space-y-3">
                <button 
                    onClick={() => setViewState('ACTIVE')}
                    className="w-full py-4 bg-ucc-focus text-white rounded-lg font-bold tracking-wide hover:bg-ucc-active transition-all flex items-center justify-center space-x-2 shadow-lg shadow-ucc-focus/20"
                >
                    <Play fill="currentColor" />
                    <span>START QUIZ</span>
                </button>
                <button 
                    onClick={generateQuiz}
                    className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono text-xs uppercase tracking-widest transition-colors"
                >
                    Regenerate
                </button>
            </div>
        </div>
    );
  };

  const renderActive = () => {
    const question = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex) / questions.length) * 100;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Top Bar */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center space-x-4">
                    <span className="font-mono text-sm font-bold text-slate-500">Q{currentQuestionIndex + 1} / {questions.length}</span>
                </div>
                {config.timePerQuestion > 0 && (
                     <div className={`flex items-center space-x-2 font-mono text-sm font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
                        <Clock size={16} />
                        <span>{timeLeft}s</span>
                    </div>
                )}
            </div>
            
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-ucc-focus transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center max-w-xl mx-auto w-full">
                <span className="inline-block px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-4 self-start">
                    Source: {question.sourceType}
                </span>
                
                <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-8 leading-relaxed">
                    {question.prompt}
                </h2>

                <div className="space-y-3">
                    {question.choices.map((choice, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-ucc-focus hover:bg-ucc-focus/5 dark:hover:bg-ucc-focus/10 transition-all text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm group flex items-start"
                        >
                            <span className="font-mono text-slate-400 mr-4 group-hover:text-ucc-focus">{['A', 'B', 'C', 'D'][idx]}</span>
                            <span>{choice}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderResults = () => {
    const score = questions.reduce((acc, q) => {
        return acc + (userAnswers[q.id] === q.correctIndex ? 1 : 0);
    }, 0);

    const percentage = Math.round((score / questions.length) * 100);

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{percentage}%</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">You answered {score} out of {questions.length} correctly.</p>
                <div className="flex justify-center space-x-4 pt-4">
                    <button 
                        onClick={() => setViewState('SETTINGS')}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-bold uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        New Quiz
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-950">
                {questions.map((q, idx) => {
                    const userIdx = userAnswers[q.id];
                    const isCorrect = userIdx === q.correctIndex;
                    const isSkipped = userIdx === -1;
                    const isSaved = savedIds.has(q.id);
                    const isCopied = copiedId === q.id;

                    return (
                        <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10' : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-900/10'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <span className="font-mono text-xs text-slate-500">Question {idx + 1}</span>
                                {isCorrect ? <CheckCircle size={16} className="text-green-600 dark:text-green-400" /> : <XCircle size={16} className="text-red-500 dark:text-red-400" />}
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">{q.prompt}</p>
                            
                            <div className="space-y-1 mb-4">
                                <div className={`text-xs flex items-center space-x-2 ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                                    <span className="font-bold uppercase w-16">You:</span>
                                    <span>{isSkipped ? '(Time Expired)' : q.choices[userIdx]}</span>
                                </div>
                                {!isCorrect && (
                                    <div className="text-xs flex items-center space-x-2 text-green-700 dark:text-green-300">
                                        <span className="font-bold uppercase w-16">Correct:</span>
                                        <span>{q.choices[q.correctIndex]}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic mb-4">
                                    <span className="font-bold not-italic mr-1">Explanation:</span>
                                    {q.explanation}
                                </p>
                                
                                <div className="flex items-center justify-end space-x-3">
                                    <button 
                                        onClick={() => handleCopy(q)}
                                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                            isCopied 
                                            ? 'text-ucc-active dark:text-ucc-focus bg-ucc-focus/10' 
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleAddToLedger(q)}
                                        disabled={isSaved}
                                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                            isSaved
                                            ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {isSaved ? <Check size={12} /> : <Save size={12} />}
                                        <span>{isSaved ? 'Added' : 'Add to Ledger'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Target size={18} className="text-ucc-focus" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {viewState === 'SETTINGS' && 'Quiz Setup'}
                {viewState === 'READY' && 'Quiz Ready'}
                {viewState === 'ACTIVE' && 'Quiz Active'}
                {viewState === 'RESULTS' && 'Quiz Results'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 relative">
            {viewState === 'SETTINGS' && renderSettings()}
            {viewState === 'READY' && renderReady()}
            {viewState === 'ACTIVE' && renderActive()}
            {viewState === 'RESULTS' && renderResults()}
        </div>
      </div>
    </div>
  );
};
