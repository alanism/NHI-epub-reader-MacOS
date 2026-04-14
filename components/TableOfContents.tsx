import React from 'react';
import { Book } from '../types';
import { X, List } from 'lucide-react';

interface TableOfContentsProps {
  book: Book;
  currentChapterId: string;
  onNavigate: (chapterId: string) => void;
  onClose: () => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ book, currentChapterId, onNavigate, onClose }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-[300px] shadow-xl z-20">
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
          <List size={18} />
          <span className="font-mono text-sm font-semibold uppercase tracking-wider">Contents</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {book.toc.map((chapter, index) => {
            const isActive = chapter.id === currentChapterId;
            return (
              <li key={chapter.id}>
                <button
                  onClick={() => {
                    onNavigate(chapter.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors group flex items-start ${
                    isActive 
                      ? 'bg-ucc-focus/10 text-ucc-active dark:text-ucc-focus font-medium' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`font-mono text-xs mr-3 mt-0.5 opacity-50 ${isActive ? 'text-ucc-active dark:text-ucc-focus' : ''}`}>
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="line-clamp-2">{chapter.label || `Chapter ${index + 1}`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};