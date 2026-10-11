import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSupabaseBrowserClient,
  getSupabaseBrowserConfig,
  resetSupabaseBrowserClientForTests,
} from '../../services/supabase';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string) => ({ auth: {}, key, url })),
}));

describe('Supabase browser client configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseBrowserClientForTests();
  });

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

    expect(client).toEqual({ auth: {}, key: 'local-public-key', url: 'http://127.0.0.1:56000' });
    expect(createClient).toHaveBeenCalledWith('http://127.0.0.1:56000', 'local-public-key', {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  });

  it('reuses the browser client for repeated initialization with the same configuration', () => {
    const config = {
      url: 'http://127.0.0.1:56000',
      key: 'local-public-key',
    };

    const firstClient = createSupabaseBrowserClient(config);
    const secondClient = createSupabaseBrowserClient(config);

    expect(secondClient).toBe(firstClient);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('reuses the browser client after normalizing the same configuration', () => {
    const firstClient = createSupabaseBrowserClient({
      url: ' http://127.0.0.1:56000 ',
      key: ' local-public-key ',
    });
    const secondClient = createSupabaseBrowserClient({
      url: 'http://127.0.0.1:56000',
      key: 'local-public-key',
    });

    expect(secondClient).toBe(firstClient);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('rejects missing or placeholder configuration before creating a client', () => {
    expect(() => createSupabaseBrowserClient({
      url: 'https://your-project.supabase.co',
      key: 'local-public-key',
    })).toThrow(/VITE_SUPABASE_URL/);

    expect(() => createSupabaseBrowserClient({
      url: 'http://127.0.0.1:56000',
      key: 'your-public-publishable-key',
    })).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY/);

    expect(createClient).not.toHaveBeenCalled();
  });

  it('fails clearly instead of reusing a client when browser configuration changes', () => {
    createSupabaseBrowserClient({
      url: 'http://127.0.0.1:56000',
      key: 'local-public-key',
    });

    expect(() => createSupabaseBrowserClient({
      url: 'http://127.0.0.1:56000',
      key: 'different-public-key',
    })).toThrow(/already initialized with different configuration/);

    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
