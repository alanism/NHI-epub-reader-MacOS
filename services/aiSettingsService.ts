import { appLocalDataDir, join } from '@tauri-apps/api/path';
import { load } from '@tauri-apps/plugin-store';
import { Stronghold } from '@tauri-apps/plugin-stronghold';
import {
  AIProvider,
  AISettings,
  AISettingsBundle,
  AIValidationStatus,
} from '../types';
import {
  AI_SETTINGS_STORE_PATH,
  CURATED_MODELS,
  DEFAULT_AI_SETTINGS,
  INSTALLATION_SECRET_KEY,
  PROVIDER_LABELS,
  STRONGHOLD_CLIENT_NAME,
  STRONGHOLD_SNAPSHOT_PATH,
} from '../constants';
import { nativeDesktopService } from './nativeDesktopService';

const SETTINGS_KEY = 'aiSettings';
const FALLBACK_SETTINGS_KEY = 'nhi.ai.settings';
const FALLBACK_SECRET_PREFIX = 'nhi.ai.secret.';

type StrongholdContext = {
  stronghold: Stronghold;
  clientStore: {
    get(key: string): Promise<Uint8Array | null>;
    insert(key: string, value: number[]): Promise<void>;
    remove(key: string): Promise<Uint8Array | null>;
  };
};

let settingsStorePromise: ReturnType<typeof load> | null = null;
let strongholdContextPromise: Promise<StrongholdContext> | null = null;

const generateInstallationSecret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const cloneDefaultSettings = (): AISettings => JSON.parse(JSON.stringify(DEFAULT_AI_SETTINGS)) as AISettings;

const normalizeSettings = (raw?: Partial<AISettings> | null): AISettings => {
  const defaults = cloneDefaultSettings();

  return {
    activeProvider: raw?.activeProvider ?? defaults.activeProvider,
    activeModelByProvider: {
      openai: raw?.activeModelByProvider?.openai ?? defaults.activeModelByProvider.openai,
      gemini: raw?.activeModelByProvider?.gemini ?? defaults.activeModelByProvider.gemini,
    },
    lastValidatedAtByProvider: {
      openai: raw?.lastValidatedAtByProvider?.openai ?? defaults.lastValidatedAtByProvider.openai,
      gemini: raw?.lastValidatedAtByProvider?.gemini ?? defaults.lastValidatedAtByProvider.gemini,
    },
    keyStatusByProvider: {
      openai: raw?.keyStatusByProvider?.openai ?? defaults.keyStatusByProvider.openai,
      gemini: raw?.keyStatusByProvider?.gemini ?? defaults.keyStatusByProvider.gemini,
    },
    errorByProvider: {
      openai: raw?.errorByProvider?.openai ?? defaults.errorByProvider.openai,
      gemini: raw?.errorByProvider?.gemini ?? defaults.errorByProvider.gemini,
    },
  };
};

const getSettingsStore = async () => {
  if (!nativeDesktopService.isNativeDesktop()) {
    return null;
  }

  if (!settingsStorePromise) {
    settingsStorePromise = load(AI_SETTINGS_STORE_PATH, {
      autoSave: 200,
      defaults: {
        [SETTINGS_KEY]: DEFAULT_AI_SETTINGS,
        [INSTALLATION_SECRET_KEY]: null,
      },
    });
  }

  return settingsStorePromise;
};

const getInstallationSecret = async () => {
  const store = await getSettingsStore();
  if (!store) {
    return 'browser-preview-secret';
  }

  let installationSecret = await store.get<string | null>(INSTALLATION_SECRET_KEY);
  if (!installationSecret) {
    installationSecret = generateInstallationSecret();
    await store.set(INSTALLATION_SECRET_KEY, installationSecret);
    await store.save();
  }

  return installationSecret;
};

