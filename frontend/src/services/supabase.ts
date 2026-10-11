import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  [key: string]: string | boolean | undefined;
};

export type SupabaseBrowserConfig = {
  url: string;
  key: string;
};

type CachedSupabaseBrowserClient = {
  config: SupabaseBrowserConfig;
  client: SupabaseClient;
};

const PLACEHOLDER_VALUES = new Set([
  '',
  'https://your-project.supabase.co',
  'your-public-anon-key',
  'your-public-publishable-key',
]);

let cachedBrowserClient: CachedSupabaseBrowserClient | null = null;

export function resetSupabaseBrowserClientForTests(): void {
  if (import.meta.env.MODE !== 'test') {
    throw new Error('Supabase browser client test reset is only available in test mode.');
  }

  cachedBrowserClient = null;
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isConfigured(value: string | undefined): boolean {
  return !PLACEHOLDER_VALUES.has(normalize(value));
}

function normalizeSupabaseBrowserConfig(config: SupabaseBrowserConfig): SupabaseBrowserConfig {
  const url = normalize(config.url);
  const key = normalize(config.key);

  if (!isConfigured(url)) {
    throw new Error('Missing VITE_SUPABASE_URL for Supabase browser client.');
  }

  if (!isConfigured(key)) {
    throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY for Supabase browser client.');
  }

  return { url, key };
}

export function getSupabaseBrowserConfig(env: SupabaseEnv = import.meta.env): SupabaseBrowserConfig {
  return normalizeSupabaseBrowserConfig({
    url: env.VITE_SUPABASE_URL ?? '',
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '',
  });
}

export function createSupabaseBrowserClient(
  config: SupabaseBrowserConfig = getSupabaseBrowserConfig(),
): SupabaseClient {
  const normalizedConfig = normalizeSupabaseBrowserConfig(config);

  if (cachedBrowserClient) {
    if (
      cachedBrowserClient.config.url === normalizedConfig.url
      && cachedBrowserClient.config.key === normalizedConfig.key
    ) {
      return cachedBrowserClient.client;
    }

    throw new Error('Supabase browser client was already initialized with different configuration.');
  }

  const client = createClient(normalizedConfig.url, normalizedConfig.key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  cachedBrowserClient = {
    config: normalizedConfig,
    client,
  };

  return client;
}
