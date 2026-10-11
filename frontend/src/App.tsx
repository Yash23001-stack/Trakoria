import { useState } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import AuthPanel from './components/auth/AuthPanel';
import AccountBoard from './components/auth/AccountBoard';
import DashboardPage from './pages/DashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { useTransactions } from './hooks/useTransactions';

function AuthenticatedShell() {
  const {
    backendIdentity,
    identityError,
    identityLoading,
    identityVerified,
    loading: authLoading,
    session,
    signOut,
    user,
  } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const {
    txns,
    config,
    loading,
    error: financialError,
    addTransaction,
    removeTransaction,
  } = useTransactions(session?.access_token, backendIdentity?.user_id);

  const showNotification = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('ledger_pin');
    void signOut();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center uppercase tracking-widest text-xs">
        Authenticating Stream...
      </div>
    );
  }

  if (!session) {
    return <AuthPanel />;
  }

  if (identityLoading || !identityVerified) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col gap-4">
          <AccountBoard
            email={user?.email}
            identity={backendIdentity}
            identityError={identityError}
            identityLoading={identityLoading}
            onLogout={handleLogout}
          />
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      accountBoard={(
        <AccountBoard
          email={user?.email}
          identity={backendIdentity}
          identityError={identityError}
          identityLoading={identityLoading}
          onLogout={handleLogout}
        />
      )}
      txns={txns}
      config={config}
      accountEmail={user?.email}
      financialError={financialError}
      identityVerified={identityVerified}
      toast={toast}
      onLogout={handleLogout}
      onNotify={showNotification}
      onAddTransaction={addTransaction}
      onDeleteTransaction={removeTransaction}
    />
  );
}

function AppRoutes() {
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  return <AuthenticatedShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
