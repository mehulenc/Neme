import { useState, useEffect, useMemo, useRef } from "react";
import { X, CheckCircle2, Loader2, Plus, Users, User } from "lucide-react";

interface EditExpenseModalProps {
  expense: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditExpenseModal({
  expense,
  onClose,
  onSuccess,
}: EditExpenseModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Form State
  const [description, setDescription] = useState(expense.description);
  const [date, setDate] = useState(expense.expense_date);
  const [costStr, setCostStr] = useState(
    (expense.total_amount_minor_units / 100).toFixed(2),
  );
  const cost = parseFloat(costStr) || 0;

  // Context Selection State
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Split State
  const [splitMode, setSplitMode] = useState<
    "EQUALLY" | "EXACT" | "PERCENTAGE" | "SHARES"
  >("EXACT"); // Default to exact for existing expenses
  const [memberState, setMemberState] = useState<
    Record<number, { paid: string; splitVal: string; include: boolean }>
  >({});
  const currencyCode = expense.currency_code || "USD";
  const currencySymbol = useMemo(() => {
    const map: Record<string, string> = {
      USD: "$",
      GBP: "£",
      EUR: "€",
      INR: "₹",
    };
    return map[currencyCode] || currencyCode + " ";
  }, [currencyCode]);

  useEffect(() => {
    Promise.all([
      fetch("/api/splitwise/current_user").then((res) => res.json()),
      fetch("/api/splitwise/friends").then((res) => res.json()),
      fetch("/api/splitwise/groups").then((res) => res.json()),
    ]).then(([cu, fr, gr]) => {
      setCurrentUser(cu);
      setFriends(fr);
      setGroups(gr.filter((g: any) => g.id !== 0));

      // Parse existing users_data
      const initialMemberState: any = {};
      const users = expense.users_data || [];

      // Determine if it was a group expense
      const groupId = expense.group_id; // Need to ensure group_id is in the model
      if (groupId && groupId !== 0) {
        const group = gr.find((g: any) => g.id === groupId);
        if (group) setSelectedGroup(group);
      } else {
        // Find friends in users_data
        const friendIds = users
          .map((u: any) => u.user_id)
          .filter((id: number) => id !== cu.id);
        const expenseFriends = fr.filter((f: any) => friendIds.includes(f.id));
        setSelectedFriends(expenseFriends);
      }

      users.forEach((u: any) => {
        initialMemberState[u.user_id] = {
          paid: u.paid_share,
          splitVal: u.owed_share,
          include: true,
        };
      });

      setMemberState(initialMemberState);
      setLoading(false);
    });
  }, [expense]);

  // Re-use logic from QuickCreateModal...
  // (Simplified for brevity but maintaining core functionality)

  const currentMembers = useMemo(() => {
    if (!currentUser) return [];
    if (selectedGroup) return selectedGroup.members;
    return [currentUser, ...selectedFriends];
  }, [selectedGroup, selectedFriends, currentUser]);

  const calculations = useMemo(() => {
    const calc: Record<number, { owed: number; paid: number }> = {};
    let totalPaid = 0;

    currentMembers.forEach((m: any) => {
      const state = memberState[m.id];
      const paid = parseFloat(state?.paid) || 0;
      totalPaid += paid;
      calc[m.id] = { paid, owed: 0 };
    });

    const includedMembers = currentMembers.filter(
      (m: any) => memberState[m.id]?.include,
    );

    if (splitMode === "EQUALLY") {
      const amountPerPerson = cost / Math.max(1, includedMembers.length);
      includedMembers.forEach((m: any) => {
        calc[m.id].owed = amountPerPerson;
      });
    } else {
      includedMembers.forEach((m: any) => {
        calc[m.id].owed = parseFloat(memberState[m.id]?.splitVal) || 0;
      });
    }

    let totalOwed = 0;
    Object.values(calc).forEach((v) => (totalOwed += v.owed));

    return { calc, totalPaid, totalOwed };
  }, [currentMembers, memberState, splitMode, cost]);

  const isValid =
    Math.abs(calculations.totalPaid - cost) < 0.01 &&
    Math.abs(calculations.totalOwed - cost) < 0.01;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    const payload = {
      description,
      cost: costStr,
      date,
      group_id: selectedGroup ? selectedGroup.id : 0,
      users: currentMembers
        .filter(
          (m: any) =>
            memberState[m.id]?.include ||
            parseFloat(memberState[m.id]?.paid) > 0,
        )
        .map((m: any) => ({
          user_id: m.id,
          paid_share: calculations.calc[m.id].paid.toFixed(2),
          owed_share: calculations.calc[m.id].owed.toFixed(2),
        })),
    };

    try {
      const res = await fetch(`/api/reconciliation/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to update expense");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
        Loading Splitwise Data...
      </div>
    );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-2xl">
          <h2 className="text-lg font-bold">Edit Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-border bg-background rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={costStr}
                onChange={(e) => setCostStr(e.target.value)}
                className="w-full border border-border bg-background rounded-lg p-2 font-mono focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="col-span-3">
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

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-12 gap-2">
              <div className="col-span-5">Member</div>
              <div className="col-span-3">Paid ({currencySymbol})</div>
              <div className="col-span-4">Owes ({currencySymbol})</div>
            </div>
            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {currentMembers.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3 grid grid-cols-12 gap-2 items-center bg-card hover:bg-muted/50"
                >
                  <div className="col-span-5 flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-muted-foreground/30 overflow-hidden flex-shrink-0">
                      {m.picture?.medium || m.picture?.small ? (
                        <img
                          src={m.picture.medium || m.picture.small}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-full h-full p-1 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium text-sm truncate">
                      {m.first_name} {m.id === currentUser?.id && "(You)"}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-border bg-background rounded p-1 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                      value={memberState[m.id]?.paid || "0.00"}
                      onChange={(e) =>
                        setMemberState((s) => ({
                          ...s,
                          [m.id]: { ...s[m.id], paid: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full border border-border bg-background rounded p-1 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                      value={memberState[m.id]?.splitVal || "0.00"}
                      onChange={(e) =>
                        setMemberState((s) => ({
                          ...s,
                          [m.id]: {
                            ...s[m.id],
                            splitVal: e.target.value,
                            include: true,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-sm font-medium">
            <div
              className={
                Math.abs(calculations.totalPaid - cost) < 0.01
                  ? "text-emerald-500"
                  : "text-destructive"
              }
            >
              Total Paid: {calculations.totalPaid.toFixed(2)} /{" "}
              {cost.toFixed(2)}
            </div>
            <div
              className={
                Math.abs(calculations.totalOwed - cost) < 0.01
                  ? "text-emerald-500"
                  : "text-destructive"
              }
            >
              Total Owed: {calculations.totalOwed.toFixed(2)} /{" "}
              {cost.toFixed(2)}
            </div>
          </div>
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
            disabled={!isValid || submitting}
            className="px-6 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Update Splitwise
          </button>
        </div>
      </div>
    </div>
  );
}
