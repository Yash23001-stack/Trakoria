import React from 'react';
import { jsPDF } from 'jspdf'; // Notice the curly braces here
import autoTable from 'jspdf-autotable'; // Modern import for the autotable plugin

export default function ActivitySidebar({ txns, currency }) {
  // Grab the 5 most recent transactions, sorted by ID (assuming higher ID is newer)
  const recentTxns = [...txns].sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <div className="flex flex-col gap-4 h-full">
      
      {/* TELEGRAM BOT STATUS */}
      <div className="border border-green-900/30 bg-green-950/10 p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase tracking-widest text-green-600">Bot Uplink</span>
          <span className="text-xs text-green-500 animate-pulse">● ONLINE</span>
        </div>
        <div className="text-[10px] text-green-700/70 uppercase tracking-wider">
          System hooked to Telegram API. <br/>
          Awaiting external commands.
        </div>
      </div>

         {/* DATA OPS MODULE */}
      <div className="border border-zinc-900 bg-[#0a0a0a] p-4 flex flex-col gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2 mb-2">
          Data Operations
        </h3>
        
       
       {/* Create Snapshot Button */}
        <button 
          onClick={async () => {
            const pin = localStorage.getItem("ledger_pin");
            try {
              const res = await fetch(`http://${window.location.hostname}:8000/api/backup`, {
                method: 'GET',
                headers: { "x-pin": pin } // Securely passing the PIN in the header!
              });
              
              if (!res.ok) throw new Error("Download blocked by vault");
              
              // Convert the response into a raw file blob
              const blob = await res.blob();
              
              // Create a hidden download link and click it programmatically
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              
              // Generate the filename dynamically (e.g., backup_2026_07_13.db)
              const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
              a.download = `backup_${dateStr}.db`;
              
              document.body.appendChild(a);
              a.click();
              
              // Clean up the hidden link
              a.remove();
              window.URL.revokeObjectURL(url);
              
            } catch (err) {
              console.error(err);
              alert("BACKUP FAILED: Check security pin.");
            }
          }}
          className="w-full bg-zinc-900 hover:bg-white hover:text-black text-white border border-zinc-700 p-2 text-[10px] tracking-widest uppercase transition-colors text-left flex justify-between items-center"
        >
          <span>Create Snapshot</span>
          <span>[.DB]</span>
        </button>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* SQLITE BUTTON */}
          <button 
            onClick={async () => {
              const pin = localStorage.getItem("ledger_pin");
              try {
                const res = await fetch(`http://${window.location.hostname}:8000/api/backup`, {
                  method: 'GET',
                  headers: { "x-pin": pin }
                });
                if (!res.ok) throw new Error("Blocked");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.db`;
                a.click();
                window.URL.revokeObjectURL(url);
              } catch (err) { alert("Backup Failed"); }
            }}
            className="bg-transparent border border-zinc-800 text-zinc-500 hover:text-white p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            + SQLite
          </button>

          {/* CSV EXPORT BUTTON */}
          <button 
            onClick={() => {
              if (!txns || txns.length === 0) return alert("No data to export.");
              const headers = Object.keys(txns[0]).join(",");
              const rows = txns.map(t => Object.values(t).map(val => `"${val}"`).join(",")).join("\n");
              const csvStr = `${headers}\n${rows}`;
              const blob = new Blob([csvStr], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `trakoria_export_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="bg-transparent border border-zinc-800 text-zinc-500 hover:text-white p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            + CSV
          </button>

          {/* JSON EXPORT BUTTON */}
          <button 
            onClick={() => {
              if (!txns || txns.length === 0) return alert("No data to export.");
              const jsonStr = JSON.stringify(txns, null, 2);
              const blob = new Blob([jsonStr], { type: "application/json" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `trakoria_export_${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
            className="bg-transparent border border-zinc-800 text-zinc-500 hover:text-white p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            + JSON
          </button>

          {/* PDF EXPORT BUTTON (BANK STATEMENT STYLE) */}
          <button 
            onClick={() => {
              if (!txns || txns.length === 0) return alert("No data to export.");
              
              try {
                const doc = new jsPDF();
                
                // FIX 1: Use standard text for currency to bypass jsPDF font limitations
                const curr = 'Rs. ';
                
                // 1. Header Information
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("TRAKORIA WORKSPACE", 14, 20);
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text("Detailed Financial Statement", 14, 26);
                
                // 2. Account Details Box
                doc.rect(14, 32, 182, 22); 
                doc.setFontSize(8);
                doc.text(`Account Holder Name: YASH BHANDARE`, 16, 38);
                doc.text(`Ledger ID: TRK-${new Date().getFullYear()}`, 16, 44);
                doc.text(`Base Currency: INR`, 16, 50); // Updated to show INR cleanly
                
                doc.text(`Statement Date: ${new Date().toLocaleDateString('en-GB')}`, 110, 38);
                doc.text(`Total Records: ${txns.length}`, 110, 44);
                doc.text(`Status: Verified Offline`, 110, 50);

                // FIX 2: Sort chronologically by date first. If dates match, sort by transaction ID.
                const sortedTxns = [...txns].sort((a, b) => {
                  const dateDiff = new Date(a.date) - new Date(b.date);
                  if (dateDiff !== 0) return dateDiff;
                  return a.id - b.id; // Tie-breaker for same-day transactions
                });
                
                let runningBalance = 0;
                const tableRows = sortedTxns.map((t, index) => {
                  const amt = parseFloat(t.amount);
                  let debit = "-";
                  let credit = "-";
                  
                  if (t.type.toLowerCase() === 'expense') {
                    debit = amt.toFixed(2);
                    runningBalance -= amt;
                  } else {
                    credit = amt.toFixed(2);
                    runningBalance += amt;
                  }
                  
                  return [
                    index + 1,
                    t.date,
                    `${t.category.toUpperCase()} - ${t.note || ''}`,
                    debit,
                    credit,
                    `${curr}${runningBalance.toFixed(2)}`
                  ];
                });

                // 4. Generate the Grid Table
                autoTable(doc, {
                  startY: 60,
                  head: [['Sr No', 'Date', 'Remarks', 'Debit', 'Credit', 'Balance']],
                  body: tableRows,
                  theme: 'grid', 
                  headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
                  styles: { fontSize: 7, cellPadding: 2 },
                  columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 25 },
                    3: { halign: 'right', cellWidth: 25 }, 
                    4: { halign: 'right', cellWidth: 25 },
                    5: { halign: 'right', cellWidth: 30 }
                  }
                });

                // 5. Save the file
                doc.save(`Trakoria_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
              } catch (err) {
                console.error("PDF Generation Error: ", err);
                alert("Failed to generate PDF. Check terminal for details.");
              }
            }}
            className="bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-white hover:text-black p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
          >
            + PDF STMT
          </button>
        </div>
      </div>
      
      {/* RECENT ACTIVITY FEED */}
      <div className="border border-zinc-900 bg-[#0a0a0a] p-4 flex-grow">
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-900 pb-2 mb-4">
          Live Feed
        </h3>
        
        <div className="flex flex-col gap-4">
          {recentTxns.map(txn => {
            // Fake a timestamp based on transaction creation for the aesthetic
            const randomMin = Math.floor(Math.random() * 59);
           const isExpense = txn.type.toLowerCase() === 'expense';
            
            return (
              <div key={txn.id} className="text-xs border-l-2 pl-3 py-1 flex flex-col gap-1 border-zinc-800">
                <span className="text-zinc-600 font-bold">[SYS_T_{txn.id.toString().padStart(4, '0')}]</span>
                <div className="flex justify-between w-full">
                  <span className={isExpense ? 'text-zinc-300' : 'text-blue-400'}>
                    {txn.type} {currency}{txn.amount}
                  </span>
                  <span className="text-zinc-500 uppercase">{txn.category}</span>
                </div>
              </div>
            );
          })}
          
          {recentTxns.length === 0 && (
            <div className="text-xs text-zinc-700 uppercase tracking-widest">No signals detected.</div>
          )}
        </div>
      </div>
    </div>
  );
}