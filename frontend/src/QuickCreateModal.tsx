import { useState, useEffect, useMemo, useRef } from "react";
import { X, CheckCircle2, Loader2, Plus, Users, User } from "lucide-react";

interface QuickCreateModalProps {
  transaction: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickCreateModal({
  transaction,
  onClose,
  onSuccess,
}: QuickCreateModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Form State
  const [description, setDescription] = useState(transaction.counterparty);
  const [date, setDate] = useState(transaction.transaction_date);
  const [costStr, setCostStr] = useState(
    (Math.abs(transaction.amount_minor_units) / 100).toFixed(2),
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
  >("EQUALLY");
  const [memberState, setMemberState] = useState<
    Record<number, { paid: string; splitVal: string; include: boolean }>
  >({});
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

  useEffect(() => {
    Promise.all([
      fetch("/api/splitwise/current_user").then((res) => res.json()),
      fetch("/api/splitwise/friends").then((res) => res.json()),
      fetch("/api/splitwise/groups").then((res) => res.json()),
    ]).then(([cu, fr, gr]) => {
      setCurrentUser(cu);
      setFriends(fr);
      setGroups(gr.filter((g: any) => g.id !== 0)); // Filter out Non-group 0

      setMemberState({
        [cu.id]: { paid: costStr, splitVal: "1", include: true },
      });
      setLoading(false);
    });
  }, [costStr]);

  // Handle clicking outside the picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentMembers = useMemo(() => {
    if (!currentUser) return [];
    if (selectedGroup) {
      return selectedGroup.members;
    }
    return [currentUser, ...selectedFriends];
  }, [selectedGroup, selectedFriends, currentUser]);

