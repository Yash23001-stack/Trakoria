import { FormEvent, useState } from 'react';
import { useAuth } from '../../auth/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AuthMode = 'signin' | 'signup';

function readableError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export default function AuthPanel() {
  const { error, loading, signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  const validate = () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      return 'Enter a valid email address.';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (isSignup) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (submitError) {
      setFormError(readableError(submitError, isSignup ? 'Unable to create your account.' : 'Unable to sign in.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setFormError('');

    try {
      await signInWithGoogle();
    } catch (oauthError) {
      setFormError(readableError(oauthError, 'Unable to start Google sign-in.'));
      setSubmitting(false);
    }
  };

  const message = formError || error;
  const disabled = loading || submitting;

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 selection:bg-white selection:text-black">
      <section
        aria-labelledby="auth-heading"
        className="w-full max-w-sm border border-zinc-800 bg-[#0a0a0a] p-8 relative overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.04)]"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-white/10 animate-[scan_4s_linear_infinite]" />

        <h1 id="auth-heading" className="text-2xl tracking-[0.2em] uppercase mb-1 font-bold">Trakoria</h1>
        <p className="text-[10px] text-zinc-400 mb-6 tracking-widest uppercase">Sign in to your account</p>

        <div className="grid grid-cols-2 border border-zinc-800 mb-5" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={`py-2 text-xs uppercase tracking-widest ${!isSignup ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={`py-2 text-xs uppercase tracking-widest ${isSignup ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-black border border-zinc-700 text-white text-sm normal-case tracking-normal p-3 focus:outline-none focus:border-white transition-colors"
              autoComplete="email"
              disabled={disabled}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-black border border-zinc-700 text-white text-sm tracking-normal p-3 focus:outline-none focus:border-white transition-colors"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              disabled={disabled}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </label>

          {message && (
            <div role="alert" className="text-red-500 text-[10px] uppercase text-center leading-5">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="bg-white text-black font-bold uppercase text-xs tracking-widest py-3 mt-1 hover:bg-zinc-300 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Working...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="my-5 h-px bg-zinc-800" />

        <button
          type="button"
          disabled={disabled}
          onClick={handleGoogleSignIn}
          className="w-full border border-zinc-700 text-white font-bold uppercase text-xs tracking-widest py-3 hover:border-white transition-colors disabled:opacity-50"
        >
          Continue With Google
        </button>
      </section>
    </div>
  );
}
