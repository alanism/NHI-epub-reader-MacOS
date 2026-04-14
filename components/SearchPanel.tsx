import React, { useState, useMemo } from 'react';
import { Book } from '../types';
import { X, Search, ArrowRight } from 'lucide-react';

interface SearchPanelProps {
  book: Book;
  onNavigate: (chapterId: string) => void;
  onClose: () => void;
}

interface SearchResult {
  chapterId: string;
  chapterLabel: string;
  snippet: string;
  index: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ book, onNavigate, onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Strip HTML helper
  const getTextContent = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const results = useMemo(() => {
    if (!query || query.length < 3) return [];
    
    const term = query.toLowerCase();
    const hits: SearchResult[] = [];

    book.toc.forEach((chapter) => {
      const content = book.contentMap[chapter.id];
      if (!content) return;

      const text = getTextContent(content);
      const textLower = text.toLowerCase();
      let pos = textLower.indexOf(term);

      // Limit to first 5 matches per chapter to avoid spam
      let count = 0;
      while (pos !== -1 && count < 5) {
        // Create snippet
        const start = Math.max(0, pos - 40);
        const end = Math.min(text.length, pos + term.length + 40);
        const snippet = text.substring(start, end);
        
        hits.push({
            chapterId: chapter.id,
            chapterLabel: chapter.label || 'Untitled Chapter',
            snippet: `...${snippet}...`,
            index: pos
        });

        pos = textLower.indexOf(term, pos + 1);
        count++;
      }
    });

    return hits;
  }, [query, book]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-[300px] shadow-xl z-20">
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
          <Search size={18} />
          <span className="font-mono text-sm font-semibold uppercase tracking-wider">Find</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-ucc-focus focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                autoFocus
            />
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        </div>
        <p className="mt-2 text-[10px] text-slate-400">
            {query.length > 0 && query.length < 3 ? "Enter at least 3 characters" : `${results.length} matches found`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {results.length === 0 && query.length >= 3 && (
            <div className="text-center text-slate-400 mt-10 text-xs italic">
                No results found.
            </div>
        )}
        
        <div className="space-y-4">
            {/* Group by chapter implicitly by order */}
            {results.map((hit, idx) => (
                <button 
                    key={`${hit.chapterId}-${idx}`}
                    onClick={() => onNavigate(hit.chapterId)}
                    className="w-full text-left p-3 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">{hit.chapterLabel}</span>
                        <ArrowRight size={10} className="text-ucc-focus opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                        <span dangerouslySetInnerHTML={{ 
                            __html: hit.snippet.replace(new RegExp(`(${query})`, 'gi'), '<mark class="bg-ucc-focus/20 text-ucc-active dark:text-ucc-focus font-bold rounded-sm px-0.5">$1</mark>') 
                        }} />
                    </p>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};