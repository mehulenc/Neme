import React, { useState, useEffect } from "react";
import {
  CreditCard,
  SplitSquareHorizontal,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  Moon,
  Sun,
} from "lucide-react";
import QuickCreateModal from "./QuickCreateModal";
import UploadModal from "./UploadModal";

interface Transaction {
  id: string;
  transaction_date: string;
  amount_minor_units: number;
  counterparty: string;
  status: string;
}

interface Expense {
  id: string;
  expense_date: string;
  total_amount_minor_units: number;
  description: string;
  status: string;
  users_data: any;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [quickCreateTxn, setQuickCreateTxn] = useState<Transaction | null>(
    null,
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("neme-theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("neme-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("neme-theme", "light");
    }
  }, [darkMode]);

  const handleQuickCreate = () => {
    if (selectedTxnIds.size === 1) {
      const id = Array.from(selectedTxnIds)[0];
      const txn = transactions.find((t) => t.id === id);
      if (txn) setQuickCreateTxn(txn);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reconciliation/data");
      const data = await res.json();
      setTransactions(data.transactions);
      setExpenses(data.expenses);
      setSelectedTxnIds(new Set());
      setSelectedExpenseId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleTransaction = (id: string) => {
    const next = new Set(selectedTxnIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTxnIds(next);
  };

  const handleLink = async () => {
    if (selectedTxnIds.size === 0 || !selectedExpenseId) return;
    try {
      await fetch("/api/reconciliation/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_ids: Array.from(selectedTxnIds),
          splitwise_expense_id: selectedExpenseId,
        }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkPersonal = async () => {
    if (selectedTxnIds.size === 0) return;
    for (const id of selectedTxnIds) {
      await fetch(`/api/reconciliation/transactions/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PERSONAL" }),
      });
    }
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-primary p-2 rounded-lg">
            <SplitSquareHorizontal className="text-primary-foreground h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Neme</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 text-sm font-semibold bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition"
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            Upload CSV
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-muted text-muted-foreground rounded-full transition"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-muted text-muted-foreground rounded-full transition"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-6 max-w-7xl mx-auto w-full pb-28">
        {/* Left Column: Bank Transactions */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="bg-muted/50 px-5 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-card-foreground">HSBC Bank</h2>
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
              {transactions.filter((t) => t.status === "UNMATCHED").length}{" "}
              Unmatched
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {transactions.map((txn) => {
              const isMatched = txn.status === "MATCHED";
              const isPersonal = txn.status === "PERSONAL";
              const isSelectable = txn.status === "UNMATCHED";
              const isSelected = selectedTxnIds.has(txn.id);
              const amount = (txn.amount_minor_units / 100).toFixed(2);
              const isDebit = txn.amount_minor_units < 0;

              let cardStyle =
                "border-transparent border-b-border hover:border-border hover:bg-muted/50 bg-card";
              let textStyle = "";

              if (isMatched) {
                cardStyle =
                  "bg-emerald-500/10 border-emerald-500/20 opacity-70";
                textStyle = "line-through text-muted-foreground";
              } else if (isPersonal) {
                cardStyle = "bg-muted border-border opacity-50";
                textStyle = "line-through text-muted-foreground";
              } else if (isSelected) {
                cardStyle = "border-primary bg-primary/10 shadow-sm";
              }

              return (
                <div
                  key={txn.id}
                  onClick={() => isSelectable && toggleTransaction(txn.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelectable ? "cursor-pointer" : "cursor-default"
                  } ${cardStyle}`}
                >
                  <div
                    className={`flex justify-between items-start mb-2 ${textStyle}`}
                  >
                    <span className="font-medium text-sm line-clamp-1 text-card-foreground">
                      {txn.counterparty}
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        isSelectable
                          ? isDebit
                            ? "text-card-foreground"
                            : "text-emerald-500"
                          : ""
                      }`}
                    >
                      {isDebit ? "" : "+"}
                      {amount}
                    </span>
                  </div>
                  <div
                    className={`text-xs flex items-center font-medium ${
                      isSelectable ? "text-muted-foreground" : textStyle
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    {txn.transaction_date}
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && !loading && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No transactions found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Splitwise Expenses */}
        <div className="flex-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden">
          <div className="bg-muted/50 px-5 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-semibold text-card-foreground">Splitwise</h2>
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
              {expenses.filter((e) => e.status === "UNMATCHED").length}{" "}
              Unmatched
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {expenses.map((exp) => {
              const isMatched = exp.status === "MATCHED";
              const isSelectable = exp.status === "UNMATCHED";
              const isSelected = selectedExpenseId === exp.id;

              let cardStyle =
                "border-transparent border-b-border hover:border-border hover:bg-muted/50 bg-card";
              let textStyle = "";

              if (isMatched) {
                cardStyle =
                  "bg-emerald-500/10 border-emerald-500/20 opacity-70";
                textStyle = "line-through text-muted-foreground";
              } else if (isSelected) {
                cardStyle = "border-primary bg-primary/10 shadow-sm";
              }

              return (
                <div
                  key={exp.id}
                  onClick={() =>
                    isSelectable &&
                    setSelectedExpenseId(isSelected ? null : exp.id)
                  }
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelectable ? "cursor-pointer" : "cursor-default"
                  } ${cardStyle}`}
                >
                  <div
                    className={`flex justify-between items-start mb-2 ${textStyle}`}
                  >
                    <span className="font-medium text-sm line-clamp-1 text-card-foreground">
                      {exp.description}
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        isSelectable ? "text-card-foreground" : ""
                      }`}
                    >
                      {(exp.total_amount_minor_units / 100).toFixed(2)}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isSelectable ? "text-muted-foreground" : textStyle
                    }`}
                  >
                    {exp.expense_date.split("T")[0]}
                  </div>
                </div>
              );
            })}
            {expenses.length === 0 && !loading && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No expenses found.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      {(selectedTxnIds.size > 0 || selectedExpenseId) && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="text-sm flex items-center space-x-3">
            <div
              className={`px-3 py-1 rounded-full ${
                selectedTxnIds.size > 0
                  ? "bg-primary/20 text-primary-foreground"
                  : "text-muted"
              }`}
            >
              <span className="font-bold">{selectedTxnIds.size}</span> Txn
            </div>
            <span className="text-muted-foreground">+</span>
            <div
              className={`px-3 py-1 rounded-full ${
                selectedExpenseId
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-muted"
              }`}
            >
              <span className="font-bold">{selectedExpenseId ? "1" : "0"}</span>{" "}
              Splitwise
            </div>
          </div>

          <div className="h-8 w-px bg-muted"></div>

          <div className="flex space-x-3">
            <button
              onClick={handleMarkPersonal}
              disabled={selectedTxnIds.size === 0}
              className="px-5 py-2.5 text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
            >
              Mark Personal
            </button>
            {selectedTxnIds.size === 1 && !selectedExpenseId && (
              <button
                onClick={handleQuickCreate}
                className="px-5 py-2.5 text-sm font-bold bg-amber-500 text-amber-950 hover:bg-amber-400 rounded-xl transition flex items-center shadow-lg shadow-amber-500/20"
              >
                ⚡ Quick Create
              </button>
            )}
            <button
              onClick={handleLink}
              disabled={selectedTxnIds.size === 0 || !selectedExpenseId}
              className="px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition flex items-center shadow-lg shadow-primary/20"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Link Records
            </button>
          </div>
        </div>
      )}

      {quickCreateTxn && (
        <QuickCreateModal
          transaction={quickCreateTxn}
          onClose={() => setQuickCreateTxn(null)}
          onSuccess={() => {
            setQuickCreateTxn(null);
            fetchData();
          }}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
