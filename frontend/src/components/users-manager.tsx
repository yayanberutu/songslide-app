"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { apiRequest } from "@/lib/api-client";
import { Button, EmptyState, Field, InlineError, LoadingState, SelectInput, TextInput } from "@/components/ui";

type User = {
  id: string;
  username: string;
  role: string;
  loginCount: number;
  lastLoginAt: string | null;
  createdAt: string;
};

export function UsersManager() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState({ username: "", password: "", role: "MULTIMEDIA" });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await apiRequest<User[]>("/api/users");
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data tim");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setIsModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat pengguna baru");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    setActionError(null);
    if (user.id === session?.user?.id) {
      setActionError("Anda tidak bisa menghapus akun Anda sendiri.");
      return;
    }
    if (!confirm(`Hapus pengguna ${user.username}?`)) return;

    try {
      await apiRequest(`/api/users/${user.id}`, { method: "DELETE" });
      loadUsers();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus pengguna");
    }
  }

  async function handleRoleChange(user: User, newRole: string) {
    setActionError(null);
    if (user.id === session?.user?.id) {
      setActionError("Anda tidak bisa mengubah role Anda sendiri.");
      return;
    }
    try {
      await apiRequest(`/api/users/${user.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });
      loadUsers();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal mengubah role");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-ink-500">Tim</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">Manajemen Pengguna</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink-700">
            Kelola akun Admin dan relawan Multimedia yang memiliki akses ke SongSlide.
          </p>
        </div>
        <Button variant="primary" onClick={() => {
          setForm({ username: "", password: "", role: "MULTIMEDIA" });
          setIsModalOpen(true);
        }}>
          + Tambah Akun Baru
        </Button>
      </div>

      {actionError && (
        <div className="flex items-center justify-between rounded-md bg-red-50 p-4 ring-1 ring-inset ring-red-500/20">
          <p className="text-sm text-red-800 font-medium">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <InlineError message={error} />

      {loading ? (
        <LoadingState label="Memuat data..." />
      ) : users.length === 0 ? (
        <EmptyState title="Tidak ada data" description="Belum ada anggota tim terdaftar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-normal text-ink-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Aktivitas Login</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-semibold text-ink-900">
                    {u.username} {u.id === session?.user?.id && <span className="ml-2 text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">(Anda)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === session?.user?.id}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm bg-white"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MULTIMEDIA">MULTIMEDIA</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {u.loginCount} kali {u.lastLoginAt ? `(Terakhir: ${new Date(u.lastLoginAt).toLocaleDateString()})` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={u.id === session?.user?.id}
                      className="font-medium text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-ink-950">Tambah Akun Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InlineError message={formError} />
          <Field label="Username">
            <TextInput
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="operator_minggu"
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimal 6 karakter"
            />
          </Field>
          <Field label="Role Akses">
            <SelectInput
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="MULTIMEDIA">Multimedia (Hanya bisa export)</option>
              <option value="ADMIN">Admin (Bisa edit lagu & tambah user)</option>
            </SelectInput>
          </Field>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Menyimpan..." : "Buat Akun"}
            </Button>
          </div>
        </form>
          </div>
        </div>
      )}
    </section>
  );
}
