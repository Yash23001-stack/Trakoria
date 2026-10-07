import { FormEvent, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import { useTransactions } from './hooks/useTransactions';

export default function App() {
  const [pin, setPin] = useState(localStorage.getItem('ledger_pin') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const {
    txns,
    config,
    loading,
    refresh,
    addTransaction,
    removeTransaction,
    setLoading,
  } = useTransactions(pin);

  const showNotification = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const success = await refresh(pinInput);

    if (success) {
      setPin(pinInput);
      localStorage.setItem('ledger_pin', pinInput);
      setIsAuthenticated(true);
      setLoginError('');
      showNotification('SYSTEM UNLOCKED');
    } else {
      setLoginError('ACCESS DENIED: INVALID SECURITY PIN');
      setIsAuthenticated(false);
    }

    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ledger_pin');
    setPin('');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center uppercase tracking-widest text-xs">
        Authenticating Stream...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4 selection:bg-white selection:text-black">
        <div className="w-full max-w-sm border border-zinc-800 bg-[#0a0a0a] p-8 relative overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.04)]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/10 animate-[scan_4s_linear_infinite]" />

          <h1 className="text-2xl tracking-[0.2em] uppercase mb-1 font-bold">Trakoria</h1>
          <p className="text-[10px] text-zinc-400 mb-8 tracking-widest uppercase">Track Money. Own Your Data.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="PIN"
              className="bg-black border border-zinc-700 text-center text-2xl tracking-[0.8em] p-3 focus:outline-none focus:border-white transition-colors"
              autoFocus
            />
            {loginError && <div className="text-red-500 text-[10px] uppercase text-center">{loginError}</div>}
            <button type="submit" className="bg-white text-black font-bold uppercase text-xs tracking-widest py-3 mt-2 hover:bg-zinc-300 transition-colors">
              Unlock Trakoria
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      pin={pin}
      txns={txns}
      config={config}
      toast={toast}
      onLogout={handleLogout}
      onNotify={showNotification}
      onAddTransaction={addTransaction}
      onDeleteTransaction={removeTransaction}
    />
  );
}
