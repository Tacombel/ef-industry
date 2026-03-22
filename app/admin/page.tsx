"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user: me } = useSession();

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");

  // Renormalize
  const [renormalizing, setRenormalizing] = useState(false);
  const [renormalizeResult, setRenormalizeResult] = useState<{ total: { renamed: number; duplicatesRemoved: number } } | null>(null);
  const [renormalizeError, setRenormalizeError] = useState("");

  async function loadUsers() {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setUsersLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleRole(user: User) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
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
    if (!confirm(`Delete user "${user.username}"? This will also delete all their stock and packs.`)) return;
    setUserError("");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      setUserError((await res.json()).error ?? "Error deleting user");
      return;
    }
    await loadUsers();
  }

  async function runRenormalize() {
    setRenormalizing(true);
    setRenormalizeResult(null);
    setRenormalizeError("");
    const res = await fetch("/api/admin/renormalize", { method: "POST" });
    const data = await res.json();
    if (!res.ok || data.error) setRenormalizeError(data.error ?? "Failed");
    else setRenormalizeResult(data);
    setRenormalizing(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Admin</h1>

      {/* Users */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-4">Users</h2>

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
                <th className="pb-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.username ? false : u.username === me?.username;
                const isSelfById = users.find(x => x.username === me?.username)?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 pr-4 font-medium text-gray-200">
                      {u.username}
                      {isSelfById && <span className="ml-2 text-xs text-gray-600">(you)</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`badge ${u.role === "ADMIN" ? "badge-cyan" : "badge-gray"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={() => toggleRole(u)}
                        disabled={isSelfById}
                        title={isSelfById ? "You cannot change your own role" : u.role === "ADMIN" ? "Demote to USER" : "Promote to ADMIN"}
                        className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {u.role === "ADMIN" ? "↓ USER" : "↑ ADMIN"}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        disabled={isSelfById}
                        title={isSelfById ? "You cannot delete your own account" : `Delete ${u.username}`}
                        className="btn-ghost btn-danger text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Fix capitalization */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-1">Fix name capitalization</h2>
        <p className="text-sm text-gray-500 mb-4">
          Re-applies name normalization to all existing records.
          Removes duplicates caused by previous inconsistent capitalization (keeps the correctly-cased version).
        </p>
        <button onClick={runRenormalize} disabled={renormalizing} className="btn-sm btn-primary disabled:opacity-50">
          {renormalizing ? "Fixing…" : "Fix capitalization"}
        </button>
        {renormalizeError && (
          <div className="mt-4 rounded border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{renormalizeError}</div>
        )}
        {renormalizeResult && (
          <div className="mt-4 rounded border border-green-800 bg-green-900/20 px-4 py-3 text-sm">
            <p className="font-medium text-green-400">Done</p>
            <p className="text-xs text-gray-400 mt-1">{renormalizeResult.total.renamed} renamed · {renormalizeResult.total.duplicatesRemoved} duplicates removed</p>
          </div>
        )}
      </div>
    </div>
  );
}
