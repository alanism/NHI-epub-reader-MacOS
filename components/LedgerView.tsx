import React, { useEffect, useState, useRef } from 'react';
import { ledgerService } from '../services/ledgerService';
import { LedgerEntry, Book as BookModel, SourceTextMode } from '../types';
import { Book, X, Download, Trash2, Target, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { applySourceTextMode } from '../utils/sourceTextMode';

interface LedgerViewProps {
  book: BookModel;
  onClose: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ book, onClose }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [sourceTextMode, setSourceTextMode] = useState<SourceTextMode>('whole');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getModeStorageKey = (bookId: string) => `ledger-source-mode:${bookId}`;

  const isValidSourceTextMode = (value: string): value is SourceTextMode =>
    value === 'whole' || value === 'none' || value === 'partial';

  useEffect(() => {
    ledgerService.getEntriesByBook(book.id).then(setEntries);
  }, [book.id]);

  useEffect(() => {
    const saved = localStorage.getItem(getModeStorageKey(book.id));
    if (saved && isValidSourceTextMode(saved)) {
      setSourceTextMode(saved);
      return;
    }
    setSourceTextMode('whole');
  }, [book.id]);

  useEffect(() => {
    localStorage.setItem(getModeStorageKey(book.id), sourceTextMode);
  }, [book.id, sourceTextMode]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
      setStatusMsg({ text, type });
      setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDelete = async (entryId: string) => {
    try {
        await ledgerService.deleteEntry(entryId);
        setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
        console.error("Failed to delete entry:", err);
    }
  };

  const getExportFilename = () => {
    const sanitize = (str: string) => str.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 60);

    let authorRaw = book.author || 'UnknownAuthor';
    let authorLastName = authorRaw;
    
    if (authorRaw.includes(',')) {
        authorLastName = authorRaw.split(',')[0].trim();
    } else {
        const parts = authorRaw.trim().split(/\s+/);
        if (parts.length > 0) {
            authorLastName = parts[parts.length - 1];
        }
    }

    const authorSlug = sanitize(authorLastName) || 'UnknownAuthor';
    const titleSlug = sanitize(book.title || 'Untitled') || 'Untitled';
    const dateStr = new Date().toISOString().split('T')[0];

    return `${authorSlug}-${titleSlug}-UCC_Ledger-${dateStr}.txt`;
  };

  const handleExport = async () => {
    try {
        const bookEntries = await ledgerService.getEntriesByBook(book.id);
        
        if (bookEntries.length === 0) {
            showStatus('No entries to export.', 'error');
            return;
        }

        const sortedEntries = bookEntries.sort((a, b) => b.timestamp - a.timestamp);

        const lines = sortedEntries.map(entry => {
            const dateStr = new Date(entry.timestamp).toLocaleString();
            const mode = entry.contextType ? `[${entry.contextType.toUpperCase()}]` : '[GENERAL]';
            const type = entry.type.toUpperCase();
            const tags = entry.tags ? `TAGS: ${entry.tags.join(', ')}` : '';
            const renderedSourceText = applySourceTextMode(entry.content, sourceTextMode);
            const exportedSourceText = renderedSourceText || '(Source text omitted)';

            return `--------------------------------------------------
DATE: ${dateStr}
MODE: ${mode}
TYPE: ${type}
${tags}
BOOK: ${entry.bookTitle}

>>> SOURCE TEXT
${exportedSourceText}

>>> ANALYSIS / NOTES
${entry.analysisResult || '(No output)'}
`;
        });

        const header = `UNCOMMON CORE — RESEARCH LEDGER
BOOK: ${book.title}
AUTHOR: ${book.author}
EXPORT DATE: ${new Date().toLocaleString()}
ENTRIES: ${bookEntries.length}

`;

        const fileContent = header + lines.join('\n\n');
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = getExportFilename();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('Export started.');
    } catch (err) {
        console.error('Export failed:', err);
        showStatus('Failed to export ledger.', 'error');
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input value so same file can be selected again if needed
      e.target.value = '';

      if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
          showStatus('Please select a valid .txt file.', 'error');
          return;
      }

      try {
          const text = await file.text();
          // Normalize line endings
          const normalizedText = text.replace(/\r\n/g, '\n');
          const separator = '--------------------------------------------------';
          
          // Split and clean
          const rawBlocks = normalizedText.split(separator).map(b => b.trim()).filter(b => b.length > 0);

          const newEntries: LedgerEntry[] = [];
          const currentEntries = await ledgerService.getEntriesByBook(book.id);
          
          // Create signature set for duplication checking
          const existingContentSignatures = new Set(
              currentEntries.map(e => (e.content || '').trim() + (e.analysisResult || '').trim())
          );

          for (const block of rawBlocks) {
              // Skip potential header block
              if (block.includes('UNCOMMON CORE — RESEARCH LEDGER') && block.includes('EXPORT DATE:')) continue;

              try {
                  // Default values
                  let entryDate = Date.now();
                  let entryType: LedgerEntry['type'] = 'note';
                  let contextType: LedgerEntry['contextType'] = 'non-fiction';
                  let tags: string[] = ['imported', 'external'];
                  let content = '';
                  let analysisResult = '';
                  let importedBookTitle = book.title;

                  // Split Metadata from Content
                  // Looking for Source Text marker
                  const sourceTextMarker = '>>> SOURCE TEXT';
                  const analysisMarker = '>>> ANALYSIS / NOTES';
                  
                  const sourceSplit = block.split(sourceTextMarker);
                  const metaSection = sourceSplit[0];
                  
                  if (sourceSplit.length > 1) {
                      const rest = sourceSplit[1];
                      const analysisSplit = rest.split(analysisMarker);
                      content = analysisSplit[0].trim();
                      if (analysisSplit.length > 1) {
                          analysisResult = analysisSplit[1].trim();
                      }
                  } else {
                      // Fallback if structure is missing, treat whole block as content
                      content = block;
                  }

                  // Parse Metadata Lines
                  const lines = metaSection.split('\n');
                  for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('DATE:')) {
                          const val = trimmed.substring(5).trim();
                          const d = new Date(val);
                          if (!isNaN(d.getTime())) entryDate = d.getTime();
                      }
                      else if (trimmed.startsWith('TYPE:')) {
                          const val = trimmed.substring(5).trim().toLowerCase();
                          if (['analysis', 'annotation', 'note', 'quiz'].includes(val)) {
                              entryType = val as LedgerEntry['type'];
                          }
                      }
                      else if (trimmed.startsWith('MODE:')) {
                           const val = trimmed.substring(5).trim().toLowerCase();
                           if (val.includes('fiction') && !val.includes('non')) {
                               contextType = 'fiction';
                           }
                      }
                      else if (trimmed.startsWith('TAGS:')) {
                           const val = trimmed.substring(5).trim();
                           if (val) {
                               const fileTags = val.split(',').map(t => t.trim());
                               tags.push(...fileTags);
                           }
                      }
                      else if (trimmed.startsWith('BOOK:')) {
                           importedBookTitle = trimmed.substring(5).trim();
                      }
                  }

                  // Skip if content is empty
                  if (!content && !analysisResult) continue;

                  // Duplication Check
                  const signature = content.trim() + analysisResult.trim();
                  if (existingContentSignatures.has(signature)) continue;

                  const newEntry: LedgerEntry = {
                      id: crypto.randomUUID(),
                      bookId: book.id, // Import into CURRENT book context
                      bookTitle: importedBookTitle || book.title,
                      timestamp: entryDate,
                      type: entryType,
                      content,
                      analysisResult,
                      contextType,
                      tags: [...new Set(tags)] // Dedup tags
                  };

                  newEntries.push(newEntry);
                  existingContentSignatures.add(signature); // Prevent dupe in same import batch

              } catch (parseErr) {
                  console.warn('Skipping malformed block', parseErr);
              }
          }

          if (newEntries.length > 0) {
              for (const entry of newEntries) {
                  await ledgerService.addEntry(entry);
              }
              const updated = await ledgerService.getEntriesByBook(book.id);
              setEntries(updated);
              showStatus(`Imported ${newEntries.length} entries.`, 'success');
          } else {
              showStatus('No new or valid entries found.', 'error');
          }

      } catch (err) {
          console.error('Import process error:', err);
          showStatus('Failed to process file.', 'error');
      }
  };

  const getTypeStyles = (type: string) => {
      switch(type) {
          case 'quiz':
              return 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
          case 'analysis':
              return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
          case 'annotation':
              return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
          default:
              return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".txt" 
            className="hidden" 
        />

        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <Book size={18} className="text-slate-500 dark:text-slate-400" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Research Ledger</h2>
          </div>
          
          <div className="flex items-center space-x-4">
             {statusMsg && (
                <div className={`flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-right-2 duration-300 ${statusMsg.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{statusMsg.text}</span>
                </div>
             )}

             <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2" />

             <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5">
                {(['whole', 'none', 'partial'] as SourceTextMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setSourceTextMode(mode)}
                        className={`px-2 py-1 text-[10px] font-mono font-bold uppercase rounded transition-colors ${
                            sourceTextMode === mode
                                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        title={`Show ${mode} source text`}
                    >
                        {mode === 'whole' ? 'Whole' : mode === 'none' ? 'No Source' : 'Partial'}
                    </button>
                ))}
             </div>

             <button 
                onClick={handleImportClick}
                className="flex items-center space-x-2 text-slate-500 hover:text-ucc-focus dark:text-slate-400 dark:hover:text-ucc-focus transition-colors group"
                title="Import .txt ledger file"
            >
                <Upload size={16} className="text-slate-400 group-hover:text-ucc-focus" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider hidden sm:inline">Import</span>
            </button>

            <button 
                onClick={handleExport}
                className="flex items-center space-x-2 text-slate-500 hover:text-ucc-focus dark:text-slate-400 dark:hover:text-ucc-focus transition-colors group"
                title="Download this book's ledger as plain text"
            >
                <Download size={16} className="text-slate-400 group-hover:text-ucc-focus" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider hidden sm:inline">Export</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-4">
                <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50 dark:bg-black/20">
          {entries.length === 0 ? (
            <div className="text-center text-slate-400 mt-20 italic">
              No analysis entries found for this book.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center space-x-1 ${getTypeStyles(entry.type)}`}>
                        {entry.type === 'quiz' && <Target size={10} className="mr-1" />}
                        <span>{entry.type}</span>
                      </span>

                      {entry.tags && entry.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                              #{tag}
                          </span>
                      ))}
                  </div>
                  <button 
                    onClick={() => handleDelete(entry.id)}
                    className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                    title="Delete Entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {entry.type === 'quiz' ? 'Question' : 'Source Text'}
                    </h4>
                    {(() => {
                      const renderedSourceText = applySourceTextMode(entry.content, sourceTextMode);
                      if (!renderedSourceText) {
                        return (
                          <blockquote className="pl-4 border-l-2 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 italic text-sm">
                            (Source text hidden)
                          </blockquote>
                        );
                      }

                      return (
                        <blockquote className="pl-4 border-l-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 italic text-sm">
                          "{renderedSourceText}"
                        </blockquote>
                      );
                    })()}
                  </div>
                  
                  {entry.analysisResult && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          {entry.type === 'quiz' ? 'Insight' : 'Analysis'}
                      </h4>
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                        <ReactMarkdown>{entry.analysisResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
