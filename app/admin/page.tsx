"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/hooks/useSession";

interface Incident {
  id: number;
  createdAt: string;
  level: "error" | "warn" | "info";
  source: string;
  message: string;
  detail?: string | null;
}

const DB_WARN_BYTES = 50 * 1024 * 1024;   // 50 MB
const DB_DANGER_BYTES = 100 * 1024 * 1024; // 100 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user: me, isSuperAdmin: amISuperAdmin } = useSession();

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");

  // Reset password inline state
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetCopied, setResetCopied] = useState(false);
  const [resetError, setResetError] = useState("");

  // Settings
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setRegistrationOpen(d.registrationOpen ?? true))
      .catch((err) => console.error("Failed to fetch admin settings:", err));
  }, []);

  async function toggleRegistration(value: boolean) {
    setSettingsLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationOpen: value }),
    });
    if (res.ok) setRegistrationOpen(value);
    setSettingsLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function setRole(user: User, newRole: string) {
    setUserError("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      setUserError((await res.json()).error ?? "Error updating role");
      return;
    }
    await loadUsers();
  }

  async function deleteUser(user: User) {
    if (!confirm(`Delete user "${user.username}"? This will also delete all their stock and collections.`)) return;
    setUserError("");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      setUserError((await res.json()).error ?? "Error deleting user");
      return;
    }
    await loadUsers();
  }

  function generatePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint8Array(14);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => chars[b % chars.length]).join("");
  }

  async function openReset(userId: string) {
    const pw = generatePassword();
    setResetId(userId);
    setResetPw("");
    setResetCopied(false);
    setResetError("");
    const res = await fetch(`/api/admin/users/${userId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pw }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResetError(data.error ?? "Error resetting password");
      return;
    }
    setResetPw(pw);
  }

  function cancelReset() {
    setResetId(null);
    setResetPw("");
    setResetCopied(false);
    setResetError("");
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(resetPw);
    setResetCopied(true);
  }

  // Metrics
  type EndpointMetrics = { total: number; rpm: number; errors: number; p50: number; p95: number; lastMs: number };
  const [metrics, setMetrics] = useState<Record<string, EndpointMetrics> | null>(null);
  const loadMetrics = useCallback(() => {
    fetch("/api/admin/metrics").then((r) => r.ok ? r.json() : null).then((d) => d && setMetrics(d)).catch((err) => console.error("Failed to load metrics:", err));
  }, []);
  useEffect(() => { loadMetrics(); const id = setInterval(loadMetrics, 10_000); return () => clearInterval(id); }, [loadMetrics]);

  // Usage
  type DailyEntry = { date: string; registered: number; anonymous: number };
  type PathEntry = { path: string; type: string; registered: number; anonymous: number; total: number };
  type UsageData = { daily: DailyEntry[]; topPaths: PathEntry[]; totals: { registered: number; anonymous: number }; dbSizeBytes: number };
  const [usage, setUsage] = useState<UsageData | null>(null);
  const loadUsage = useCallback(() => {
    fetch("/api/admin/usage").then((r) => r.ok ? r.json() : null).then((d) => d && setUsage(d)).catch((err) => console.error("Failed to load usage:", err));
  }, []);
  useEffect(() => { loadUsage(); }, [loadUsage]);

  // Incidents
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentSource, setIncidentSource] = useState("");
  const [incidentLevel, setIncidentLevel] = useState("");
  const [expandedIncident, setExpandedIncident] = useState<number | null>(null);
  const loadIncidents = useCallback(() => {
    setIncidentsLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (incidentSource) params.set("source", incidentSource);
    if (incidentLevel) params.set("level", incidentLevel);
    fetch(`/api/admin/incidents?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setIncidents(d))
      .catch(() => setIncidents([]))
      .finally(() => setIncidentsLoading(false));
  }, [incidentSource, incidentLevel]);
  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const incidentSources = useMemo(() => [...new Set(incidents.map((i) => i.source))].sort(), [incidents]);

  const selfId = useMemo(
    () => users.find((x) => x.username === me?.username)?.id,
    [users, me]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Admin</h1>

      {/* Registration settings */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-1">Registration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Controls whether new users can create accounts with username/password.
          EVE Vault login is always open.
        </p>
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={registrationOpen ?? false}
            disabled={registrationOpen === null || settingsLoading}
            onClick={() => toggleRegistration(!registrationOpen)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              registrationOpen ? "bg-cyan-600" : "bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                registrationOpen ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-gray-300">
            {registrationOpen === null
              ? "Loading…"
              : registrationOpen
              ? "Open — new users can register"
              : "Closed — registration disabled"}
          </span>
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Usage — last 30 days</h2>
            <p className="text-xs text-gray-500 mt-0.5">Page views and API calls. Admin interactions excluded.</p>
          </div>
          <button onClick={loadUsage} className="btn-sm btn-secondary">↻</button>
        </div>

        {!usage ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-5">
            {/* DB size */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Database size:</span>
              <span className={`text-sm font-mono font-semibold ${
                usage.dbSizeBytes >= DB_DANGER_BYTES
                  ? "text-red-400"
                  : usage.dbSizeBytes >= DB_WARN_BYTES
                  ? "text-yellow-400"
                  : "text-gray-300"
              }`}>
                {formatBytes(usage.dbSizeBytes)}
              </span>
              {usage.dbSizeBytes >= DB_DANGER_BYTES && (
                <span className="badge badge-red text-xs">Warning: DB large</span>
              )}
              {usage.dbSizeBytes >= DB_WARN_BYTES && usage.dbSizeBytes < DB_DANGER_BYTES && (
                <span className="badge badge-amber text-xs">DB growing</span>
              )}
            </div>

            {/* Totals */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">Total events: </span>
                <span className="text-gray-200 font-semibold">{usage.totals.registered + usage.totals.anonymous}</span>
              </div>
              <div>
                <span className="text-gray-500">Registered users: </span>
                <span className="text-cyan-400 font-semibold">{usage.totals.registered}</span>
              </div>
              <div>
                <span className="text-gray-500">Anonymous: </span>
                <span className="text-gray-400 font-semibold">{usage.totals.anonymous}</span>
              </div>
            </div>

            {/* Daily — last 7 days */}
            {usage.daily.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Daily activity (last 7 days)</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4 text-right">Registered</th>
                      <th className="pb-2 pr-4 text-right">Anonymous</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.daily.slice(-7).map((d) => (
                      <tr key={d.date} className="border-b border-gray-800/50">
                        <td className="py-1.5 pr-4 font-mono text-xs text-gray-400">{d.date}</td>
                        <td className="py-1.5 pr-4 text-right text-cyan-400">{d.registered}</td>
                        <td className="py-1.5 pr-4 text-right text-gray-500">{d.anonymous}</td>
                        <td className="py-1.5 text-right text-gray-300 font-semibold">{d.registered + d.anonymous}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top paths */}
            {usage.topPaths.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Top pages & endpoints</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                      <th className="pb-2 pr-4">Path</th>
                      <th className="pb-2 pr-2 text-center">Type</th>
                      <th className="pb-2 pr-4 text-right">Registered</th>
                      <th className="pb-2 pr-4 text-right">Anonymous</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.topPaths.map((p) => (
                      <tr key={p.path} className="border-b border-gray-800/50">
                        <td className="py-1.5 pr-4 font-mono text-xs text-gray-300">{p.path}</td>
                        <td className="py-1.5 pr-2 text-center">
                          <span className={`text-xs ${p.type === "api" ? "text-amber-500" : "text-gray-500"}`}>{p.type}</span>
                        </td>
                        <td className="py-1.5 pr-4 text-right text-cyan-400">{p.registered}</td>
                        <td className="py-1.5 pr-4 text-right text-gray-500">{p.anonymous}</td>
                        <td className="py-1.5 text-right text-gray-300 font-semibold">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {usage.totals.registered + usage.totals.anonymous === 0 && (
              <p className="text-sm text-gray-500">No usage data yet — activity will appear here as users interact with the app.</p>
            )}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Calculation metrics</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 200 requests per endpoint. Resets on server restart. Updates every 10s.</p>
          </div>
          <button onClick={loadMetrics} className="btn-sm btn-secondary">↻</button>
        </div>
        {!metrics || Object.keys(metrics).length === 0 ? (
          <p className="text-sm text-gray-500">No data yet — make a calculation to start tracking.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-2 pr-4">Endpoint</th>
                <th className="pb-2 pr-4 text-right">Total</th>
                <th className="pb-2 pr-4 text-right">Req/min</th>
                <th className="pb-2 pr-4 text-right">Errors</th>
                <th className="pb-2 pr-4 text-right">p50</th>
                <th className="pb-2 text-right">p95</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics).map(([ep, m]) => {
                const p95Warn = m.p95 > 2000;
                const p95Crit = m.p95 > 5000;
                return (
                  <tr key={ep} className="border-b border-gray-800/50">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-300">{ep}</td>
                    <td className="py-2 pr-4 text-right text-gray-400">{m.total}</td>
                    <td className="py-2 pr-4 text-right">
                      <span className={m.rpm > 30 ? "text-yellow-400 font-semibold" : "text-gray-400"}>{m.rpm}</span>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <span className={m.errors > 0 ? "text-red-400 font-semibold" : "text-gray-600"}>{m.errors}</span>
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-400">{m.p50}ms</td>
                    <td className="py-2 text-right">
                      <span className={p95Crit ? "text-red-400 font-semibold" : p95Warn ? "text-yellow-400" : "text-gray-400"}>
                        {m.p95}ms
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Users */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-100">Users</h2>
          {!usersLoading && (
            <span className="text-sm text-gray-500">
              {users.filter((u) => u.role === "USER").length} registered
            </span>
          )}
        </div>

        {userError && (
          <div className="mb-4 rounded border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{userError}</div>
        )}

        {usersLoading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="pb-2 pr-4">Username</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Registered</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = selfId === u.id;
                const isTargetSA = u.role === "SUPERADMIN";
                const isResetting = resetId === u.id;

                // ADMIN cannot touch a SUPERADMIN
                const canTouch = amISuperAdmin || !isTargetSA;

                // Reset password: cannot reset own, cannot touch SA unless actor is SA
                const canReset = !isSelf && canTouch;
                const resetDisabledTitle = !canTouch
                  ? "Only a superadmin can reset a superadmin's password"
                  : isSelf
                  ? "You cannot reset your own password here"
                  : undefined;

                // Delete: ADMIN cannot delete self; SA can delete self if backend allows it
                const canDelete = canTouch && (!isSelf || amISuperAdmin);
                const deleteDisabledTitle = !canTouch
                  ? "Only a superadmin can delete a superadmin"
                  : isSelf && !amISuperAdmin
                  ? "You cannot delete your own account"
                  : undefined;

                return (
                  <Fragment key={u.id}>
                    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 font-medium text-gray-200">
                        {u.username}
                        {isSelf && <span className="ml-2 text-xs text-gray-600">(you)</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`badge ${
                          u.role === "SUPERADMIN"
                            ? "badge-amber"
                            : u.role === "ADMIN"
                            ? "badge-cyan"
                            : "badge-gray"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right space-x-2">
                        <button
                          onClick={() => isResetting ? cancelReset() : openReset(u.id)}
                          title={resetDisabledTitle ?? "Reset password"}
                          disabled={!canReset || (isResetting && !resetPw && !resetError)}
                          className={`btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed ${isResetting ? "text-gray-500" : ""}`}
                        >
                          {isResetting && !resetPw && !resetError ? "Resetting…" : isResetting ? "Cancel" : "Reset password"}
                        </button>

                        {/* Role buttons */}
                        {u.role === "USER" && (
                          <button
                            onClick={() => setRole(u, "ADMIN")}
                            disabled={isSelf}
                            title={isSelf ? "You cannot change your own role" : "Promote to ADMIN"}
                            className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↑ ADMIN
                          </button>
                        )}
                        {u.role === "ADMIN" && (
                          <>
                            <button
                              onClick={() => setRole(u, "USER")}
                              disabled={isSelf}
                              title={isSelf ? "You cannot change your own role" : "Demote to USER"}
                              className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ↓ USER
                            </button>
                            {amISuperAdmin && (
                              <button
                                onClick={() => setRole(u, "SUPERADMIN")}
                                disabled={isSelf}
                                title={isSelf ? "You cannot change your own role" : "Promote to SUPERADMIN"}
                                className="btn-ghost text-xs text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ↑ SA
                              </button>
                            )}
                          </>
                        )}
                        {u.role === "SUPERADMIN" && amISuperAdmin && (
                          <button
                            onClick={() => setRole(u, "ADMIN")}
                            disabled={isSelf}
                            title={isSelf ? "You cannot change your own role" : "Demote to ADMIN"}
                            className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↓ ADMIN
                          </button>
                        )}

                        <button
                          onClick={() => deleteUser(u)}
                          disabled={!canDelete}
                          title={deleteDisabledTitle ?? `Delete ${u.username}`}
                          className="btn-ghost btn-danger text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                    {isResetting && (
                      <tr className="border-b border-gray-800/50 bg-gray-800/20">
                        <td colSpan={4} className="px-2 py-3">
                          {resetError ? (
                            <p className="text-xs text-red-400">{resetError}</p>
                          ) : resetPw ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 shrink-0">
                                New password for <span className="text-gray-200">{u.username}</span>:
                              </span>
                              <code className="flex-1 min-w-0 font-mono text-sm text-cyan-300 bg-gray-950 border border-gray-700 rounded px-2 py-1 truncate select-all">
                                {resetPw}
                              </code>
                              <button
                                onClick={copyPassword}
                                className="btn-ghost text-xs shrink-0"
                                title="Copy to clipboard"
                              >
                                {resetCopied ? "Copied!" : "Copy"}
                              </button>
                              <button onClick={cancelReset} className="btn-ghost text-xs text-gray-500 shrink-0">
                                Done
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Applying…</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Incident log */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Incident log</h2>
            <p className="text-xs text-gray-500 mt-0.5">Errors and warnings from blockchain, GraphQL, and API calls. Last 200.</p>
          </div>
          <button onClick={loadIncidents} className="btn-sm btn-secondary">↻</button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select
            value={incidentLevel}
            onChange={(e) => setIncidentLevel(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="">All levels</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
          </select>
          <select
            value={incidentSource}
            onChange={(e) => setIncidentSource(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="">All sources</option>
            {incidentSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {incidentsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-gray-500">No incidents recorded.</p>
        ) : (
          <div className="divide-y divide-gray-800 text-sm">
            {incidents.map((inc) => {
              const levelColor = inc.level === "error" ? "text-red-400" : inc.level === "warn" ? "text-yellow-400" : "text-blue-400";
              const isExpanded = expandedIncident === inc.id;
              return (
                <div key={inc.id} className="py-2">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 text-xs font-semibold uppercase w-10 ${levelColor}`}>{inc.level}</span>
                    <span className="shrink-0 text-xs text-gray-600 font-mono w-32">{new Date(inc.createdAt).toLocaleString()}</span>
                    <span className="shrink-0 text-xs text-gray-500 w-36 truncate" title={inc.source}>{inc.source}</span>
                    <span className="flex-1 text-gray-200 text-xs truncate" title={inc.message}>{inc.message}</span>
                    {inc.detail && (
                      <button
                        onClick={() => setExpandedIncident(isExpanded ? null : inc.id)}
                        className="shrink-0 text-xs text-gray-600 hover:text-gray-300"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                  {isExpanded && inc.detail && (
                    <pre className="mt-2 ml-14 text-xs text-gray-400 bg-gray-950 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">{inc.detail}</pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
