import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, UserCog, X } from 'lucide-react';
import { CURATED_MODELS, PROVIDER_LABELS } from '../constants';
import { aiService } from '../services/aiService';
import { aiSettingsService } from '../services/aiSettingsService';
import { nativeDesktopService } from '../services/nativeDesktopService';
import { AIProvider, AISettingsBundle, ExplanationDepth } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDepth: ExplanationDepth;
  onDepthChange: (depth: ExplanationDepth) => void;
}

const PROVIDERS: AIProvider[] = ['openai', 'gemini'];

const getStatusStyles = (status: AISettingsBundle['providerStates'][AIProvider]['keyStatus']) => {
  switch (status) {
    case 'valid':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
    case 'invalid':
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    case 'unknown':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentDepth,
  onDepthChange,
}) => {
  const [bundle, setBundle] = useState<AISettingsBundle | null>(null);
  const [draftKeys, setDraftKeys] = useState<Record<AIProvider, string>>({
    openai: '',
    gemini: '',
  });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadBundle = async () => {
      const nextBundle = await aiSettingsService.loadBundle();
      setBundle(nextBundle);
      setDraftKeys(nextBundle.keysByProvider);
    };

    void loadBundle();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const refreshBundle = async () => {
    const nextBundle = await aiSettingsService.loadBundle();
    setBundle(nextBundle);
    setDraftKeys(nextBundle.keysByProvider);
  };

  const handleProviderSwitch = async (provider: AIProvider) => {
    setBusyAction(`provider:${provider}`);
    try {
      const nextBundle = await aiSettingsService.setActiveProvider(provider);
      setBundle(nextBundle);
    } finally {
      setBusyAction(null);
    }
  };

  const handleModelChange = async (provider: AIProvider, model: string) => {
    setBusyAction(`model:${provider}`);
    try {
      const nextBundle = await aiSettingsService.setActiveModel(provider, model);
      setBundle(nextBundle);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveKey = async (provider: AIProvider) => {
    setBusyAction(`save:${provider}`);
    setStatusMessage(null);
    try {
      const nextBundle = await aiSettingsService.saveProviderKey(provider, draftKeys[provider]);
      setBundle(nextBundle);
      setStatusMessage(`${PROVIDER_LABELS[provider]} key saved.`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleValidateKey = async (provider: AIProvider) => {
    const candidateKey = draftKeys[provider].trim();
    setBusyAction(`validate:${provider}`);
    setStatusMessage(null);

    try {
      let nextBundle = await aiSettingsService.saveProviderKey(provider, candidateKey);
      setBundle(nextBundle);

      if (!candidateKey) {
        nextBundle = await aiSettingsService.markValidation(
          provider,
          'missing',
          `${PROVIDER_LABELS[provider]} key is empty.`,
        );
        setBundle(nextBundle);
        return;
      }

      await aiService.validateKey(provider, candidateKey);
      nextBundle = await aiSettingsService.markValidation(provider, 'valid', null);
      setBundle(nextBundle);
      setStatusMessage(`${PROVIDER_LABELS[provider]} key validated.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed.';
      const nextBundle = await aiSettingsService.markValidation(provider, 'invalid', message);
      setBundle(nextBundle);
      setStatusMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const activeProvider = bundle?.settings.activeProvider ?? 'gemini';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <UserCog className="text-slate-400" size={24} />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reader Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage learning depth, provider keys, and active AI model selection.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.95fr,1.4fr]">
          <div className="border-b border-slate-100 p-6 dark:border-slate-800 lg:border-b-0 lg:border-r">
            <div className="mb-2">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Explanation Depth
              </h3>
              <div className="space-y-3">
                {Object.values(ExplanationDepth).map((depth) => (
                  <button
                    key={depth}
                    onClick={() => onDepthChange(depth)}
                    className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                      currentDepth === depth
                        ? 'border-ucc-focus bg-ucc-focus/5 ring-1 ring-ucc-focus'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <span
                        className={`block font-medium ${
                          currentDepth === depth
                            ? 'text-ucc-active dark:text-ucc-focus'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {depth}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {depth === ExplanationDepth.FIFTH_GRADER &&
                          'Concrete, example-first explanations.'}
                        {depth === ExplanationDepth.EIGHTH_GRADER &&
                          'Clear structure with balanced abstraction.'}
                        {depth === ExplanationDepth.MBA &&
                          'Compressed, executive, systems-focused output.'}
                      </span>
                    </div>
                    {currentDepth === depth && <div className="h-3 w-3 rounded-full bg-ucc-focus" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  AI Settings
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Keys are remembered in an encrypted native vault when running as a Tauri app.
                  {!nativeDesktopService.isNativeDesktop() &&
                    ' Browser preview falls back to local storage for development only.'}
                </p>
              </div>
              {statusMessage && (
                <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>

            <div className="mb-6 flex rounded-md bg-slate-100 p-1 dark:bg-slate-800">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider}
                  onClick={() => void handleProviderSwitch(provider)}
                  disabled={Boolean(busyAction)}
                  className={`flex-1 rounded-sm px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
                    activeProvider === provider
                      ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {PROVIDER_LABELS[provider]}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {PROVIDERS.map((provider) => {
                const providerState = bundle?.providerStates[provider];
                const isBusy = busyAction?.endsWith(provider);

                return (
                  <div
                    key={provider}
                    className={`rounded-xl border p-5 transition-colors ${
                      activeProvider === provider
                        ? 'border-ucc-focus/50 bg-ucc-focus/5'
                        : 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <KeyRound size={16} className="text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {PROVIDER_LABELS[provider]}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${getStatusStyles(
                          providerState?.keyStatus ?? 'missing',
                        )}`}
                      >
                        {providerState?.keyStatus ?? 'missing'}
                      </span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          API Key
                        </span>
                        <input
                          type="password"
                          value={draftKeys[provider]}
                          onChange={(event) =>
                            setDraftKeys((current) => ({
                              ...current,
                              [provider]: event.target.value,
                            }))
                          }
                          placeholder={`Paste ${PROVIDER_LABELS[provider]} API key`}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-ucc-focus dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Model
                        </span>
                        <select
                          value={providerState?.model ?? CURATED_MODELS[provider][0]}
                          onChange={(event) => void handleModelChange(provider, event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-ucc-focus dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {CURATED_MODELS[provider].map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => void handleSaveKey(provider)}
                        disabled={Boolean(isBusy)}
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-white transition-colors hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {busyAction === `save:${provider}` ? 'Saving...' : 'Save Key'}
                      </button>
                      <button
                        onClick={() => void handleValidateKey(provider)}
                        disabled={Boolean(isBusy)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                      >
                        {busyAction === `validate:${provider}` ? 'Validating...' : 'Validate Key'}
                      </button>
                      {isBusy && <Loader2 size={14} className="animate-spin text-slate-400" />}
                    </div>

                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      <p>
                        Active model: <span className="font-mono">{providerState?.model}</span>
                      </p>
                      <p>
                        Last validated:{' '}
                        {providerState?.lastValidatedAt
                          ? new Date(providerState.lastValidatedAt).toLocaleString()
                          : 'Never'}
                      </p>
                      {providerState?.errorMessage && (
                        <p className="mt-1 text-red-500">{providerState.errorMessage}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50/80 p-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/50">
          AI failures never block reading, search, or ledger access. The active provider only affects
          analysis, quiz generation, and lesson planning.
        </div>
      </div>
    </div>
  );
};
