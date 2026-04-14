import React from 'react';
import { Target, PenTool, BrainCircuit } from 'lucide-react';

interface MiniAppMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MiniAppMenu: React.FC<MiniAppMenuProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const apps = [
        { id: 'prediction', name: 'Prediction Loop', icon: Target, desc: 'Test hypotheses about upcoming text.' },
        { id: 'rewrite', name: 'Style Rewrite', icon: PenTool, desc: 'Practice stylistic imitation.' },
        { id: 'argument', name: 'Logic Mapper', icon: BrainCircuit, desc: 'Map arguments to visual nodes.' },
    ];

    return (
        <div className="absolute top-16 right-6 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-30 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mini-Apps</h3>
            </div>
            <div className="space-y-1">
                {apps.map((app) => (
                    <button 
                        key={app.id}
                        onClick={() => {
                            alert(`Simulated Launch: ${app.name}\n\nIn the full UCC ecosystem, this would open the '${app.id}' pedagogical module with the current context.`);
                            onClose();
                        }}
                        className="w-full flex items-start space-x-3 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group"
                    >
                        <app.icon size={16} className="mt-0.5 text-slate-400 group-hover:text-ucc-active dark:group-hover:text-ucc-focus" />
                        <div>
                            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{app.name}</span>
                            <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">{app.desc}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};