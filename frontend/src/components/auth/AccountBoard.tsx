import type { BackendIdentity } from '../../services/api';

interface AccountBoardProps {
  email: string | undefined;
  identity: BackendIdentity | null;
  identityError: string | null;
  identityLoading: boolean;
  onLogout: () => void;
}

export default function AccountBoard({
  email,
  identity,
  identityError,
  identityLoading,
  onLogout,
}: AccountBoardProps) {
  const status = identityLoading
    ? 'Verifying'
    : identity
      ? 'Verified'
      : 'Unverified';

  return (
    <section className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Signed In</div>
        <div className="text-xs text-white break-all mt-1">{email || 'Unknown account'}</div>
        <div className={`text-[10px] uppercase tracking-widest mt-2 ${identity ? 'text-green-400' : 'text-yellow-400'}`}>
          Backend Identity: {status}
        </div>
        {identityError && (
          <div role="alert" className="text-[10px] uppercase tracking-widest text-red-500 mt-2">
            {identityError}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="border border-red-800 bg-red-950/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-black transition-colors"
      >
        Logout
      </button>
    </section>
  );
}
