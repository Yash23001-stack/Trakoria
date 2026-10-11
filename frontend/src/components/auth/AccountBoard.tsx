import { FormEvent, useState } from 'react';
import type { BackendIdentity } from '../../services/api';
import { passwordFeedback, passwordMismatch } from '../../utils/password';

interface AccountBoardProps {
  email: string | undefined;
  identity: BackendIdentity | null;
  identityError: string | null;
  identityLoading: boolean;
  onLogout: () => void;
  onChangePassword: (password: string) => Promise<void>;
}

export default function AccountBoard({
  email,
  identity,
  identityError,
  identityLoading,
  onLogout,
  onChangePassword,
}: AccountBoardProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const feedback = passwordFeedback(password);
  const mismatch = passwordMismatch(password, confirmation);
  const canSubmit = feedback.isValid && !mismatch && confirmation.length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!feedback.isValid) {
      setFormError(feedback.message);
      return;
    }

    if (mismatch) {
      setFormError(mismatch);
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await onChangePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Password updated. Use the new password the next time you sign in.');
      setShowPasswordForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Signed In</div>
          <div className="text-xs text-white break-all mt-1">{email || 'Unknown account'}</div>
          {identityLoading && <div className="text-[10px] uppercase tracking-widest mt-2 text-zinc-400">Checking account access...</div>}
          {identityError && (
            <div role="alert" className="text-[10px] uppercase tracking-widest text-red-500 mt-2">
              Account access could not be verified. Please sign out and sign in again.
            </div>
          )}
          {!identity && !identityLoading && !identityError && (
            <div role="alert" className="text-[10px] uppercase tracking-widest text-yellow-400 mt-2">
              Account access is not ready. Please refresh or sign in again.
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPasswordForm((current) => !current)}
            className="border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:border-white hover:text-white transition-colors"
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="border border-red-800 bg-red-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-black transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {message && <div role="status" className="text-[10px] uppercase tracking-widest text-emerald-400">{message}</div>}

      {showPasswordForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 border-t border-zinc-900 pt-3" noValidate>
          <label className="md:col-span-4 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
            New Password
            <span className="flex">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white flex-1 min-w-0"
                autoComplete="new-password"
                aria-describedby="account-password-feedback"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="border border-l-0 border-zinc-800 px-3 text-[10px] uppercase tracking-widest text-zinc-300"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label className="md:col-span-4 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-zinc-500">
            Confirm Password
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="bg-black border border-zinc-800 text-white px-3 py-2 text-xs outline-none focus:border-white"
              autoComplete="new-password"
            />
          </label>
          <div className="md:col-span-4 flex flex-col justify-end gap-1">
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-zinc-300 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
          <div id="account-password-feedback" className="md:col-span-12 text-[10px] uppercase tracking-widest text-zinc-400">
            Password Strength: {feedback.label}. {feedback.message}
          </div>
          {(formError || mismatch) && (
            <div role="alert" className="md:col-span-12 text-[10px] uppercase tracking-widest text-red-500">
              {formError || mismatch}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