  useEffect(() => {
    const newState = { ...memberState };
    currentMembers.forEach((m: any) => {
      if (!newState[m.id]) {
        newState[m.id] = { paid: "0", splitVal: "1", include: true };
      }
    });
    setMemberState(newState);
  }, [currentMembers]);

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
    } else if (splitMode === "EXACT") {
      includedMembers.forEach((m: any) => {
        calc[m.id].owed = parseFloat(memberState[m.id]?.splitVal) || 0;
      });
    } else if (splitMode === "PERCENTAGE") {
      includedMembers.forEach((m: any) => {
        const pct = parseFloat(memberState[m.id]?.splitVal) || 0;
        calc[m.id].owed = cost * (pct / 100);
      });
    } else if (splitMode === "SHARES") {
      let totalShares = 0;
      includedMembers.forEach((m: any) => {
        totalShares += parseFloat(memberState[m.id]?.splitVal) || 0;
      });
      includedMembers.forEach((m: any) => {
        const shares = parseFloat(memberState[m.id]?.splitVal) || 0;
        calc[m.id].owed = totalShares > 0 ? cost * (shares / totalShares) : 0;
      });
    }

    let totalOwed = 0;
    Object.values(calc).forEach((v) => (totalOwed += v.owed));

    return { calc, totalPaid, totalOwed };
  }, [currentMembers, memberState, splitMode, cost]);

  const isValid =
    Math.abs(calculations.totalPaid - cost) < 0.01 &&
    Math.abs(calculations.totalOwed - cost) < 0.01;
  const hasParticipants = selectedGroup !== null || selectedFriends.length > 0;

  const handleSubmit = async () => {
    if (!isValid || !hasParticipants) return;
    setSubmitting(true);

    const payload = {
      transaction_id: transaction.id,
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
      const res = await fetch("/api/reconciliation/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess();
      } else {
        alert("Failed to create expense");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const addFriend = (f: any) => {
    setSelectedGroup(null);
    if (!selectedFriends.find((x) => x.id === f.id)) {
      setSelectedFriends([...selectedFriends, f]);
    }
    setShowPicker(false);
  };

  const addGroup = (g: any) => {
    setSelectedFriends([]);
    setSelectedGroup(g);
    setShowPicker(false);
  };

  const removeFriend = (id: string) => {
    setSelectedFriends(selectedFriends.filter((f) => f.id !== id));
  };

  const filteredFriends = friends.filter((f) =>
    `${f.first_name || ""} ${f.last_name || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const filteredGroups = groups.filter((g) =>
    (g.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
          <h2 className="text-lg font-bold">Quick Create in Splitwise</h2>
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

          {/* Token Input for Participants */}
          <div className="relative" ref={pickerRef}>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Participants
            </label>
            <div className="min-h-[42px] border border-border rounded-lg p-1.5 flex flex-wrap gap-2 items-center bg-background">
              {/* You Pill */}
              <div className="flex items-center bg-muted rounded-full pl-1.5 pr-3 py-1">
                <div className="w-5 h-5 rounded-full bg-muted-foreground/30 mr-2 overflow-hidden flex-shrink-0">
                  {currentUser?.picture?.small ? (
                    <img src={currentUser.picture.small} alt="Avatar" />
                  ) : (
                    <User className="w-full h-full p-0.5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">You</span>
              </div>

              {/* Group Pill */}
              {selectedGroup && (
                <div className="flex items-center bg-primary/10 text-primary rounded-full pl-1.5 pr-1 py-1 border border-primary/20">
                  <div className="w-5 h-5 rounded-full bg-primary/20 mr-2 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium mr-1">
                    {selectedGroup.name}
                  </span>
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="p-0.5 hover:bg-primary/20 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Friend Pills */}
              {selectedFriends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center bg-primary/10 text-primary rounded-full pl-1.5 pr-1 py-1 border border-primary/20"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/20 mr-2 overflow-hidden flex-shrink-0">
                    {f.picture?.small ? (
                      <img src={f.picture.small} alt="Avatar" />
                    ) : (
                      <User className="w-full h-full p-0.5 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium mr-1">
                    {f.first_name}
                  </span>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="p-0.5 hover:bg-primary/20 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add Button */}
              {!selectedGroup && (
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="flex items-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-3 py-1 text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              )}
            </div>

            {/* Dropdown Menu (Inline to prevent clipping) */}
            {showPicker && (
              <div className="mt-2 w-full bg-card border border-border rounded-xl flex flex-col max-h-60 overflow-hidden shadow-lg absolute z-20">
                <div className="p-2 border-b border-border bg-card">
                  <input
                    type="text"
                    placeholder="Search friends or groups..."
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary transition text-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="p-2 overflow-y-auto">
                  {/* Friends Section */}
                  {filteredFriends.length > 0 && (
                    <div className="mb-2">
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Friends
                      </div>
                      {filteredFriends.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            addFriend(f);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center px-2 py-2 hover:bg-muted rounded-lg transition text-left"
                        >
                          <div className="w-6 h-6 rounded-full bg-muted-foreground/30 mr-3 overflow-hidden flex-shrink-0">
                            {f.picture?.small ? (
                              <img src={f.picture.small} alt="Avatar" />
                            ) : (
                              <User className="w-full h-full p-1 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {f.first_name} {f.last_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Groups Section */}
                  {selectedFriends.length === 0 &&
                    filteredGroups.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider border-t border-border pt-2">
                          Groups
                        </div>
                        {filteredGroups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              addGroup(g);
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center px-2 py-2 hover:bg-muted rounded-lg transition text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 mr-3 flex items-center justify-center flex-shrink-0">
                              <Users className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">
                              {g.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {filteredFriends.length === 0 &&
                    filteredGroups.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No matching friends or groups found.
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {hasParticipants && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                How to split?
              </label>
              <div className="flex bg-muted p-1 rounded-lg">
                {["EQUALLY", "EXACT", "PERCENTAGE", "SHARES"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSplitMode(mode as any)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                      splitMode === mode
                        ? "bg-background shadow-sm text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasParticipants && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-12 gap-2">
                <div className="col-span-5">Member</div>
                <div className="col-span-3">Paid ({currencySymbol})</div>
                <div className="col-span-4">
                  {splitMode === "EQUALLY"
                    ? "Include?"
                    : splitMode === "EXACT"
                      ? `Owes (${currencySymbol})`
                      : splitMode === "PERCENTAGE"
                        ? "%"
                        : "Shares"}
                </div>
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
                        value={memberState[m.id]?.paid || ""}
                        onChange={(e) =>
                          setMemberState((s) => ({
                            ...s,
                            [m.id]: { ...s[m.id], paid: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-4">
                      {splitMode === "EQUALLY" ? (
                        <input
                          type="checkbox"
                          checked={memberState[m.id]?.include || false}
                          onChange={(e) =>
                            setMemberState((s) => ({
                              ...s,
                              [m.id]: { ...s[m.id], include: e.target.checked },
                            }))
                          }
                          className="w-4 h-4 ml-1 accent-primary"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full border border-border bg-background rounded p-1 text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                          value={memberState[m.id]?.splitVal || ""}
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasParticipants && (
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
          )}
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
            disabled={!isValid || !hasParticipants || submitting}
            className="px-6 py-2 font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Create & Link
          </button>
        </div>
      </div>
    </div>
  );
}
