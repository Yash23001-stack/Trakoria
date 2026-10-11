import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '../../types/transaction';
import { toAmount } from '../../utils/currency';
import { downloadBlob } from './download';

interface DataOperationsProps {
  txns: Transaction[];
  accountEmail?: string;
  identityVerified: boolean;
}

export default function DataOperations({ txns, accountEmail, identityVerified }: DataOperationsProps) {
  const handleCsvExport = () => {
    if (!txns || txns.length === 0) return alert('No data to export.');
    const headers = Object.keys(txns[0]).join(',');
    const rows = txns.map((txn) => Object.values(txn).map((value) => `"${value}"`).join(',')).join('\n');
    downloadBlob(new Blob([`${headers}\n${rows}`], { type: 'text/csv' }), `trakoria_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleJsonExport = () => {
    if (!txns || txns.length === 0) return alert('No data to export.');
    downloadBlob(new Blob([JSON.stringify(txns, null, 2)], { type: 'application/json' }), `trakoria_export_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handlePdfExport = () => {
    if (!txns || txns.length === 0) return alert('No data to export.');

    try {
      const doc = new jsPDF();
      const curr = 'Rs. ';
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TRAKORIA WORKSPACE', 14, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Detailed Financial Statement', 14, 26);
      doc.rect(14, 32, 182, 22);
      doc.setFontSize(8);
      doc.text(`Account Email: ${accountEmail || 'Unknown'}`, 16, 38);
      doc.text(`Ledger ID: TRK-${new Date().getFullYear()}`, 16, 44);
      doc.text('Base Currency: INR', 16, 50);
      doc.text(`Statement Date: ${new Date().toLocaleDateString('en-IN')}`, 110, 38);
      doc.text(`Total Records: ${txns.length}`, 110, 44);
      doc.text(`Status: ${identityVerified ? 'Backend Verified' : 'Unverified'}`, 110, 50);

      const sortedTxns = [...txns].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.id.localeCompare(b.id);
      });
      let runningBalance = 0;
      const tableRows = sortedTxns.map((txn, index) => {
        const amount = toAmount(txn.amount);
        let debit = '-';
        let credit = '-';

        if (txn.type.toLowerCase() === 'expense') {
          debit = amount.toFixed(2);
          runningBalance -= amount;
        } else {
          credit = amount.toFixed(2);
          runningBalance += amount;
        }

        return [
          index + 1,
          txn.date,
          `${txn.category.toUpperCase()} - ${txn.note || ''}`,
          debit,
          credit,
          `${curr}${runningBalance.toFixed(2)}`,
        ];
      });

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
          5: { halign: 'right', cellWidth: 30 },
        },
      });

      doc.save(`Trakoria_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error: ', error);
      alert('Failed to generate PDF. Check terminal for details.');
    }
  };

  return (
    <div className="border border-zinc-800 bg-[#0a0a0a] p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2">
          Import
        </h3>
        <div className="text-[10px] text-zinc-600 uppercase tracking-widest mt-3 leading-5">
          Manual add and Telegram capture are active.
        </div>
      </div>

      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-900 pb-2 mb-3">
          Export
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleCsvExport} className="bg-transparent border border-zinc-800 text-zinc-400 hover:text-white p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer">
            CSV
          </button>
          <button onClick={handleJsonExport} className="bg-transparent border border-zinc-800 text-zinc-400 hover:text-white p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer">
            JSON
          </button>
          <button onClick={handlePdfExport} className="bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-white hover:text-black p-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer">
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
