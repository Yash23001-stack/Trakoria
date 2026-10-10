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

const PLACEHOLDER_VALUES = new Set([
  '',
  'https://your-project.supabase.co',
  'your-public-anon-key',
  'your-public-publishable-key',
]);

function normalize(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isConfigured(value: string | undefined): boolean {
  return !PLACEHOLDER_VALUES.has(normalize(value));
}

export function getSupabaseBrowserConfig(env: SupabaseEnv = import.meta.env): SupabaseBrowserConfig {
  const url = normalize(env.VITE_SUPABASE_URL);
  const key = normalize(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY);

  if (!isConfigured(url)) {
    throw new Error('Missing VITE_SUPABASE_URL for Supabase browser client.');
  }

  if (!isConfigured(key)) {
    throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY for Supabase browser client.');
  }

  return { url, key };
}

export function createSupabaseBrowserClient(
  config: SupabaseBrowserConfig = getSupabaseBrowserConfig(),
): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}
