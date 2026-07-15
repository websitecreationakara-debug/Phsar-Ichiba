import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { Modal } from "@/components/admin/modal";
import { Ban, Check, KeyRound, MailCheck, MailX, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users")({ component: UsersAdmin });

const inputCls =
  "w-full rounded-lg border border-leaf-200 px-3 py-2 text-sm text-ink outline-none focus:border-leaf-500";
const labelCls = "mb-1 block text-sm font-medium text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}
function BtnPrimary({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-leaf-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-700 disabled:opacity-60",
        className,
      )}
    />
  );
}
function BtnOutline({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-leaf-200 px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-leaf-50 disabled:opacity-60",
        className,
      )}
    />
  );
}
function BtnIcon({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-leaf-50 disabled:opacity-30",
        className,
      )}
    />
  );
}

type AdminUser = {
  id: string;
  name: string;
  email: string;
  userNumber?: string | null;
  role?: string | null;
  banned?: boolean | null;
  emailVerified?: boolean | null;
  createdAt: string | Date;
};

function UsersAdmin() {
  const qc = useQueryClient();
  const { user: me } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [pwTarget, setPwTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: { limit: 200, sortBy: "createdAt", sortDirection: "desc" },
      });
      if (res.error) throw new Error(res.error.message ?? "Failed to load users");
      return (res.data?.users ?? []) as AdminUser[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const query = search.trim().toLowerCase();
  const filteredUsers = users
    .filter((u) => roleFilter === "all" || (u.role ?? "user") === roleFilter)
    .filter(
      (u) =>
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.userNumber?.toLowerCase().includes(query),
    );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isFiltered = roleFilter !== "all" || query !== "";

  const setRoleFilterAndResetPage = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };
  const setSearchAndResetPage = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeRole = async (userId: string, role: string) => {
    const res = await authClient.admin.setRole({ userId, role: role as "user" | "admin" });
    if (res.error) return toast.error(res.error.message ?? "Failed to change role");
    toast.success("Role updated");
    refresh();
  };

  const toggleBan = async (u: AdminUser) => {
    const res = u.banned
      ? await authClient.admin.unbanUser({ userId: u.id })
      : await authClient.admin.banUser({ userId: u.id });
    if (res.error) return toast.error(res.error.message ?? "Failed to update");
    toast.success(u.banned ? "User unbanned" : "User banned");
    refresh();
  };

  const toggleVerified = async (u: AdminUser) => {
    const res = await authClient.admin.updateUser({ userId: u.id, data: { emailVerified: !u.emailVerified } });
    if (res.error) return toast.error(res.error.message ?? "Failed to update");
    toast.success(u.emailVerified ? "Marked unverified" : "Email verified");
    refresh();
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    const res = await authClient.admin.removeUser({ userId: u.id });
    if (res.error) return toast.error(res.error.message ?? "Failed to delete");
    toast.success("User deleted");
    refresh();
  };

  const createUser = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      return toast.error("Name and email are required.");
    }
    if (addForm.password.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    setBusy(true);
    const res = await authClient.admin.createUser({
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      password: addForm.password,
      role: addForm.role as "user" | "admin",
      // Admin-created accounts skip the email-verification gate so they can sign in right away.
      data: { emailVerified: true },
    });
    setBusy(false);
    if (res.error) return toast.error(res.error.message ?? "Failed to create user");
    toast.success(`Created ${addForm.email}`);
    setAddOpen(false);
    setAddForm({ name: "", email: "", password: "", role: "user" });
    refresh();
  };

  const setPassword = async () => {
    if (!pwTarget) return;
    if (newPassword.length < 8) {
      return toast.error("Password must be at least 8 characters.");
    }
    setBusy(true);
    const res = await authClient.admin.setUserPassword({ userId: pwTarget.id, newPassword });
    if (res.error) {
      setBusy(false);
      return toast.error(res.error.message ?? "Failed to set password");
    }
    // A reset is useless if the account is still gated behind verification — un-gate it.
    if (!pwTarget.emailVerified) {
      await authClient.admin.updateUser({ userId: pwTarget.id, data: { emailVerified: true } });
    }
    setBusy(false);
    toast.success(`Password updated for ${pwTarget.email}`);
    setPwTarget(null);
    setNewPassword("");
    refresh();
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Users</h1>
          <p className="mt-1 text-ink-soft">
            {isFiltered ? `${filteredUsers.length} of ${users.length}` : `${users.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearchAndResetPage(e.target.value)}
              placeholder="Search name, email, or ID"
              className={cn(inputCls, "h-9 w-60 py-1 pl-9")}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilterAndResetPage(e.target.value)}
            className={cn(inputCls, "h-9 w-36 py-1")}
          >
            <option value="all">All roles</option>
            <option value="user">User</option>
            <option value="sales">Sales</option>
            <option value="marketing">Marketing</option>
            <option value="admin">Admin</option>
          </select>
          <BtnPrimary onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add user
          </BtnPrimary>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-leaf-50 text-xs uppercase tracking-widest text-ink-soft">
            <tr>
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">User ID</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => {
              const isSelf = u.id === me?.id;
              return (
                <tr key={u.id} className="border-t border-leaf-100">
                  <td className="px-6 py-3">
                    <div className="font-medium text-ink">{u.name || "—"}</div>
                    <div className="text-xs text-ink-soft">{u.email}</div>
                  </td>
                  <td className="px-6 py-3 text-ink">{u.userNumber || "—"}</td>
                  <td className="px-6 py-3">
                    <select
                      value={u.role ?? "user"}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={isSelf}
                      className={cn(inputCls, "h-8 w-32 py-1 text-xs")}
                    >
                      <option value="user">User</option>
                      <option value="sales">Sales</option>
                      <option value="marketing">Marketing</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-bold uppercase",
                          u.banned ? "bg-tomato-100 text-tomato-700" : "bg-leaf-50 text-ink-soft",
                        )}
                      >
                        {u.banned ? "Banned" : "Active"}
                      </span>
                      {!u.emailVerified && (
                        <span className="rounded bg-carrot-100 px-2 py-0.5 text-xs font-bold uppercase text-carrot-700">
                          Unverified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-ink">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <BtnIcon title={u.emailVerified ? "Mark unverified" : "Verify email"} onClick={() => toggleVerified(u)}>
                        {u.emailVerified ? <MailX className="h-4 w-4" /> : <MailCheck className="h-4 w-4 text-leaf-600" />}
                      </BtnIcon>
                      <BtnIcon
                        title="Set password"
                        onClick={() => {
                          setPwTarget(u);
                          setNewPassword("");
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </BtnIcon>
                      <BtnIcon title={u.banned ? "Unban" : "Ban"} onClick={() => toggleBan(u)} disabled={isSelf}>
                        {u.banned ? <Check className="h-4 w-4 text-leaf-600" /> : <Ban className="h-4 w-4" />}
                      </BtnIcon>
                      <BtnIcon title="Delete" onClick={() => remove(u)} disabled={isSelf}>
                        <Trash2 className="h-4 w-4 text-tomato-600" />
                      </BtnIcon>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-ink-soft">
                  {users.length === 0 ? "No users yet" : "No users match your search"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <BtnOutline onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              Previous
            </BtnOutline>
            <BtnOutline onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Next
            </BtnOutline>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add user">
        <p className="-mt-2 mb-4 text-sm text-ink-soft">
          Creates a verified account that can sign in immediately with this password.
        </p>
        <div className="space-y-4">
          <Field label="Full name">
            <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Password">
            <input
              type="text"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={addForm.password}
              onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Role">
            <select value={addForm.role} onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
              <option value="user">User</option>
              <option value="sales">Sales</option>
              <option value="marketing">Marketing</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <BtnOutline onClick={() => setAddOpen(false)} disabled={busy}>
            Cancel
          </BtnOutline>
          <BtnPrimary onClick={createUser} disabled={busy}>
            {busy ? "Creating..." : "Create user"}
          </BtnPrimary>
        </div>
      </Modal>

      <Modal open={!!pwTarget} onClose={() => setPwTarget(null)} title="Set password">
        <p className="-mt-2 mb-4 text-sm text-ink-soft">
          Set a new password for {pwTarget?.email}. They can sign in with it right away.
        </p>
        <Field label="New password">
          <input
            type="text"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="mt-6 flex justify-end gap-2">
          <BtnOutline onClick={() => setPwTarget(null)} disabled={busy}>
            Cancel
          </BtnOutline>
          <BtnPrimary onClick={setPassword} disabled={busy}>
            {busy ? "Saving..." : "Set password"}
          </BtnPrimary>
        </div>
      </Modal>
    </div>
  );
}
