import React, { useState, useEffect } from 'react';
import { Library } from './components/Library';
import { Reader } from './components/Reader';
import { AnalysisTool } from './components/AnalysisTool';
import { LedgerView } from './components/LedgerView';
import { TableOfContents } from './components/TableOfContents';
import { SearchPanel } from './components/SearchPanel';
import { SettingsModal } from './components/SettingsModal';
import { QuizPanel } from './components/QuizPanel';
import { LessonPlannerPanel } from './components/LessonPlannerPanel';
import { AppView, Book, ExplanationDepth } from './types';
import { Sidebar, BookOpen, Layers, Settings, Grid, Sun, Moon, List, Search as SearchIcon, ClipboardList } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<AppView>(AppView.LIBRARY);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showLedger, setShowLedger] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showLessonPlanner, setShowLessonPlanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [leftPanel, setLeftPanel] = useState<'toc' | 'search' | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [explanationDepth, setExplanationDepth] = useState<ExplanationDepth>(ExplanationDepth.EIGHTH_GRADER);

  useEffect(() => {
      // Check local storage or prefer-color-scheme
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          setTheme('dark');
          document.documentElement.classList.add('dark');
      } else {
          setTheme('light');
          document.documentElement.classList.remove('dark');
      }

      // Load depth preference
      const storedDepth = localStorage.getItem('explanationDepth');
      if (storedDepth && Object.values(ExplanationDepth).includes(storedDepth as ExplanationDepth)) {
          setExplanationDepth(storedDepth as ExplanationDepth);
      }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const updateDepth = (depth: ExplanationDepth) => {
      setExplanationDepth(depth);
      localStorage.setItem('explanationDepth', depth);
  };

  const handleLoadBook = (book: Book) => {
    setCurrentBook(book);
    // Default to first chapter
    if (book.toc.length > 0) {
      setCurrentChapterId(book.toc[0].id);
    }
    setView(AppView.READER);
  };

  const handleNavigate = (chapterId: string) => {
    setCurrentChapterId(chapterId);
  };

  if (view === AppView.LIBRARY) {
    return (
        <div className="h-full relative">
             <div className="absolute top-4 right-4 z-50">
                 <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                 >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                 </button>
             </div>
             <Library onLoadBook={handleLoadBook} />
        </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-6 space-y-4 z-30 transition-colors">
        <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 rounded-md flex items-center justify-center text-white mb-4 shadow-sm">
          <BookOpen size={18} />
        </div>
        
        {/* Navigation Tools */}
        <div className="flex flex-col space-y-2 w-full px-2">
            <button 
                onClick={() => setLeftPanel(leftPanel === 'toc' ? null : 'toc')}
                className={`p-2.5 rounded-md transition-colors w-full flex justify-center ${leftPanel === 'toc' ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Table of Contents"
            >
                <List size={20} />
            </button>
            <button 
                onClick={() => setLeftPanel(leftPanel === 'search' ? null : 'search')}
                className={`p-2.5 rounded-md transition-colors w-full flex justify-center ${leftPanel === 'search' ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Find in Book"
            >
                <SearchIcon size={20} />
            </button>
        </div>
        
        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-2" />

        {/* Analysis Tools */}
        <div className="flex flex-col space-y-2 w-full px-2">
            <button 
            onClick={() => setShowAnalysis(!showAnalysis)} 
            className={`p-2.5 rounded-md transition-colors w-full flex justify-center ${showAnalysis ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            title="Toggle Analysis Tool"
            >
            <Sidebar size={20} />
            </button>

            <button 
            onClick={() => setShowLedger(true)}
            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full flex justify-center"
            title="Open Ledger"
            >
            <Layers size={20} />
            </button>

            <button 
                onClick={() => setShowQuiz(true)}
                className={`p-2.5 rounded-md transition-colors w-full flex justify-center ${showQuiz ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Quiz Mode"
            >
                <Grid size={20} />
            </button>

            <button 
                onClick={() => setShowLessonPlanner(true)}
                className={`p-2.5 rounded-md transition-colors w-full flex justify-center ${showLessonPlanner ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="Lesson Planner"
            >
                <ClipboardList size={20} />
            </button>
        </div>
        
        <div className="flex-1" />
        
        {/* Settings */}
        <div className="flex flex-col space-y-4 items-center border-t border-slate-100 dark:border-slate-800 pt-6 w-full">
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md transition-colors"
                title="Settings"
            >
                <Settings size={20} />
            </button>
            <button 
                onClick={toggleTheme}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                title="Toggle Theme"
            >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button 
                onClick={() => setFontSize(s => Math.min(s + 2, 24))}
                className="text-xs font-mono font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
                A+
            </button>
            <button 
                onClick={() => setFontSize(s => Math.max(s - 2, 14))}
                className="text-xs font-mono font-bold text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
                A-
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side Panels (TOC / Search) */}
        {currentBook && leftPanel === 'toc' && (
            <TableOfContents 
                book={currentBook} 
                currentChapterId={currentChapterId || ''} 
                onNavigate={(id) => { handleNavigate(id); }}
                onClose={() => setLeftPanel(null)}
            />
        )}
        
        {currentBook && leftPanel === 'search' && (
            <SearchPanel 
                book={currentBook} 
                onNavigate={(id) => { handleNavigate(id); }}
                onClose={() => setLeftPanel(null)}
            />
        )}

        {/* Reader Layer */}
        <div className="flex-1 relative z-10 flex flex-col">
          {currentBook && currentChapterId && (
            <Reader 
              book={currentBook} 
              currentChapterId={currentChapterId} 
              onNavigate={handleNavigate}
              fontSize={fontSize}
            />
          )}
        </div>

        {/* Analysis Panel (Collapsible) */}
        {showAnalysis && currentBook && (
          <AnalysisTool 
            bookId={currentBook.id} 
            bookTitle={currentBook.title} 
            bookAuthor={currentBook.author} 
            explanationDepth={explanationDepth}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* Ledger Overlay */}
        {showLedger && currentBook && (
          <LedgerView book={currentBook} onClose={() => setShowLedger(false)} />
        )}

        {/* Quiz Overlay */}
        {showQuiz && currentBook && (
            <QuizPanel
              book={currentBook}
              onClose={() => setShowQuiz(false)}
              onOpenSettings={() => setShowSettings(true)}
            />
        )}

        {/* Lesson Planner Overlay */}
        {showLessonPlanner && currentBook && (
            <LessonPlannerPanel
              book={currentBook}
              onClose={() => setShowLessonPlanner(false)}
              onOpenSettings={() => setShowSettings(true)}
            />
        )}

        {/* Settings Modal */}
        <SettingsModal 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            currentDepth={explanationDepth}
            onDepthChange={updateDepth}
        />
      </div>
    </div>
  );
}