const getStrongholdContext = async (): Promise<StrongholdContext | null> => {
  if (!nativeDesktopService.isNativeDesktop()) {
    return null;
  }

  if (!strongholdContextPromise) {
    strongholdContextPromise = (async () => {
      const snapshotPath = await join(await appLocalDataDir(), STRONGHOLD_SNAPSHOT_PATH);
      const password = await getInstallationSecret();
      const stronghold = await Stronghold.load(snapshotPath, password);

      let client;
      try {
        client = await stronghold.loadClient(STRONGHOLD_CLIENT_NAME);
      } catch {
        client = await stronghold.createClient(STRONGHOLD_CLIENT_NAME);
      }

      return {
        stronghold,
        clientStore: client.getStore(),
      };
    })();
  }

  return strongholdContextPromise;
};

const getFallbackKeyStorageName = (provider: AIProvider) => `${FALLBACK_SECRET_PREFIX}${provider}`;

const getSavedKeys = async (): Promise<Record<AIProvider, string>> => {
  if (!nativeDesktopService.isNativeDesktop()) {
    return {
      openai: localStorage.getItem(getFallbackKeyStorageName('openai')) ?? '',
      gemini: localStorage.getItem(getFallbackKeyStorageName('gemini')) ?? '',
    };
  }

  const context = await getStrongholdContext();
  if (!context) {
    return { openai: '', gemini: '' };
  }

  const openaiValue = await context.clientStore.get('openai_api_key');
  const geminiValue = await context.clientStore.get('gemini_api_key');

  return {
    openai: openaiValue ? new TextDecoder().decode(new Uint8Array(openaiValue)) : '',
    gemini: geminiValue ? new TextDecoder().decode(new Uint8Array(geminiValue)) : '',
  };
};

const persistSettings = async (settings: AISettings) => {
  if (!nativeDesktopService.isNativeDesktop()) {
    localStorage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }

  const store = await getSettingsStore();
  if (!store) {
    return settings;
  }

  await store.set(SETTINGS_KEY, settings);
  await store.save();
  return settings;
};

