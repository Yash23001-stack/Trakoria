import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricsGrid from './components/MetricsGrid';
import ChartsGrid from './components/ChartsGrid';
import LedgerStream from './components/LedgerStream';
import ActivitySidebar from './components/ActivitySidebar'; 
import CalendarView from './components/CalendarView';

const API_BASE = `http://${window.location.hostname}:8000`;

export default function App() {
  const [txns, setTxns] = useState([]);
  const [config, setConfig] = useState({ currency: "₹", monthlyBudget: 19800, budgets: {} });
  const [selectedDate, setSelectedDate] = useState("");
  
  // 1. UPDATED STATE: Now stores both Year and Month (e.g., "2026-7")
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${new Date().getMonth()}`);
  
  // 2. UPDATED FILTER: Now explicitly checks that BOTH the year and month match the dropdown
  const currentMonthTxns = txns.filter(t => {
    const txnDate = new Date(t.date);
    const txnMonthYear = `${txnDate.getFullYear()}-${txnDate.getMonth()}`;
    return txnMonthYear === selectedMonth;
  });
  
  // Security Layer States
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState(localStorage.getItem("ledger_pin") || "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [pinInput, setPinInput] = useState("");

  // Live Notification State
  const [toast, setToast] = useState(null);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async (currentPin) => {
    try {
      const res = await fetch(`${API_BASE}/api/data`, {
        headers: { "x-pin": currentPin } 
      });
      
      if (res.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }

      const rawData = await res.json();
      setTxns(rawData.transactions || []);
      setConfig(rawData.config || { currency: "₹", monthlyBudget: 19800, budgets: {} });
      setIsAuthenticated(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("API Connection Error:", err);
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    if (pin) {
      fetchData(pin);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const success = await fetchData(pinInput);
    if (success) {
      setPin(pinInput);
      localStorage.setItem("ledger_pin", pinInput);
      setLoginError("");
      showNotification("✓ SYSTEM UNLOCKED"); 
    } else {
      setLoginError("ACCESS DENIED: INVALID SECURITY PIN");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("ledger_pin");
    setPin("");
    setIsAuthenticated(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this transaction?")) return;
    
    try {
      await fetch(`${API_BASE}/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { "x-pin": pin } 
      });
      fetchData(pin);
      showNotification(`✓ Transaction [${id}] Terminated`); 
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // --- 1. THE TERMINAL LOCK SCREEN ---
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
        <div className="w-full max-w-sm border border-zinc-900 bg-[#0a0a0a] p-8 relative overflow-hidden">
          {/* Subtle aesthetic background scanline */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/10 animate-[scan_4s_linear_infinite]"></div>
          
          <h1 className="text-2xl tracking-[0.2em] uppercase mb-1 font-bold">Trakoria</h1>
          <p className="text-[10px] text-zinc-400 mb-8 tracking-widest uppercase">Track Money. Own Your Data.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password" 
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="bg-black border border-zinc-800 text-center text-2xl tracking-[1em] p-3 focus:outline-none focus:border-white transition-colors"
              autoFocus
            />
            {loginError && <div className="text-red-500 text-[10px] uppercase text-center">{loginError}</div>}
            <button type="submit" className="bg-white text-black font-bold uppercase text-xs tracking-widest py-3 mt-2 hover:bg-zinc-300 transition-colors">
             UNLOCK TRAKORIA
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 2. THE MAIN DASHBOARD OPERATIONAL LAYER ---
  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-8 text-left selection:bg-white selection:text-black relative">
      
      {/* THE GLOBAL LIVE NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-white text-black px-4 py-2 text-[10px] uppercase tracking-widest font-bold z-50 flex items-center gap-2 border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <span className="w-2 h-2 bg-black animate-pulse"></span>
          {toast}
        </div>
      )}

      {/* 3. UPDATED HEADER: Passing the selectedMonth states */}
      <Header 
        pin={pin} 
        handleLogout={handleLogout} 
        selectedMonth={selectedMonth} 
        setSelectedMonth={setSelectedMonth} 
      />
      
      {/* 4-COLUMN COMMAND CENTER LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* MAIN MODULES (Takes up 3/4 of screen on desktop) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* 4. UPDATED WIDGETS: All components now use 'currentMonthTxns' */}
          <MetricsGrid txns={currentMonthTxns} config={config} />
          <ChartsGrid txns={currentMonthTxns} config={config} />
          
          {/* THE CALENDAR HEATMAP */}
          <CalendarView 
            txns={currentMonthTxns} 
            currency={config.currency} 
            setSelectedDate={setSelectedDate} 
            selectedMonth={selectedMonth}
          />

          <LedgerStream 
            txns={currentMonthTxns} 
            config={config} 
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate} 
            handleDelete={handleDelete} 
          />
        </div>

        {/* RIGHT SIDEBAR: Live Activity & Bot Status */}
        <div className="xl:col-span-1">
          <ActivitySidebar txns={currentMonthTxns} currency={config.currency} />
        </div>

      </div>
    </div>
  );
}