"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardSkeleton, Button, Input, Badge } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import RoleGuard from "@/shared/components/RoleGuard";

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function RtkPoolPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <RtkPoolContent />
    </RoleGuard>
  );
}

function RtkPoolContent() {
  const { isManager } = useRole();
  const [pool, setPool] = useState(null);
  const [history, setHistory] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch("/api/team/rtk-pool");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPool(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/team/rtk-pool/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistory(data.history || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPool();
    fetchHistory();
  }, [fetchPool, fetchHistory]);

  const handleTopUp = async (e) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/rtk-pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPool(data);
      setTopUpAmount("");
      setSuccess(`Added ${formatTokens(amount)} tokens to RTK pool`);
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const amount = parseInt(topUpAmount, 10);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid reset amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/rtk-pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, mode: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPool(data);
      setTopUpAmount("");
      setSuccess(`RTK pool reset to ${formatTokens(amount)} tokens`);
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">data_usage</span>
            </div>
            <h3 className="text-lg font-medium">RTK Pool</h3>
            <p className="text-sm text-text-muted mt-2">Only team managers can manage the RTK pool.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold">RTK Pool</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage the team token savings pool for streaming response compression
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Pool Status Card */}
      <Card padding="md" className="text-center">
        <p className="text-xs text-text-muted uppercase tracking-wide">Current RTK Pool</p>
        <p className={`text-4xl font-bold mt-2 ${pool?.active ? "text-purple-600" : "text-text-muted"}`}>
          {pool ? formatTokens(pool.rtkPool) : "..."}
        </p>
        <p className="text-sm text-text-muted mt-1">tokens remaining</p>
        {pool?.active ? (
          <Badge variant="success" className="mt-2">Active</Badge>
        ) : (
          <Badge variant="error" className="mt-2">Inactive</Badge>
        )}
      </Card>

      {/* Top Up Form */}
      <Card padding="md">
        <h3 className="font-semibold mb-3">Top Up Pool</h3>
        <form onSubmit={handleTopUp} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Token amount"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              min="1"
              className="flex-1"
            />
            <Button type="submit" loading={saving} disabled={!topUpAmount}>
              Top Up
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!topUpAmount || saving}
            >
              Reset to Amount
            </Button>
            <p className="text-xs text-text-muted self-center">
              Reset mode overwrites the pool to the exact amount entered
            </p>
          </div>
        </form>
      </Card>

      {/* History */}
      <Card padding="md">
        <h3 className="font-semibold mb-3">Pool History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-subtle">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Remaining</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-border-subtle/50">
                    <td className="py-2">
                      {h.action === "allocate" && (
                        <Badge variant="success" size="sm">Top Up</Badge>
                      )}
                      {h.action === "consume" && (
                        <Badge variant="default" size="sm">Consume</Badge>
                      )}
                      {h.action === "reset" && (
                        <Badge variant="warning" size="sm">Reset</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {h.action === "consume" ? "-" : "+"}{formatTokens(h.amount)}
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {formatTokens(h.remainingAfter)}
                    </td>
                    <td className="py-2 text-right text-xs text-text-muted">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
