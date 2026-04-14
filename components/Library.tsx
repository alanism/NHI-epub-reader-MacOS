import React, { useCallback, useEffect, useState } from 'react';
import { Book as BookIcon, Upload, FileText, FolderOpen } from 'lucide-react';
import { epubService } from '../services/epubService';
import { Book } from '../types';
import { nativeDesktopService } from '../services/nativeDesktopService';

interface LibraryProps {
  onLoadBook: (book: Book) => void;
}

const PANELS = [
  {
    title: "The Promise",
    headline: "Reading is just the input.\nThinking is the outcome.",
    body: "Use this reader regularly, and four mental skills steadily improve."
  },
  {
    title: "What You Remember",
    headline: "Ideas that stick.",
    body: "Seeing the same idea through different lenses forces your brain to re-encode it.\nThat’s how knowledge moves from familiar\nto usable."
  },
  {
    title: "How Flexible You Think",
    headline: "One idea. Many angles.",
    body: "Switching perspectives trains mental agility.\nYou get better at explaining, adapting,\nand applying ideas across contexts.\n\nThat’s real understanding."
  },
  {
    title: "How You Think With AI",
    headline: "AI as a thinking partner — not a shortcut.",
    body: "The AI shows reasoning paths, exposes gaps,\nand lets you compare approaches.\n\nYou don’t outsource thinking.\nYou strengthen it."
  },
  {
    title: "How You Think Under Pressure",
    headline: "Clear thinking when it counts.\n(AI quizzes coming soon)",
    body: "Short, focused quizzes will add gentle pressure —\ntraining recall, reasoning, and calm decision-making.\n\nKnowledge that survives pressure is knowledge you own."
  },
  {
    title: "The Compounding Effect",
    headline: "Small sessions. Lasting change.",
    body: "Consistency builds:\n• stronger memory\n• more flexible thinking\n• better use of tools\n• calmer reasoning under pressure\n\nRead regularly.\nYour mind compounds."
  }
];

export const Library: React.FC<LibraryProps> = ({ onLoadBook }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPanel, setCurrentPanel] = useState(0);
  const supportsNativePicker = nativeDesktopService.isNativeDesktop();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPanel((prev) => (prev + 1) % PANELS.length);
    }, 6000); // 6 seconds per panel
    return () => clearInterval(timer);
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.epub')) {
      setError("Please upload a valid .epub file.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const book = await epubService.parse(file);
      onLoadBook(book);
    } catch (err) {
      console.error(err);
      setError("Failed to parse EPUB. Ensure it is a valid, non-DRM file.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleNativeOpen = async () => {
    const file = await nativeDesktopService.pickEpubFile();
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 mb-6 text-slate-600 dark:text-slate-400">
            <BookIcon size={32} />
          </div>
          <h1 className="text-3xl font-sans font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Non-Human Intelligence <span className="text-slate-400">Reader</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm font-medium">
            The multi-expert ePub reader app.
          </p>
          
          {/* Sliding Panels */}
          <div className="relative h-48 flex flex-col items-center justify-start max-w-lg mx-auto">
            <div className="w-full transition-all duration-500 ease-in-out">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    {PANELS[currentPanel].title}
                </h3>
                <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 whitespace-pre-line mb-3 leading-snug">
                    {PANELS[currentPanel].headline}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                    {PANELS[currentPanel].body}
                </p>
            </div>
            
            <div className="flex space-x-2 mt-auto pt-4">
                {PANELS.map((_, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setCurrentPanel(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentPanel ? 'bg-slate-800 dark:bg-slate-200 w-4' : 'bg-slate-300 dark:bg-slate-700'}`}
                        aria-label={`Go to panel ${idx + 1}`}
                    />
                ))}
            </div>
          </div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 ease-in-out text-center group
            ${isDragOver 
              ? 'border-ucc-focus bg-ucc-focus/5' 
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600'}
          `}
        >
          <input 
            type="file" 
            accept=".epub" 
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="flex flex-col items-center pointer-events-none">
            {loading ? (
              <div className="flex flex-col items-center animate-pulse">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
                <p className="text-slate-400 font-mono text-sm">PARSING EPUB CONTAINER...</p>
              </div>
            ) : (
              <>
                <div className={`mb-4 p-4 rounded-full ${
                  isDragOver 
                  ? 'bg-ucc-focus/10 text-ucc-active' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                }`}>
                  <Upload size={24} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Drop EPUB file here</h3>
                <p className="text-sm text-slate-500 mb-6">or click to browse your local library</p>
                <div className="inline-flex items-center px-4 py-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 shadow-sm">
                  <FileText size={14} className="mr-2" />
                  <span>SUPPORTS .EPUB</span>
                </div>
              </>
            )}
          </div>
        </div>

        {supportsNativePicker && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleNativeOpen}
              className="inline-flex items-center space-x-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
            >
              <FolderOpen size={14} />
              <span>Open From Finder</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}
        
        <div className="mt-12 text-center">
            <h4 className="text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-4">Core Principles</h4>
            <div className="flex justify-center space-x-8 text-xs text-slate-400 dark:text-slate-500 font-mono">
                <span>LOCAL_ONLY</span>
                <span>NO_TRACKING</span>
                <span>MANUAL_AI</span>
            </div>
        </div>
      </div>
    </div>
  );
};
