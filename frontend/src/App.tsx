import { useState, useEffect } from "react";
import {
  CreditCard,
  SplitSquareHorizontal,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  Moon,
  Sun,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  ExternalLink,
  User,
} from "lucide-react";
import QuickCreateModal from "./QuickCreateModal";
import UploadModal from "./UploadModal";
import ConflictReviewModal from "./ConflictReviewModal";
import EditTransactionModal from "./EditTransactionModal";
import EditExpenseModal from "./EditExpenseModal";

interface Transaction {
  id: string;
  transaction_date: string;
  amount_minor_units: number;
  counterparty: string;
  status: string;
  is_edited?: boolean;
  currency_code: string;
}

interface Link {
  id: string;
  transaction_id: string;
  splitwise_expense_id: string;
}

interface Expense {
  id: string;
  expense_date: string;
  total_amount_minor_units: number;
  description: string;
  status: string;
  users_data: any;
  currency_code: string;
}

interface SuggestedMatch {
  transaction_id: string;
  expense_id: string;
  confidence: "high" | "low";
  reason: string;
}

interface Conflict {
  link_id: string;
  transaction: Transaction;
  expense: Expense;
  mapped_amount_minor_units: number;
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
  const [suggestedMatches, setSuggestedMatches] = useState<SuggestedMatch[]>(
    [],
  );
  const [links, setLinks] = useState<Link[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(
    null,
  );
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("neme-theme") === "dark";
  });

  const [currencyMap] = useState<Record<string, string>>({
    USD: "$",
    GBP: "£",
    EUR: "€",
    INR: "₹",
  });

  const formatCurrency = (amount: number | string, code: string) => {
    const symbol = currencyMap[code] || code + " ";
    const val = typeof amount === "number" ? amount / 100 : parseFloat(amount);
    return `${symbol}${val.toFixed(2)}`;
  };

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
      const dataRes = await fetch("/api/reconciliation/data");
      const data = await dataRes.json();
      setTransactions(data.transactions);
      setExpenses(data.expenses);
      setSuggestedMatches(data.suggested_matches || []);

      const conflictRes = await fetch("/api/reconciliation/conflicts");
      const conflictData = await conflictRes.json();
      setConflicts(conflictData.conflicts || []);

      setLinks(data.links || []);

      setSelectedTxnIds(new Set());
      setSelectedExpenseId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (match: SuggestedMatch) => {
    setSelectedTxnIds(new Set([match.transaction_id]));
    setSelectedExpenseId(match.expense_id);
  };

  useEffect(() => {
    fetchData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTxnIds(new Set());
        setSelectedExpenseId(null);
        setExpandedExpenseId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    <div
      className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200"
      onClick={() => {
        setSelectedTxnIds(new Set());
        setSelectedExpenseId(null);
      }}
    >
      <header
        className="bg-card border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
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

      {conflicts.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-medium text-card-foreground">
              <span className="font-bold">{conflicts.length}</span> stale
              matches detected. Splitwise data has changed.
            </p>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-amber-950 hover:bg-amber-400 rounded-lg transition-all shadow-sm shadow-amber-500/20"
          >
            Review Changes
          </button>
        </div>
      )}

      <main
        className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-6 max-w-7xl mx-auto w-full pb-28"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Column: Bank Transactions */}
        <div
          className="flex-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
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

              const handleTxnClick = () => {
                if (isSelectable) {
                  toggleTransaction(txn.id);
                } else {
                  // If matched, select it to show info in bar
                  setSelectedTxnIds(new Set([txn.id]));
                  setSelectedExpenseId(null);
                }
              };

              const suggestion = suggestedMatches.find(
                (s) => s.transaction_id === txn.id,
              );
              const matchedExpense = suggestion
                ? expenses.find((e) => e.id === suggestion.expense_id)
                : null;
              return (
                <div
                  key={txn.id}
                  onClick={handleTxnClick}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${cardStyle}`}
                >
                  <div
                    className={`flex justify-between items-start mb-2 ${textStyle}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm line-clamp-1 text-card-foreground">
                        {txn.counterparty}
                      </span>
                      {txn.is_edited && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md w-fit mt-0.5 font-bold uppercase tracking-tight">
                          Edited
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-mono font-medium ${
                        !isMatched && !isPersonal
                          ? isDebit
                            ? "text-card-foreground"
                            : "text-emerald-500"
                          : ""
                      }`}
                    >
                      {isDebit ? "" : "+"}
                      {formatCurrency(
                        txn.amount_minor_units,
                        txn.currency_code,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs flex items-center font-medium ${
                        !isMatched && !isPersonal
                          ? "text-muted-foreground"
                          : textStyle
                      }`}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      {txn.transaction_date}
                    </div>
                    {isSelectable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTxn(txn);
                        }}
                        className="p-1 hover:bg-muted rounded text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {suggestion && matchedExpense && isSelectable && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptSuggestion(suggestion);
                      }}
                      className={`mt-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        suggestion.confidence === "high"
                          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                          : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles
                          className={`h-3.5 w-3.5 ${
                            suggestion.confidence === "high"
                              ? "text-primary"
                              : "text-amber-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            suggestion.confidence === "high"
                              ? "text-primary"
                              : "text-amber-500"
                          }`}
                        >
                          {suggestion.confidence === "high"
                            ? "Strong match"
                            : "Possible match"}
                        </span>
                      </div>
                      <p className="text-xs text-card-foreground font-medium line-clamp-1">
                        {matchedExpense.description} &middot;{" "}
                        <span className="font-mono">
                          {formatCurrency(
                            matchedExpense.total_amount_minor_units,
                            matchedExpense.currency_code,
                          )}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {suggestion.reason}
                      </p>
                    </div>
                  )}
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
        <div
          className="flex-1 bg-card rounded-2xl shadow-sm border border-border flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
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

              const suggestion = suggestedMatches.find(
                (s) => s.expense_id === exp.id,
              );
              const matchedTxn = suggestion
                ? transactions.find((t) => t.id === suggestion.transaction_id)
                : null;

              const isExpanded = expandedExpenseId === exp.id;

              const handleExpClick = () => {
                if (isSelectable) {
                  setSelectedExpenseId(isSelected ? null : exp.id);
                } else {
                  // Show mapped transaction in bar
                  setSelectedExpenseId(exp.id);
                  setSelectedTxnIds(new Set());
                }
              };

              return (
                <div
                  key={exp.id}
                  onClick={handleExpClick}
                  className={`rounded-xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${cardStyle}`}
                >
                  <div className="p-4">
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
                        {formatCurrency(
                          exp.total_amount_minor_units,
                          exp.currency_code,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`text-xs font-medium ${
                          isSelectable ? "text-muted-foreground" : textStyle
                        }`}
                      >
                        {exp.expense_date.split("T")[0]}
                      </div>

                      <div className="flex items-center space-x-2">
                        {Array.isArray(exp.users_data) && (
                          <div className="flex -space-x-1.5">
                            {exp.users_data
                              .slice(0, 3)
                              .map((u: any, i: number) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full border border-card bg-muted flex items-center justify-center overflow-hidden"
                                  title={u.user?.first_name || "User"}
                                >
                                  {u.user?.picture?.medium ||
                                  u.user?.picture?.small ? (
                                    <img
                                      src={
                                        u.user?.picture?.medium ||
                                        u.user?.picture?.small
                                      }
                                      alt={u.user?.first_name || "User"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                            {exp.users_data.length > 3 && (
                              <div className="w-5 h-5 rounded-full border border-card bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                +{exp.users_data.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedExpenseId(isExpanded ? null : exp.id);
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && Array.isArray(exp.users_data) && (
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          Split Details
                        </div>
                        {exp.users_data.map((u: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {u.user?.picture?.medium ||
                                u.user?.picture?.small ? (
                                  <img
                                    src={
                                      u.user?.picture?.medium ||
                                      u.user?.picture?.small
                                    }
                                    alt={u.user?.first_name || "User"}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-2.5 h-2.5 text-muted-foreground" />
                                )}
                              </div>
                              <span className="font-medium">
                                {u.user?.first_name || "User"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 font-mono">
                              <span className="text-muted-foreground">
                                Paid:{" "}
                                {formatCurrency(
                                  u.paid_share,
                                  exp.currency_code,
                                )}
                              </span>
                              <span className="text-card-foreground font-bold">
                                Owes:{" "}
                                {formatCurrency(
                                  u.owed_share,
                                  exp.currency_code,
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                        {isSelectable && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingExp(exp);
                            }}
                            className="w-full mt-2 py-1.5 border border-border rounded-lg text-[11px] font-bold hover:bg-muted transition flex items-center justify-center"
                          >
                            <Pencil className="h-3 w-3 mr-1.5" /> Edit on
                            Splitwise
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {suggestion && matchedTxn && isSelectable && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptSuggestion(suggestion);
                      }}
                      className={`mt-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        suggestion.confidence === "high"
                          ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                          : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles
                          className={`h-3.5 w-3.5 ${
                            suggestion.confidence === "high"
                              ? "text-primary"
                              : "text-amber-500"
                          }`}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            suggestion.confidence === "high"
                              ? "text-primary"
                              : "text-amber-500"
                          }`}
                        >
                          {suggestion.confidence === "high"
                            ? "Strong match"
                            : "Possible match"}
                        </span>
                      </div>
                      <p className="text-xs text-card-foreground font-medium line-clamp-1">
                        {matchedTxn.counterparty} &middot;{" "}
                        <span className="font-mono">
                          {formatCurrency(
                            Math.abs(matchedTxn.amount_minor_units),
                            matchedTxn.currency_code,
                          )}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {suggestion.reason}
                      </p>
                    </div>
                  )}
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
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm flex items-center space-x-3">
            <div
              className={`px-3 py-1 rounded-full transition-colors ${
                selectedTxnIds.size > 0
                  ? "bg-primary/20 text-primary-foreground dark:bg-primary/10 dark:text-primary"
                  : "text-muted-foreground dark:text-muted"
              }`}
            >
              <span className="font-bold">{selectedTxnIds.size}</span> Txn
            </div>
            <span className="text-muted-foreground">+</span>
            <div
              className={`px-3 py-1 rounded-full transition-colors ${
                selectedExpenseId
                  ? "bg-emerald-500/20 text-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-600"
                  : "text-muted-foreground dark:text-muted"
              }`}
            >
              <span className="font-bold">{selectedExpenseId ? "1" : "0"}</span>{" "}
              Splitwise
            </div>
          </div>

          <div className="h-8 w-px bg-muted"></div>

          {selectedTxnIds.size === 1 &&
          !selectedExpenseId &&
          transactions.find((t) => t.id === Array.from(selectedTxnIds)[0])
            ?.status === "MATCHED" ? (
            <div className="flex items-center space-x-3">
              <div className="text-xs text-muted-foreground flex flex-col">
                <span className="uppercase font-bold tracking-widest text-[9px]">
                  Linked To
                </span>
                <span className="text-background font-medium line-clamp-1">
                  {expenses.find(
                    (e) =>
                      e.id ===
                      links.find(
                        (l) =>
                          l.transaction_id === Array.from(selectedTxnIds)[0],
                      )?.splitwise_expense_id,
                  )?.description || "Unknown Expense"}
                </span>
              </div>
              <button
                onClick={() => {
                  const link = links.find(
                    (l) => l.transaction_id === Array.from(selectedTxnIds)[0],
                  );
                  if (link) setSelectedExpenseId(link.splitwise_expense_id);
                }}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ) : selectedExpenseId &&
            selectedTxnIds.size === 0 &&
            expenses.find((e) => e.id === selectedExpenseId)?.status ===
              "MATCHED" ? (
            <div className="flex items-center space-x-3">
              <div className="text-xs text-muted-foreground flex flex-col">
                <span className="uppercase font-bold tracking-widest text-[9px]">
                  Linked To
                </span>
                <span className="text-background font-medium line-clamp-1">
                  {transactions.find(
                    (t) =>
                      t.id ===
                      links.find(
                        (l) => l.splitwise_expense_id === selectedExpenseId,
                      )?.transaction_id,
                  )?.counterparty || "Unknown Transaction"}
                </span>
              </div>
              <button
                onClick={() => {
                  const link = links.find(
                    (l) => l.splitwise_expense_id === selectedExpenseId,
                  );
                  if (link) setSelectedTxnIds(new Set([link.transaction_id]));
                }}
                className="p-2 hover:bg-muted rounded-full text-muted-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
          )}
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
      {showReviewModal && (
        <ConflictReviewModal
          conflicts={conflicts}
          onClose={() => setShowReviewModal(false)}
          onResolve={() => {
            fetchData();
            if (conflicts.length === 1) setShowReviewModal(false);
          }}
        />
      )}

      {editingTxn && (
        <EditTransactionModal
          transaction={editingTxn}
          onClose={() => setEditingTxn(null)}
          onSuccess={() => {
            setEditingTxn(null);
            fetchData();
          }}
        />
      )}

      {editingExp && (
        <EditExpenseModal
          expense={editingExp}
          onClose={() => setEditingExp(null)}
          onSuccess={() => {
            setEditingExp(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
