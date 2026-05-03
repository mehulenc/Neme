import { useState, useMemo } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";

interface EditTransactionModalProps {
  transaction: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTransactionModal({
  transaction,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [counterparty, setCounterparty] = useState(transaction.counterparty);
  const [date, setDate] = useState(transaction.transaction_date);
  const [amountStr, setAmountStr] = useState(
    (Math.abs(transaction.amount_minor_units) / 100).toFixed(2),
  );
  const [submitting, setSubmitting] = useState(false);

  const currencyCode = transaction.currency_code || "USD";
  const currencySymbol = useMemo(() => {
    const map: Record<string, string> = {
      USD: "$",
      GBP: "£",
      EUR: "€",
      INR: "₹",
    };
    return map[currencyCode] || currencyCode + " ";
  }, [currencyCode]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const amountMinorUnits =
      Math.round(parseFloat(amountStr) * 100) *
      (transaction.amount_minor_units < 0 ? -1 : 1);

    try {
      const res = await fetch(
        `/api/reconciliation/transactions/${transaction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            counterparty,
            transaction_date: date,
            amount_minor_units: amountMinorUnits,
          }),
        },
      );
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to update transaction");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-2xl">
          <h2 className="text-lg font-bold">
            Edit Transaction{" "}
            {transaction.institution && (
              <span className="text-muted-foreground font-normal">
                • {transaction.institution}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Counterparty
            </label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="w-full border border-border bg-background rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full border border-border bg-background rounded-lg p-2 font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-border bg-background rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            * Note: These edits are stored locally in Neme and do not affect
            your bank statement.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-muted-foreground hover:bg-muted rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
