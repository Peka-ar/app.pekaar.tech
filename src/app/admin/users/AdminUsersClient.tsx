"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Box, File, Activity, UserCheck } from 'lucide-react';
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminGetUsers, adminGetUser, adminUpdateUser, adminSetUserStatus, adminDeleteUser } from "@/app/actions/admin-users";
import { Role, UserStatus } from "@/lib/enums";
import { formatDistanceToNow } from "date-fns";

type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  usageLimits: number | null;
  subscriptionTier: string | null;
  createdAt: Date | string;
  onboarded: boolean;
};

type RecentProject = {
  id: string;
  name: string;
  status: string;
  createdAt: Date | string;
};

type DetailedUser = UserListItem & {
  statusReason: string | null;
  suspendedAt: Date | string | null;
  projectCount: number;
  assetCount: number;
  eventCount: number;
  recentProjects: RecentProject[];
};

export function AdminUsersClient() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<DetailedUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newRole, setNewRole] = useState('');
  const [newUsageLimits, setNewUsageLimits] = useState('');
  const [newSubscriptionTier, setNewSubscriptionTier] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) setIsLoading(true); });
    adminGetUsers(
      search || undefined,
      roleFilter ? (roleFilter as Role) : undefined,
      statusFilter ? (statusFilter as UserStatus) : undefined,
      page,
    ).then((result) => {
      if (cancelled) return;
      setUsers(result.users as UserListItem[]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setIsLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [search, roleFilter, statusFilter, page]);

  const openUserDetail = async (id: string) => {
    setIsDetailOpen(true);
    setActionError(null);
    setSelectedUser(null);
    try {
      const result = await adminGetUser(id);
      const user = result.user as unknown as DetailedUser;
      setSelectedUser(user);
      setNewRole(user.role);
      setNewUsageLimits(user.usageLimits?.toString() ?? '');
      setNewSubscriptionTier(user.subscriptionTier ?? '');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load user details');
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedUser(null);
    setActionError(null);
  };

  const refreshUsers = () => {
    adminGetUsers(
      search || undefined,
      roleFilter ? (roleFilter as Role) : undefined,
      statusFilter ? (statusFilter as UserStatus) : undefined,
      page,
    ).then((result) => {
      setUsers(result.users as UserListItem[]);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    });
  };

  const fetchDetail = async (userId: string) => {
    try {
      const result = await adminGetUser(userId);
      const user = result.user as unknown as DetailedUser;
      setSelectedUser(user);
      setNewRole(user.role);
      setNewUsageLimits(user.usageLimits?.toString() ?? '');
      setNewSubscriptionTier(user.subscriptionTier ?? '');
    } catch {
      closeDetail();
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    setActionError(null);
    const result = await adminUpdateUser(selectedUser.id, { role: newRole as Role });
    if (result.ok) {
      await fetchDetail(selectedUser.id);
      refreshUsers();
    } else {
      setActionError(result.message);
    }
  };

  const handleUpdateUsageLimits = async () => {
    if (!selectedUser || newUsageLimits === '') return;
    setActionError(null);
    const result = await adminUpdateUser(selectedUser.id, { usageLimits: Number(newUsageLimits) });
    if (result.ok) {
      await fetchDetail(selectedUser.id);
      refreshUsers();
    } else {
      setActionError(result.message);
    }
  };

  const handleUpdateSubscriptionTier = async () => {
    if (!selectedUser) return;
    setActionError(null);
    const result = await adminUpdateUser(selectedUser.id, { subscriptionTier: newSubscriptionTier });
    if (result.ok) {
      await fetchDetail(selectedUser.id);
      refreshUsers();
    } else {
      setActionError(result.message);
    }
  };

  const handleSetUserStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    if (newStatus === 'SUSPENDED') {
      const reason = window.prompt('Reason for suspension:');
      if (reason === null) return;
      setActionError(null);
      const result = await adminSetUserStatus(selectedUser.id, newStatus as UserStatus, reason || undefined);
      if (result.ok) {
        await fetchDetail(selectedUser.id);
        refreshUsers();
      } else {
        setActionError(result.message);
      }
    } else {
      if (!window.confirm('Activate this user?')) return;
      setActionError(null);
      const result = await adminSetUserStatus(selectedUser.id, newStatus as UserStatus);
      if (result.ok) {
        await fetchDetail(selectedUser.id);
        refreshUsers();
      } else {
        setActionError(result.message);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const confirmed = window.confirm(
      `Permanently delete "${selectedUser.email}"? This will remove all associated projects, assets, and data. This cannot be undone.`,
    );
    if (!confirmed) return;
    setActionError(null);
    const result = await adminDeleteUser(selectedUser.id);
    if (result.ok) {
      closeDetail();
      refreshUsers();
    } else {
      setActionError(result.message);
    }
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const statusTone = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success' as const;
      case 'SUSPENDED': return 'danger' as const;
      default: return 'neutral' as const;
    }
  };

  const roleTone = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'info' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input
          leftIcon={<Search className="w-4 h-4" />}
          type="text"
          placeholder="Search by name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={roleFilter}
          onChange={handleRoleFilterChange}
          className="w-full sm:w-40"
        >
          <option value="">All Roles</option>
          <option value="BRAND">BRAND</option>
          <option value="ADMIN">ADMIN</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="w-full sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </Select>
        <div className="text-sm text-[var(--color-text-muted)] ml-auto hidden sm:block">
          {total} user{total !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Email</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Name</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Role</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Status</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Created</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Usage Limits</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableEmptyState colSpan={6} message="No users found matching your filters." />
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => openUserDetail(user.id)}
                >
                  <TableCell>
                    <span className="font-medium text-[var(--color-text-primary)]">{user.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[var(--color-text-secondary)]">{user.name ?? '\u2014'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={statusTone(user.status)}>{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[var(--color-text-secondary)] text-sm">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                      {user.usageLimits ?? '\u2014'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border-default)]">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="text-xs text-[var(--color-text-muted)]">
              Page {page} of {totalPages} — {total} total
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isDetailOpen}
        onClose={closeDetail}
        title={selectedUser?.email ?? 'User Details'}
        size="md"
      >
        {selectedUser ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedUser.email}</h3>
                <Badge tone={statusTone(selectedUser.status)}>{selectedUser.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono">Name</span>
                  <p className="text-[var(--color-text-primary)] font-medium">{selectedUser.name ?? '\u2014'}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono">Role</span>
                  <p><Badge tone={roleTone(selectedUser.role)}>{selectedUser.role}</Badge></p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono">Created</span>
                  <p className="text-[var(--color-text-primary)]">{formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono">Onboarded</span>
                  <p className="text-[var(--color-text-primary)]">{selectedUser.onboarded ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {selectedUser.status === 'SUSPENDED' && selectedUser.statusReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-red-700">Suspension reason</span>
                  <p className="text-sm text-red-700 mt-1">{selectedUser.statusReason}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Projects', value: selectedUser.projectCount, icon: Box },
                { label: 'Assets', value: selectedUser.assetCount, icon: File },
                { label: 'Events', value: selectedUser.eventCount, icon: Activity },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} variant="muted">
                    <CardBody className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)]">{stat.label}</div>
                        <div className="text-lg font-serif italic text-[var(--color-text-primary)]">{stat.value}</div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            <div>
              <h4 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-3">Recent Projects</h4>
              {selectedUser.recentProjects.length > 0 ? (
                <div className="space-y-2">
                  {selectedUser.recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-canvas-secondary)]">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{project.name}</span>
                      <div className="flex items-center gap-3">
                        <Badge tone="neutral">{project.status}</Badge>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">No projects yet.</p>
              )}
            </div>

            {actionError && (
              <div className="text-sm text-red-600" role="alert">
                {actionError}
              </div>
            )}

            <Card>
              <CardHeader>
                <h4 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Actions</h4>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] mb-1 block">Role</label>
                    <Select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="BRAND">BRAND</option>
                      <option value="ADMIN">ADMIN</option>
                    </Select>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleUpdateRole}>Update</Button>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] mb-1 block">Usage Limits</label>
                    <Input
                      type="number"
                      value={newUsageLimits}
                      onChange={(e) => setNewUsageLimits(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleUpdateUsageLimits}>Update</Button>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] mb-1 block">Subscription Tier</label>
                    <Input
                      type="text"
                      value={newSubscriptionTier}
                      onChange={(e) => setNewSubscriptionTier(e.target.value)}
                      placeholder="e.g. pro"
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleUpdateSubscriptionTier}>Update</Button>
                </div>
              </CardBody>
              <CardFooter className="flex items-center gap-3">
                {selectedUser.status === 'SUSPENDED' ? (
                  <Button variant="primary" size="sm" onClick={handleSetUserStatus}>
                    <UserCheck className="w-4 h-4" />
                    Activate User
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={handleSetUserStatus}>
                    Suspend User
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleDeleteUser}>
                  Delete User
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <div className="py-12 text-center text-[var(--color-text-muted)]">
            {actionError ? (
              <p>{actionError}</p>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
