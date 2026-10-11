import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { passwordFeedback, passwordMismatch } from '../utils/password';

export default function PasswordRecoveryPage() {
  const { identityError, isPasswordRecovery, loading, session, signOut, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const feedback = passwordFeedback(password);
  const mismatch = passwordMismatch(password, confirmation);
  const canSubmit = feedback.isValid && !mismatch && confirmation.length > 0;
  const hasValidRecoverySession = Boolean(session && isPasswordRecovery);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!feedback.isValid) {
      setError(feedback.message);
      return;
    }

    if (mismatch) {
      setError(mismatch);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Password updated. Return to sign in with your new password.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  const returnToSignIn = async () => {
    if (session) {
      await signOut();
    }
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
      <section aria-labelledby="recovery-heading" className="w-full max-w-sm border border-zinc-800 bg-[#0a0a0a] p-8">
        <h1 id="recovery-heading" className="text-xl tracking-[0.2em] uppercase font-bold mb-3">
          Reset Password
        </h1>

        {loading ? (
          <p className="text-zinc-400 text-xs uppercase tracking-widest">Restoring recovery session...</p>
        ) : !hasValidRecoverySession ? (
          <>
            <p role="alert" className="text-red-500 text-xs uppercase leading-5 mb-5">
              Recovery link is missing, expired, or already used. Request a new password reset link.
            </p>
            <button type="button" onClick={returnToSignIn} className="inline-block bg-white text-black font-bold uppercase text-xs tracking-widest py-3 px-4">
              Return To Sign In
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
              New Password
              <span className="flex">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-black border border-zinc-700 text-white text-sm tracking-normal p-3 focus:outline-none focus:border-white transition-colors flex-1 min-w-0"
                  autoComplete="new-password"
                  aria-describedby="recovery-password-feedback"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="border border-l-0 border-zinc-700 px-3 text-[10px] uppercase tracking-widest text-zinc-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            <label className="flex flex-col gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
              Confirm Password
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="bg-black border border-zinc-700 text-white text-sm tracking-normal p-3 focus:outline-none focus:border-white transition-colors"
                autoComplete="new-password"
              />
            </label>
            <div id="recovery-password-feedback" aria-live="polite" className="text-[10px] uppercase tracking-widest text-zinc-400 leading-5">
              <div>Password Strength: {feedback.label}</div>
              <div>{feedback.message}</div>
            </div>
            {(error || mismatch || identityError) && (
              <div role="alert" className="text-red-500 text-[10px] uppercase text-center leading-5">
                {error || mismatch || 'Account access could not be verified. Request a new recovery link.'}
              </div>
            )}
            {message && (
              <div role="status" className="flex flex-col gap-3 text-emerald-400 text-[10px] uppercase text-center leading-5">
                <span>{message}</span>
                <button type="button" onClick={returnToSignIn} className="bg-white px-3 py-2 font-bold text-black">
                  Return To Sign In
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="bg-white text-black font-bold uppercase text-xs tracking-widest py-3 mt-1 hover:bg-zinc-300 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
