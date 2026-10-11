import { useEffect, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';

function callbackErrorFromLocation(location: Location): string {
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));

  return (
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error') ||
    ''
  );
}

type AuthCallbackPageProps = {
  redirectTo?: (url: string) => void;
};

function defaultRedirectTo(url: string): void {
  window.location.replace(url);
}

export default function AuthCallbackPage({ redirectTo = defaultRedirectTo }: AuthCallbackPageProps = {}) {
  const { error, loading, session } = useAuth();
  const callbackError = useMemo(() => callbackErrorFromLocation(window.location), []);

  useEffect(() => {
    if (!loading && session && !callbackError) {
      redirectTo('/');
    }
  }, [callbackError, loading, redirectTo, session]);

  const message = callbackError || error;

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
      <section aria-labelledby="callback-heading" className="w-full max-w-sm border border-zinc-800 bg-[#0a0a0a] p-8">
        <h1 id="callback-heading" className="text-xl tracking-[0.2em] uppercase font-bold mb-3">
          Auth Callback
        </h1>
        {message ? (
          <>
            <p role="alert" className="text-red-500 text-xs uppercase leading-5 mb-5">
              {message}
            </p>
            <a href="/" className="inline-block bg-white text-black font-bold uppercase text-xs tracking-widest py-3 px-4">
              Return To Sign In
            </a>
          </>
        ) : (
          <p className="text-zinc-400 text-xs uppercase tracking-widest">
            {loading ? 'Restoring session...' : 'Session restored. Redirecting...'}
          </p>
        )}
      </section>
    </div>
  );
}
