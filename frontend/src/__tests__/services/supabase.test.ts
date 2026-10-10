import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseBrowserClient, getSupabaseBrowserConfig } from '../../services/supabase';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

describe('Supabase browser client configuration', () => {
  it('reads the public Supabase URL and publishable key from Vite env', () => {
    const config = getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: ' http://127.0.0.1:56000 ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' local-publishable-key ',
      VITE_SUPABASE_ANON_KEY: 'legacy-anon-key',
    });

    expect(config).toEqual({
      url: 'http://127.0.0.1:56000',
      key: 'local-publishable-key',
    });
  });

  it('supports the anonymous key name when a publishable key is not provided', () => {
    const config = getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: 'https://trakoria.example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
    });

    expect(config.key).toBe('anon-key');
  });

  it('rejects missing or placeholder browser configuration', () => {
    expect(() => getSupabaseBrowserConfig({})).toThrow(/VITE_SUPABASE_URL/);

    expect(() => getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: 'https://your-project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'your-public-publishable-key',
    })).toThrow(/VITE_SUPABASE_URL/);

    expect(() => getSupabaseBrowserConfig({
      VITE_SUPABASE_URL: 'http://127.0.0.1:56000',
      VITE_SUPABASE_ANON_KEY: 'your-public-anon-key',
    })).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY/);
  });

  it('initializes the Supabase client with browser auth defaults', () => {
    const client = createSupabaseBrowserClient({
      url: 'http://127.0.0.1:56000',
      key: 'local-public-key',
    });

    expect(client).toEqual({ auth: {} });
    expect(createClient).toHaveBeenCalledWith('http://127.0.0.1:56000', 'local-public-key', {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  });
});
