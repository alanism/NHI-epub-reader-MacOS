import React, { useState } from 'react';
import { Brain, Copy, Save, Loader2, Eraser, Check, ChevronDown, UserCircle, XCircle } from 'lucide-react';
import { aiService } from '../services/aiService';
import { AnalysisMode, LedgerEntry, AnalysisFocus, ExplanationDepth } from '../types';
import { ledgerService } from '../services/ledgerService';
import { PERSONAS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface AnalysisToolProps {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  explanationDepth: ExplanationDepth;
  onOpenSettings: () => void;
}

export const AnalysisTool: React.FC<AnalysisToolProps> = ({ bookId, bookTitle, bookAuthor, explanationDepth, onOpenSettings }) => {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(PERSONAS[0].persona_id);
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>(AnalysisFocus.EXPERT);
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.NON_FICTION); // Keep for metadata context
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setSaved(false);
    setCopied(false);
    setError(null);
    try {
      const result = await aiService.analyzeText(
        input, 
        selectedPersonaId, 
        analysisFocus, 
        explanationDepth, 
        bookTitle, 
        bookAuthor
      );
      setAnalysis(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed.';
      setAnalysis('');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    
    const contentWithMetadata = `Book Title: ${bookTitle}\nAuthor: ${bookAuthor}\n\n${input}`;

    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      bookId,
      bookTitle,
      timestamp: Date.now(),
      type: 'analysis',
      content: contentWithMetadata,
      analysisResult: analysis,
      contextType: mode === AnalysisMode.FICTION ? 'fiction' : 'non-fiction',
      personaId: selectedPersonaId
    };
    await ledgerService.addEntry(entry);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearWorkspace = () => {
    setInput('');
    setAnalysis('');
    setSaved(false);
    setCopied(false);
    setError(null);
  };

  const clearInputOnly = () => {
    setInput('');
  };

  const activePersona = PERSONAS.find(p => p.persona_id === selectedPersonaId);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-[400px] shadow-xl z-20">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between bg-white dark:bg-slate-900 transition-colors">
        <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
          <Brain size={18} />
          <span className="font-mono text-sm font-semibold uppercase tracking-wider">Analyst</span>
          <button 
            onClick={onOpenSettings} 
            className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-medium text-slate-500 hover:text-ucc-focus dark:hover:text-ucc-focus transition-colors uppercase"
            title="Change Explanation Depth"
          >
             DEPTH: {explanationDepth}
          </button>
        </div>
        <button onClick={clearWorkspace} title="Clear workspace" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <Eraser size={16} />
        </button>
      </div>

      {/* Context Toggle (Metadata) */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5">
          <button
            onClick={() => setMode(AnalysisMode.NON_FICTION)}
            className={`flex-1 text-[10px] font-mono py-1 rounded-sm transition-colors ${
              mode === AnalysisMode.NON_FICTION 
              ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            NON-FICTION
          </button>
          <button
            onClick={() => setMode(AnalysisMode.FICTION)}
            className={`flex-1 text-[10px] font-mono py-1 rounded-sm transition-colors ${
              mode === AnalysisMode.FICTION 
              ? 'bg-white dark:bg-slate-700 shadow text-ucc-active dark:text-ucc-focus' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            FICTION
          </button>
        </div>
      </div>

      {/* Control Panel (Persona + Focus) */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
        {/* Persona Selector */}
        <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Active Lens</label>
            <div className="relative">
                <select
                    value={selectedPersonaId}
                    onChange={(e) => setSelectedPersonaId(e.target.value)}
                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-md py-2.5 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-ucc-focus"
                >
                    {PERSONAS.map(p => (
                        <option key={p.persona_id} value={p.persona_id}>{p.display_name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>
        
        {/* Analysis Focus Selector */}
        <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Analysis Focus</label>
            <div className="relative">
                <select
                    value={analysisFocus}
                    onChange={(e) => setAnalysisFocus(e.target.value as AnalysisFocus)}
                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-md py-2.5 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-ucc-focus"
                >
                    {Object.values(AnalysisFocus).map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={16} />
            </div>
        </div>

        {activePersona && (
            <p className="mt-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400 italic">
                "{activePersona.identity.core_thesis}"
            </p>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-4">
        <div className="flex-shrink-0 flex flex-col space-y-2">
          <div className="flex justify-between items-center">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Input Text</label>
             <button 
                onClick={clearInputOnly}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Clear input text only"
             >
                <XCircle size={14} />
             </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste text from the reader here..."
            className="w-full h-24 p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-ucc-focus focus:border-transparent resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:italic placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
          
          {/* Action Button */}
          <div className="pt-2">
             {isLoading ? (
                 <div className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-mono text-xs font-medium flex items-center justify-center space-x-2 animate-pulse">
                    <Loader2 className="animate-spin" size={14} />
                    <span>EMBODYING PERSONA...</span>
                 </div>
             ) : (
                <button
                    onClick={handleAnalyze}
                    disabled={!input.trim()}
                    className="w-full py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-md font-mono text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                    <UserCircle size={14} className="text-ucc-focus" />
                    <span>ANALYZE AS {activePersona?.display_name.toUpperCase()}</span>
                </button>
             )}
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Output</label>
            <div className="flex items-center space-x-2">
                {analysis && (
                  <button 
                    onClick={handleCopy}
                    className={`text-xs flex items-center space-x-1 ${copied ? 'text-ucc-active dark:text-ucc-focus' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>
                )}
                {analysis && (
                  <button 
                    onClick={handleSave}
                    disabled={saved}
                    className={`text-xs flex items-center space-x-1 ${saved ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                  >
                    <Save size={12} />
                    <span>{saved ? 'SAVED' : 'SAVE TO LEDGER'}</span>
                  </button>
                )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-4 text-sm prose prose-sm prose-slate dark:prose-invert max-w-none">
            {error ? (
              <div className="not-prose flex h-full flex-col justify-center space-y-4 text-center">
                <div>
                  <p className="text-sm font-medium text-red-500">{error}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Reading features still work. Update your provider key or model in AI Settings and try again.
                  </p>
                </div>
                <div>
                  <button
                    onClick={onOpenSettings}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Open AI Settings
                  </button>
                </div>
              </div>
            ) : analysis ? (
               <ReactMarkdown>{analysis}</ReactMarkdown>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 text-center italic px-8 space-y-2">
                <Brain size={24} className="opacity-50" />
                <span>Select a persona and paste text to begin.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
