import React, { useState } from 'react';

const API_BASE = `http://${window.location.hostname}:8000`;

export default function AiInsights({ pin }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);

  const askGemini = async () => {
    setLoading(true);
    setInsight("Uplinking to Gemini AI... analyzing transaction matrix...");
    
    try {
      const res = await fetch(`${API_BASE}/api/insights`, {
        headers: { "x-pin": pin }
      });
      if (!res.ok) throw new Error("API Failure");
      
      const data = await res.json();
      setInsight(data.insight);
    } catch (err) {
      setInsight("ERROR: Neural uplink failed. Check your API key or network connection.");
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs uppercase tracking-widest text-blue-500">Neural Network Analysis</h2>
        <button 
          onClick={askGemini}
          disabled={loading}
          className="text-[10px] tracking-widest border border-blue-900/50 bg-blue-950/20 px-3 py-1.5 font-bold text-blue-400 uppercase hover:bg-blue-500 hover:text-black transition-colors disabled:opacity-50"
        >
          {loading ? "Processing..." : "Run AI Diagnostic"}
        </button>
      </div>
      
      {insight && (
        <div className="border-l-2 border-blue-500 pl-4 py-2">
          <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
            {insight}
          </p>
        </div>
      )}
    </div>
  );
}