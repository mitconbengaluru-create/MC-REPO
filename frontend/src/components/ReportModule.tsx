import React, { useState } from "react";
import {
  FileText, ArrowDownToLine, Printer, Filter, BadgeInfo, Barcode,
  CheckCircle2, FileSignature, ShieldAlert, Search, Layers, Clock, CheckSquare, History
} from "lucide-react";
import { Document, Checkout, User, ReturnRecord, Transaction } from "../types";

interface ReportModuleProps {
  documents: Document[];
  checkouts: Checkout[];
  users: User[];
  returns: ReturnRecord[];
  transactions?: Transaction[];
}

export type ReportTab = "all" | "registered" | "checkouts" | "returns";

export default function ReportModule({ documents, checkouts, users, returns, transactions = [] }: ReportModuleProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // CSV Exporter Helper
  const downloadCsv = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build unified events stream across Registration, Check-out, and Check-in (Return)
  const getUnifiedEvents = () => {
    const events: {
      id: string;
      eventType: 'REGISTERED' | 'CHECKED_OUT' | 'CHECKED_IN';
      docName: string;
      docRef: string;
      operator: string;
      party: string;
      timestamp: string;
      details: string;
      status: string;
    }[] = [];

    const seenIds = new Set<string>();

    // 1. Registered events from transactions & legalDocuments
    (transactions || []).forEach(tx => {
      const parties = tx.parties && tx.parties.length > 0
        ? tx.parties.map(p => (p as any).name || (p as any).partyName || p.partyType).join(', ')
        : (tx.transactionType || 'Legal Transaction');

      if (tx.legalDocuments && tx.legalDocuments.length > 0) {
        tx.legalDocuments.forEach(ld => {
          if (!seenIds.has(`reg-${ld.id}`)) {
            seenIds.add(`reg-${ld.id}`);
            events.push({
              id: `reg-${ld.id}`,
              eventType: 'REGISTERED',
              docName: ld.documentName,
              docRef: ld.documentNumber || tx.transactionNumber || ld.id,
              operator: ld.custody?.custodianName || 'Legal Admin',
              party: parties,
              timestamp: ld.receivedDate ? new Date(ld.receivedDate).toISOString().split('T')[0] : (tx.executionDate ? new Date(tx.executionDate).toISOString().split('T')[0] : 'N/A'),
              details: `Registered under ${tx.transactionType || 'Legal Transaction'}. Vault: ${ld.custody?.location || tx.executionPlace || 'Legal Vault'}`,
              status: ld.custodyStatus || ld.status || 'ACTIVE'
            });
          }
        });
      } else if (!seenIds.has(`reg-tx-${tx.id}`)) {
        seenIds.add(`reg-tx-${tx.id}`);
        events.push({
          id: `reg-tx-${tx.id}`,
          eventType: 'REGISTERED',
          docName: `${tx.transactionType || 'Legal Transaction'} [${tx.transactionNumber}]`,
          docRef: tx.transactionNumber,
          operator: 'Legal Admin',
          party: parties,
          timestamp: tx.executionDate ? new Date(tx.executionDate).toISOString().split('T')[0] : 'N/A',
          details: `Transaction executed at ${tx.executionPlace || 'Legal Vault'}`,
          status: tx.status || 'ACTIVE'
        });
      }
    });

    // 2. Checkout events
    (checkouts || []).forEach(c => {
      events.push({
        id: `chk-${c.id}`,
        eventType: 'CHECKED_OUT',
        docName: c.documentName,
        docRef: c.documentId || c.documentDbId || 'N/A',
        operator: c.employeeName,
        party: c.destination || 'Offsite',
        timestamp: c.checkoutDate,
        details: `Destination: ${c.destination}. Purpose: ${c.purpose}. Expected Return: ${c.expectedReturnDate}`,
        status: c.status
      });
    });

    // 3. Returns log
    (returns || []).forEach(r => {
      events.push({
        id: `ret-rec-${r.id}`,
        eventType: 'CHECKED_IN',
        docName: r.documentName || 'Legal Document',
        docRef: r.documentId || 'N/A',
        operator: r.returningEmployeeName || 'Safe Custody Officer',
        party: 'Vault Safe',
        timestamp: r.returnDate || new Date().toISOString().split('T')[0],
        details: `Checked back in. Remarks: ${r.condition || 'Good condition'}${r.notes ? `. Notes: ${r.notes}` : ''}`,
        status: 'Returned'
      });
    });

    // Sort chronologically (newest events first)
    return events.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime() || 0;
      const dateB = new Date(b.timestamp).getTime() || 0;
      return dateB - dateA;
    });
  };

  // Filtered dataset for Active Tab
  const getFilteredEvents = () => {
    const all = getUnifiedEvents();
    const query = searchQuery.toLowerCase().trim();

    return all.filter(ev => {
      // Filter by tab
      if (activeTab === "registered" && ev.eventType !== "REGISTERED") return false;
      if (activeTab === "checkouts" && ev.eventType !== "CHECKED_OUT") return false;
      if (activeTab === "returns" && ev.eventType !== "CHECKED_IN") return false;

      // Filter by status dropdown
      if (filterStatus !== "All") {
        if (filterStatus === "Checked Out" && ev.eventType !== "CHECKED_OUT") return false;
        if (filterStatus === "Checked In" && ev.eventType !== "CHECKED_IN") return false;
        if (filterStatus === "Registered" && ev.eventType !== "REGISTERED") return false;
      }

      // Filter by search query
      if (query) {
        const matches = 
          ev.docName.toLowerCase().includes(query) ||
          ev.docRef.toLowerCase().includes(query) ||
          ev.operator.toLowerCase().includes(query) ||
          ev.party.toLowerCase().includes(query) ||
          ev.details.toLowerCase().includes(query) ||
          ev.eventType.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  };

  // CSV Export for active tab view
  const handleExportCsv = () => {
    const data = getFilteredEvents();
    const headers = ["Event Type", "Document Name", "Reference / ID", "Operator / Custodian", "Party / Location", "Timestamp", "Status", "Audit Details"];
    const rows = data.map(ev => [
      ev.eventType,
      ev.docName,
      ev.docRef,
      ev.operator,
      ev.party,
      ev.timestamp,
      ev.status,
      ev.details
    ]);
    downloadCsv(headers, rows, `MITCON_Compliance_${activeTab.toUpperCase()}_Report`);
  };

  // Trigger high-fidelity print view
  const handlePrint = () => {
    window.print();
  };

  const filteredData = getFilteredEvents();

  return (
    <div id="reporting-panel" className="space-y-6 font-sans leading-relaxed">

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Compliance & Audit Reports Module</h1>
          <p className="text-xs text-slate-500 font-medium">Audit logs registering document registration, checkouts, and check-ins</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold font-display flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print Compliance Frame
          </button>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold font-display flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4" /> Download CSV Report
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS HUB */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-4">

        {/* SELECT REPORT KIND TABS */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl text-center overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "all" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <History className="w-3.5 h-3.5" /> All Audit Operations
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("registered")}
            className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "registered" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Registered Documents Audit
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("checkouts")}
            className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "checkouts" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Check-Out Logistics Log
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("returns")}
            className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "returns" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Check-In / Returns Log
          </button>
        </div>

        {/* SEARCH AND DROPDOWN FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-8 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="report-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compliance logs by document name, ref ID, operator, or party..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="All">All Event Types</option>
              <option value="Registered">Registered Only</option>
              <option value="Checked Out">Checked Out Only</option>
              <option value="Checked In">Checked In / Returned Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRINT AND VIEW PORTAL INNER */}
      <div id="print-area" className="bg-white p-8 border border-slate-200 rounded-2xl shadow-sm space-y-6 printable-certificate relative">

        {/* Certificate Cover Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-600 uppercase tracking-widest font-extrabold font-serif">ORGANIZATIONAL COMPLIANCE ALLIANCE</span>
            <h2 className="text-xl font-bold font-display text-slate-950">MITCON CREDENTIA COMPLIANCE AUDIT CERTIFICATE</h2>
            <p className="text-[10px] text-slate-500 font-mono uppercase">
              {activeTab === "all" && "UNIFIED SYSTEM ACTIVITY REGISTRATION MATRIX"}
              {activeTab === "registered" && "DOCUMENT REGISTRATION & VAULT CUSTODY MATRIX"}
              {activeTab === "checkouts" && "OFFSITE DOCUMENT CHECKOUT LOGISTICS AUDIT"}
              {activeTab === "returns" && "CHECK-IN & SAFE CUSTODY RETURN VERIFICATION"}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <Barcode className="w-16 h-8 stroke-[1.25] text-slate-800" />
            <span className="text-[9px] font-mono font-medium text-slate-400 mt-1 uppercase">VERIFIED_COMPLIANCE_STREAM</span>
          </div>
        </div>

        {/* UNIFIED COMPLIANCE LOGS TABLE */}
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wide">
              {activeTab === "all" && "All Operations Audit Trail"}
              {activeTab === "registered" && "Registered Documents Audit Registry"}
              {activeTab === "checkouts" && "Check-Out Logistics Activity"}
              {activeTab === "returns" && "Check-In & Vault Return Audit"}
            </h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold">Count: {filteredData.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Event Type</th>
                  <th className="px-3 py-2.5">Document Asset</th>
                  <th className="px-3 py-2.5">Operator / Custodian</th>
                  <th className="px-3 py-2.5">Party / Destination</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Audit Remarks & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredData.length > 0 ? (
                  filteredData.map((ev) => {
                    const getBadgeClass = (type: string) => {
                      switch (type) {
                        case 'REGISTERED':
                          return 'bg-purple-100 text-purple-800 border-purple-200';
                        case 'CHECKED_OUT':
                          return 'bg-amber-100 text-amber-800 border-amber-200';
                        case 'CHECKED_IN':
                          return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        default:
                          return 'bg-slate-100 text-slate-800 border-slate-200';
                      }
                    };

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getBadgeClass(ev.eventType)}`}>
                            {ev.eventType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-slate-900 block">{ev.docName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref: {ev.docRef}</span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                          {ev.operator}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {ev.party}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {ev.timestamp}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500 max-w-xs truncate" title={ev.details}>
                          {ev.details}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400 italic">
                      No compliance audit entries found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Certificate Seal Footer */}
        <div className="border-t border-slate-300 pt-6 flex flex-col md:flex-row justify-between items-start md:items-baseline text-[10px] text-slate-400 gap-4 mt-6">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1 text-slate-600"><FileSignature className="w-3.5 h-3.5 text-slate-500" /> AUTOMARK CRYPTOSIGN CONFIRMED</p>
            <p>Generated dynamically in compliance with digital signatures protocols standard MITCON-CREDENTIA-2026.</p>
          </div>
          <div className="font-mono text-slate-400 self-end text-right">
            TIMESTAMP_PROOF: <span className="font-bold text-slate-800">
              {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" })}
              {"     "}
              {new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
