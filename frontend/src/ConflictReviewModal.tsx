import { X, Check, ArrowRight, History } from "lucide-react";

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

interface Conflict {
  link_id: string;
  transaction: Transaction;
  expense: Expense;
  mapped_amount_minor_units: number;
}

interface Props {
  conflicts: Conflict[];
  onClose: () => void;
  onResolve: () => void;
}

export default function ConflictReviewModal({
  conflicts,
  onClose,
  onResolve,
}: Props) {
  const handleResolve = async (
    linkId: string,
    action: "APPROVE" | "DISMISS",
  ) => {
    try {
      const res = await fetch(`/api/reconciliation/links/${linkId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onResolve();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-xl">
              <History className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Review Stale Matches
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Splitwise data has changed since these were linked
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {conflicts.map((conflict) => {
            const mappedAmount = (
              conflict.mapped_amount_minor_units / 100
            ).toFixed(2);
            const currentExpAmount = (
              conflict.expense.total_amount_minor_units / 100
            ).toFixed(2);
            const amountChanged = mappedAmount !== currentExpAmount;

            const mappedDate = conflict.transaction.transaction_date;
            const currentExpDate = conflict.expense.expense_date.split("T")[0];
            const dateChanged = mappedDate !== currentExpDate;

            return (
              <div
                key={conflict.link_id}
                className="bg-muted/30 border border-border rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-card-foreground line-clamp-1">
                      {conflict.expense.description}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      Matched with {conflict.transaction.counterparty}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(conflict.link_id, "DISMISS")}
                      className="px-3 py-1.5 text-xs font-bold bg-muted hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-lg transition-all"
                    >
                      Break Link
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.link_id, "APPROVE")}
                      className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Keep Link
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-3 rounded-xl border ${
                      amountChanged
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-card border-border"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                      Amount
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground line-through">
                        {mappedAmount}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={`text-sm font-mono font-bold ${
                          amountChanged
                            ? "text-amber-500"
                            : "text-card-foreground"
                        }`}
                      >
                        {currentExpAmount}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      dateChanged
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-card border-border"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-1">
                      Date
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground line-through">
                        {mappedDate}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span
                        className={`text-sm font-mono font-bold ${
                          dateChanged
                            ? "text-amber-500"
                            : "text-card-foreground"
                        }`}
                      >
                        {currentExpDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            "Keep Link" re-validates the match with the new Splitwise data.{" "}
            <br />
            "Break Link" will return both items to the unmatched pool.
          </p>
        </div>
      </div>
    </div>
  );
}
