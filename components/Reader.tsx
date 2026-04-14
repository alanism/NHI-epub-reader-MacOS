import React, { useRef, useEffect } from 'react';
import { Book } from '../types';

interface ReaderProps {
  book: Book;
  currentChapterId: string;
  onNavigate: (chapterId: string) => void;
  fontSize: number;
}

export const Reader: React.FC<ReaderProps> = ({ book, currentChapterId, onNavigate, fontSize }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const content = book.contentMap[currentChapterId];
  
  // Find current chapter index
  const currentIndex = book.toc.findIndex(c => c.id === currentChapterId);
  const prevChapter = book.toc[currentIndex - 1];
  const nextChapter = book.toc[currentIndex + 1];

  // Scroll to top on chapter change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentChapterId]);

  return (
    <div className="flex flex-col h-full bg-slate-200 dark:bg-black relative">
      {/* Reader Toolbar / Header - App Chrome */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-900 flex-shrink-0 transition-colors">
        <div className="flex flex-col max-w-[60%]">
             <h2 className="font-sans text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                {book.title || "Untitled"}
             </h2>
             <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">
                {book.author || "Unknown Author"}
             </span>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => prevChapter && onNavigate(prevChapter.id)}
            disabled={!prevChapter}
            className="text-slate-500 hover:text-ucc-focus disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-ucc-focus transition-colors"
          >
            ← Prev
          </button>
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
            {currentIndex + 1} / {book.toc.length}
          </span>
          <button 
            onClick={() => nextChapter && onNavigate(nextChapter.id)}
            disabled={!nextChapter}
            className="text-slate-500 hover:text-ucc-focus disabled:opacity-30 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:text-ucc-focus transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main Content Area - The "Page" */}
      {/* 
         DARK MODE FIX: 
         - Changed bg-white to bg-white dark:bg-slate-900 to ensure dark surface.
         - Added dark:text-slate-300 for readable base text.
         - prose-slate handles light mode; dark:prose-invert handles dark mode text contrast.
      */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto scroll-smooth p-8 md:p-16 lg:px-24 w-full bg-white dark:bg-slate-900 dark:text-slate-300 relative shadow-2xl max-w-5xl mx-auto my-0 md:my-8 transition-colors duration-200"
      >
        <div 
          className="prose prose-slate dark:prose-invert prose-lg max-w-none font-sans"
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: content || '<div class="text-slate-400 italic">No content available for this section.</div>' }}
        />
        
        {/* Footer Navigation within Page */}
        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-between">
           {prevChapter ? (
             <button onClick={() => onNavigate(prevChapter.id)} className="text-left group">
               <span className="block text-xs font-mono text-slate-400 mb-1">Previous</span>
               <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 font-medium">Chapter {currentIndex}</span>
             </button>
           ) : <div />}
           
           {nextChapter ? (
             <button onClick={() => onNavigate(nextChapter.id)} className="text-right group">
               <span className="block text-xs font-mono text-slate-400 mb-1">Next</span>
               <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 font-medium">Chapter {currentIndex + 2}</span>
             </button>
           ) : <div />}
        </div>
      </div>
    </div>
  );
};