const loadSettings = async (): Promise<AISettings> => {
  if (!nativeDesktopService.isNativeDesktop()) {
    const raw = localStorage.getItem(FALLBACK_SETTINGS_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  }

  const store = await getSettingsStore();
  const raw = (await store?.get<AISettings>(SETTINGS_KEY)) ?? DEFAULT_AI_SETTINGS;
  return normalizeSettings(raw);
};

const updateSettings = async (mutate: (settings: AISettings) => AISettings) => {
  const settings = await loadSettings();
  return persistSettings(mutate(settings));
};

const buildBundle = async (): Promise<AISettingsBundle> => {
  const settings = await loadSettings();
  const keysByProvider = await getSavedKeys();

  const providerStates = {
    openai: {
      provider: 'openai' as const,
      model: settings.activeModelByProvider.openai,
      hasKey: Boolean(keysByProvider.openai),
      keyStatus: keysByProvider.openai ? settings.keyStatusByProvider.openai : 'missing',
      lastValidatedAt: settings.lastValidatedAtByProvider.openai,
      errorMessage: settings.errorByProvider.openai,
    },
    gemini: {
      provider: 'gemini' as const,
      model: settings.activeModelByProvider.gemini,
      hasKey: Boolean(keysByProvider.gemini),
      keyStatus: keysByProvider.gemini ? settings.keyStatusByProvider.gemini : 'missing',
      lastValidatedAt: settings.lastValidatedAtByProvider.gemini,
      errorMessage: settings.errorByProvider.gemini,
    },
  };

  return {
    settings,
    keysByProvider,
    providerStates,
  };
};

export const aiSettingsService = {
  async loadBundle(): Promise<AISettingsBundle> {
    return buildBundle();
  },

  async getActiveProvider(): Promise<AIProvider> {
    const settings = await loadSettings();
    return settings.activeProvider;
  },

  async getActiveModel(provider?: AIProvider): Promise<string> {
    const settings = await loadSettings();
    const resolvedProvider = provider ?? settings.activeProvider;
    return settings.activeModelByProvider[resolvedProvider];
  },

  async getActiveProviderKey(): Promise<string> {
    const bundle = await buildBundle();
    return bundle.keysByProvider[bundle.settings.activeProvider];
  },

  async getProviderKey(provider: AIProvider): Promise<string> {
    const bundle = await buildBundle();
    return bundle.keysByProvider[provider];
  },

  async saveProviderKey(provider: AIProvider, value: string): Promise<AISettingsBundle> {
    const trimmedValue = value.trim();

    if (!nativeDesktopService.isNativeDesktop()) {
      if (trimmedValue) {
        localStorage.setItem(getFallbackKeyStorageName(provider), trimmedValue);
      } else {
        localStorage.removeItem(getFallbackKeyStorageName(provider));
      }
    } else {
      const context = await getStrongholdContext();
      if (context) {
        if (trimmedValue) {
          await context.clientStore.insert(
            `${provider}_api_key`,
            Array.from(new TextEncoder().encode(trimmedValue)),
          );
        } else {
          await context.clientStore.remove(`${provider}_api_key`);
        }
        await context.stronghold.save();
      }
    }

    const updatedSettings = await updateSettings((settings) => ({
      ...settings,
      keyStatusByProvider: {
        ...settings.keyStatusByProvider,
        [provider]: trimmedValue ? 'unknown' : 'missing',
      },
      lastValidatedAtByProvider: {
        ...settings.lastValidatedAtByProvider,
        [provider]: trimmedValue ? settings.lastValidatedAtByProvider[provider] : null,
      },
      errorByProvider: {
        ...settings.errorByProvider,
        [provider]: null,
      },
    }));

    return buildBundleFromSettings(updatedSettings);
  },

  async setActiveProvider(provider: AIProvider): Promise<AISettingsBundle> {
    const updatedSettings = await updateSettings((settings) => ({
      ...settings,
      activeProvider: provider,
    }));

    return buildBundleFromSettings(updatedSettings);
  },

  async setActiveModel(provider: AIProvider, model: string): Promise<AISettingsBundle> {
    const safeModel = CURATED_MODELS[provider].includes(model) ? model : CURATED_MODELS[provider][0];
    const updatedSettings = await updateSettings((settings) => ({
      ...settings,
      activeModelByProvider: {
        ...settings.activeModelByProvider,
        [provider]: safeModel,
      },
    }));

    return buildBundleFromSettings(updatedSettings);
  },

  async markValidation(provider: AIProvider, status: AIValidationStatus, errorMessage: string | null) {
    const updatedSettings = await updateSettings((settings) => ({
      ...settings,
      keyStatusByProvider: {
        ...settings.keyStatusByProvider,
        [provider]: status,
      },
      lastValidatedAtByProvider: {
        ...settings.lastValidatedAtByProvider,
        [provider]: status === 'valid' ? Date.now() : settings.lastValidatedAtByProvider[provider],
      },
      errorByProvider: {
        ...settings.errorByProvider,
        [provider]: errorMessage,
      },
    }));

    return buildBundleFromSettings(updatedSettings);
  },

  providerLabel(provider: AIProvider) {
    return PROVIDER_LABELS[provider];
  },
};

async function buildBundleFromSettings(settings: AISettings): Promise<AISettingsBundle> {
  const keysByProvider = await getSavedKeys();

  return {
    settings,
    keysByProvider,
    providerStates: {
      openai: {
        provider: 'openai',
        model: settings.activeModelByProvider.openai,
        hasKey: Boolean(keysByProvider.openai),
        keyStatus: keysByProvider.openai ? settings.keyStatusByProvider.openai : 'missing',
        lastValidatedAt: settings.lastValidatedAtByProvider.openai,
        errorMessage: settings.errorByProvider.openai,
      },
      gemini: {
        provider: 'gemini',
        model: settings.activeModelByProvider.gemini,
        hasKey: Boolean(keysByProvider.gemini),
        keyStatus: keysByProvider.gemini ? settings.keyStatusByProvider.gemini : 'missing',
        lastValidatedAt: settings.lastValidatedAtByProvider.gemini,
        errorMessage: settings.errorByProvider.gemini,
      },
    },
  };
}
