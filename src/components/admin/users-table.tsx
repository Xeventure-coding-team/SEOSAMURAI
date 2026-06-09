'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    Search,
    Users,
    UserCheck,
    UserX,
    EyeOff,
    Mail,
    Shield,
    ShieldOff,
    MoreHorizontal,
    Eye,
    Download,
    RefreshCw,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Calendar,
    Activity,
    SlidersHorizontal,
    FileText,
    FileSpreadsheet,
    X,
    Copy,
    User,
    UserIcon,
    KeyRound,
    ShieldAlert,
    Check,
    HelpCircle,
    AlertCircle,
    Key,
    Fingerprint,
    Chrome,
} from 'lucide-react';
import { UsersCharts } from './users-charts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
    id: string;
    display_name: string;
    primary_email: string;
    primary_email_verified: boolean;
    primary_email_auth_enabled: boolean;
    signed_up_at_millis: number;
    last_active_at_millis: number;
    is_anonymous: boolean;
    is_restricted: boolean;
    restricted_by_admin: boolean;
    restricted_by_admin_reason?: string | null;
    restricted_by_admin_private_details?: string | null;
    has_password: boolean;
    auth_with_email: boolean;
    otp_auth_enabled: boolean;
    passkey_auth_enabled: boolean;
    oauth_providers: Array<{ id: string }>;
    profile_image_url?: string | null;
    country_code?: string | null;
    risk_scores?: {
        sign_up?: { bot?: number; free_trial_abuse?: number };
    } | null;
}

interface PaginatedResponse {
    items: User[];
    pagination: { next_cursor?: string };
}

type OrderByField = 'signed_up_at' | 'last_active_at';
type SortDirection = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(millis: number) {
    return new Date(millis).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

function fmtDateFull(millis: number) {
    return new Date(millis).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function toCSV(users: User[]): string {
    const headers = ['ID', 'Name', 'Email', 'Email Verified', 'Signed Up', 'Last Active', 'Anonymous', 'Restricted'];
    const rows = users.map((u) => [
        u.id,
        u.display_name,
        u.primary_email,
        u.primary_email_verified,
        fmtDate(u.signed_up_at_millis),
        fmtDate(u.last_active_at_millis),
        u.is_anonymous,
        u.is_restricted,
    ]);
    return [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// Simple Excel (XLSX-compatible TSV wrapped in XML)
function toExcel(users: User[]): string {
    const headers = ['ID', 'Name', 'Email', 'Email Verified', 'Signed Up', 'Last Active', 'Anonymous', 'Restricted'];
    const rows = users.map((u) => [
        u.id, u.display_name, u.primary_email,
        u.primary_email_verified ? 'Yes' : 'No',
        fmtDate(u.signed_up_at_millis),
        fmtDate(u.last_active_at_millis),
        u.is_anonymous ? 'Yes' : 'No',
        u.is_restricted ? 'Yes' : 'No',
    ]);

    const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Users">
    <Table>
      ${[headers, ...rows].map((row) =>
        `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('')}</Row>`
    ).join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;
    return xml;
}

// ─── User detail modal ────────────────────────────────────────────────────────
function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = async (text: string, fieldName: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const authMethods = [
        user.has_password && 'Password',
        user.auth_with_email && 'Email link',
        user.otp_auth_enabled && 'OTP',
        user.passkey_auth_enabled && 'Passkey',
        ...(user.oauth_providers ?? []).map((p) => p.id),
    ].filter(Boolean);

    const authMethodsText = authMethods.length ? authMethods.join(' · ') : '—';

    const isBanned = user.restricted_by_admin;
    const isAnonymous = user.is_anonymous;
    const isActive = !isBanned && !isAnonymous;

    const sections = [
        {
            title: 'Account',
            icon: UserIcon,
            fields: [
                {
                    label: 'User ID',
                    value: user.id,
                    mono: true,
                    copyable: true,
                    key: 'user_id',
                },
                { label: 'Display name', value: user.display_name || '—' },
                { label: 'Country', value: user.country_code || '—' },
            ],
        },
        {
            title: 'Email',
            icon: Mail,
            fields: [
                {
                    label: 'Address',
                    value: user.primary_email || '—',
                    copyable: !!user.primary_email,
                    key: 'email',
                },
                {
                    label: 'Verification',
                    value: user.primary_email_verified ? 'Verified' : 'Unverified',
                    badge: user.primary_email_verified ? 'success' : 'warning',
                },
            ],
        },
        {
            title: 'Security',
            icon: Shield,
            fields: [
                {
                    label: 'Auth methods',
                    value: authMethodsText,
                    multiValue: authMethods.length > 1,
                },
                {
                    label: 'Account type',
                    value: isAnonymous ? 'Anonymous' : 'Registered',
                    badge: isAnonymous ? 'warning' : 'success',
                },
            ],
        },
        {
            title: 'Timeline',
            icon: Calendar,
            fields: [
                {
                    label: 'Signed up',
                    value: fmtDateFull(user.signed_up_at_millis),
                    icon: Calendar,
                },
                {
                    label: 'Last active',
                    value: fmtDateFull(user.last_active_at_millis),
                    icon: Activity,
                },
                ...(user.risk_scores?.sign_up?.bot !== undefined && user.risk_scores.sign_up.bot > 0
                    ? [
                        {
                            label: 'Risk score',
                            value: `${Math.round((user.risk_scores.sign_up.bot || 0) * 100)}%`,
                            badge: (user.risk_scores.sign_up.bot || 0) > 0.5 ? 'danger' : (user.risk_scores.sign_up.bot || 0) > 0.2 ? 'warning' : 'muted',
                            tooltip: 'Likelihood of being a bot based on sign-up behavior',
                        },
                    ]
                    : []),
            ],
        },
        // Restriction section - only shown when applicable
        ...(isBanned
            ? [
                {
                    title: 'Restriction',
                    icon: ShieldAlert,
                    accent: true,
                    fields: [
                        {
                            label: 'Status',
                            value: 'Banned',
                            badge: 'danger',
                        },
                        {
                            label: 'Reason',
                            value: user.restricted_by_admin_reason || 'No reason provided',
                        },
                        ...(user.restricted_by_admin_private_details
                            ? [
                                {
                                    label: 'Private note',
                                    value: user.restricted_by_admin_private_details,
                                    mono: true,
                                },
                            ]
                            : []),
                    ],
                },
            ]
            : []),
    ];

    type BadgeType = 'success' | 'danger' | 'warning' | 'muted';

    const badgeClass: Record<BadgeType, string> = {
        success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        muted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-xl">

                {/* Header - minimized */}
                <div className="relative px-6 pt-5 pb-3 border-b">
                    <div className="flex items-center gap-3">
                        {/* Avatar - smaller */}
                        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
                            {user.profile_image_url && <AvatarImage src={user.profile_image_url} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                {initials(user.display_name)}
                            </AvatarFallback>
                        </Avatar>

                        {/* User info - condensed */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <DialogTitle className="text-base font-semibold truncate">
                                    {user.display_name}
                                </DialogTitle>
                                {/* Status badge - smaller */}
                                {isBanned ? (
                                    <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-1 px-1.5 py-0">
                                        <UserX className="h-2.5 w-2.5" /> Banned
                                    </Badge>
                                ) : isAnonymous ? (
                                    <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1 px-1.5 py-0">
                                        <EyeOff className="h-2.5 w-2.5" /> Anon
                                    </Badge>
                                ) : (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-1 px-1.5 py-0">
                                        <UserCheck className="h-2.5 w-2.5" /> Active
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                                {user.primary_email || 'No email'}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Content sections */}
                <div className="px-6 py-4 max-h-[55vh] overflow-y-auto">
                    <div className="space-y-5">
                        {sections.map((section) => (
                            <div key={section.title}>
                                {/* Section header */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1 rounded-md ${section.accent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-muted/50'}`}>
                                        <section.icon className={`h-3.5 w-3.5 ${section.accent ? 'text-red-600' : 'text-muted-foreground'}`} />
                                    </div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {section.title}
                                    </h3>
                                    <div className="flex-1 h-px bg-border" />
                                </div>

                                {/* Fields grid */}
                                <div className="rounded-lg border bg-card overflow-hidden">
                                    {section.fields.map((field, i) => (
                                        <div
                                            key={field.label}
                                            className={`
                        flex items-center justify-between gap-4 px-4 py-2.5
                        ${i !== section.fields.length - 1 ? 'border-b' : ''}
                        ${section.accent ? 'hover:bg-red-50/30 dark:hover:bg-red-900/10' : 'hover:bg-muted/20'}
                        transition-colors duration-150
                      `}
                                        >
                                            {/* Label with optional tooltip */}
                                            <div className="flex items-center gap-1.5">
                                                {field.icon && <field.icon className="h-3 w-3 text-muted-foreground/60" />}
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {field.label}
                                                </span>
                                                {field.tooltip && (
                                                    <div className="group relative">
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                                                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10">
                                                            <div className="bg-popover text-popover-foreground text-[11px] rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                                                                {field.tooltip}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Value */}
                                            <div className="flex items-center gap-2 text-right max-w-[60%]">
                                                {field.badge ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs border-0 font-normal px-2 py-0.5 ${badgeClass[field.badge as BadgeType]}`}
                                                    >
                                                        {field.value}
                                                    </Badge>
                                                ) : field.multiValue ? (
                                                    <div className="flex flex-wrap gap-1 justify-end">
                                                        {authMethods.map((method) => (
                                                            <span key={method} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                                {method}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className={`
                            text-sm leading-relaxed break-all
                            ${field.mono ? 'font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded' : ''}
                          `}>
                                                        {field.value}
                                                    </span>
                                                )}

                                                {/* Copy button */}
                                                {field.copyable && typeof field.value === 'string' && field.value !== '—' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground transition-all"
                                                        onClick={() => copyToClipboard(field.value, field.key || field.label)}
                                                    >
                                                        {copiedField === (field.key || field.label) ? (
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer with actions */}
                <div className="border-t px-6 py-3.5 flex justify-between items-center bg-muted/10">
                    <Button size="sm" variant="outline" onClick={onClose} className="h-8 px-4">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─── Ban modal ────────────────────────────────────────────────────────────────

function BanModal({
    user,
    onClose,
    onSuccess,
}: {
    user: User;
    onClose: () => void;
    onSuccess: (userId: string, restricted: boolean) => void;
}) {
    const isBanning = !user.restricted_by_admin;
    const [reason, setReason] = useState('');
    const [privateNote, setPrivateNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setLoading(true);
        setError(null);
        try {
            const body = isBanning
                ? {
                    restricted_by_admin: true,
                    ...(reason && { restricted_by_admin_reason: reason }),
                    ...(privateNote && { restricted_by_admin_private_details: privateNote }),
                }
                : { restricted_by_admin: false };

            const res = await fetch('/api/admin/users/ban-user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    restricted_by_admin: isBanning,
                    ...(isBanning && reason && { reason }),
                    ...(isBanning && privateNote && { restricted_by_admin_private_details: privateNote }),
                }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error ?? `Request failed (${res.status})`);
            }

            onSuccess(user.id, isBanning);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isBanning ? 'Ban user' : 'Unban user'}</DialogTitle>
                    <DialogDescription>
                        {isBanning
                            ? `${user.display_name} will be restricted and treated as unauthenticated.`
                            : `${user.display_name} will regain normal access.`}
                    </DialogDescription>
                </DialogHeader>

                {isBanning && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="reason" className="text-sm">
                                Reason <span className="text-muted-foreground">(shown to user, optional)</span>
                            </Label>
                            <Textarea
                                id="reason"
                                placeholder="e.g. Violation of terms of service"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="note" className="text-sm">
                                Private note <span className="text-muted-foreground">(admin only, optional)</span>
                            </Label>
                            <Textarea
                                id="note"
                                placeholder="Internal notes..."
                                value={privateNote}
                                onChange={(e) => setPrivateNote(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <DialogFooter className="gap-2">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        variant={isBanning ? 'destructive' : 'default'}
                        onClick={submit}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        {isBanning ? 'Ban user' : 'Unban user'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UsersTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [orderBy, setOrderBy] = useState<OrderByField>('signed_up_at');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [showAnonymous, setShowAnonymous] = useState(true);
    const [showRestricted, setShowRestricted] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Modals
    const [viewUser, setViewUser] = useState<User | null>(null);
    const [banUser, setBanUser] = useState<User | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchUsers = useCallback(async (reset = false, isRefresh = false) => {
        if (reset || isRefresh) {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
        } else {
            setLoadingMore(true);
        }

        try {
            const params = new URLSearchParams();
            params.set('limit', '25');
            params.set('order_by', orderBy);
            params.set('desc', String(sortDir === 'desc'));
            if (debouncedSearch) params.set('query', debouncedSearch);
            if (!reset && !isRefresh && nextCursor) params.set('cursor', nextCursor);
            if (!showAnonymous) params.set('include_anonymous', 'false');
            if (!showRestricted) params.set('include_restricted', 'false');

            const res = await fetch(`/api/admin/users?${params}`);
            if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);

            const data: PaginatedResponse = await res.json();

            setUsers((prev) => (reset || isRefresh ? data.items : [...prev, ...data.items]));
            setNextCursor(data.pagination?.next_cursor ?? null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, orderBy, sortDir, showAnonymous, showRestricted, nextCursor]);

    // Refetch when filters change
    useEffect(() => { fetchUsers(true); }, [debouncedSearch, orderBy, sortDir, showAnonymous, showRestricted]); // eslint-disable-line

    const stats = useMemo(() => ({
        total: users.length,
        active: users.filter((u) => !u.is_anonymous && !u.is_restricted).length,
        restricted: users.filter((u) => u.is_restricted).length,
        anonymous: users.filter((u) => u.is_anonymous).length,
    }), [users]);

    function handleBanSuccess(userId: string, restricted: boolean) {
        setUsers((prev) =>
            prev.map((u) =>
                u.id === userId ? { ...u, is_restricted: restricted, restricted_by_admin: restricted } : u
            )
        );
    }

    function exportCSV() {
        downloadFile(toCSV(users), `users-${Date.now()}.csv`, 'text/csv');
    }

    function exportExcel() {
        downloadFile(toExcel(users), `users-${Date.now()}.xls`, 'application/vnd.ms-excel');
    }

    // ─── Error state ────────────────────────────────────────────────────────────

    if (error && users.length === 0) {
        return (
            <Card className="shadow-none border">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <XCircle className="h-8 w-8 text-destructive mb-3" />
                    <p className="font-medium text-sm">Failed to load users</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
                    <Button size="sm" variant="outline" onClick={() => fetchUsers(true)}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Try again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // ─── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            {/* Modals */}
            {viewUser && <UserDetailModal user={viewUser} onClose={() => setViewUser(null)} />}
            {banUser && (
                <BanModal
                    user={banUser}
                    onClose={() => setBanUser(null)}
                    onSuccess={handleBanSuccess}
                />
            )}

            <div className="space-y-4">


                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        {
                            label: "Total",
                            value: stats.total,
                            icon: Users,
                            iconBg: "bg-blue-100 dark:bg-blue-500/10",
                            iconColor: "text-blue-600",
                        },
                        {
                            label: "Active",
                            value: stats.active,
                            icon: UserCheck,
                            iconBg: "bg-green-100 dark:bg-green-500/10",
                            iconColor: "text-green-600",
                        },
                        {
                            label: "Restricted",
                            value: stats.restricted,
                            icon: UserX,
                            iconBg: "bg-red-100 dark:bg-red-500/10",
                            iconColor: "text-red-600",
                        },
                        {
                            label: "Anonymous",
                            value: stats.anonymous,
                            icon: EyeOff,
                            iconBg: "bg-orange-100 dark:bg-orange-500/10",
                            iconColor: "text-orange-600",
                        },
                    ].map(({ label, value, icon: Icon, iconBg, iconColor }) => (
                        <Card
                            key={label}
                            className="border bg-background shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                        >
                            <CardContent>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{label}</p>
                                        <h3 className="mt-2 text-3xl font-bold tracking-tight">
                                            {value.toLocaleString()}
                                        </h3>
                                    </div>

                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                                    >
                                        <Icon className={`h-5 w-5 ${iconColor}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Table card */}
                <Card className="shadow-sm border bg-card overflow-hidden p-0 gap-0">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 sm:px-6 py-3 border-b bg-muted/5">
                        {/* Search */}
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-sm bg-background"
                            />
                        </div>

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                            {/* Filters toggle */}
                            <Button
                                variant={showFilters ? "secondary" : "outline"}
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => setShowFilters((v) => !v)}
                            >
                                <SlidersHorizontal className="h-3 w-3" />
                                Filters
                                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                            </Button>

                            {/* Refresh */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => fetchUsers(true, true)}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>

                            {/* Export */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                        <Download className="h-3.5 w-3.5" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                        onClick={exportCSV}
                                        className="text-sm cursor-pointer gap-2.5 py-1.5"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        CSV (.csv)
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={exportExcel}
                                        className="text-sm cursor-pointer gap-2.5 py-1.5"
                                    >
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        Excel (.xlsx)
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={exportCSV}
                                        className="text-xs cursor-pointer gap-2.5 py-1.5 text-muted-foreground"
                                    >
                                        <Download className="h-3 w-3" />
                                        Export current view
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </div>

                    {/* Filter bar */}
                    {showFilters && (
                        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2.5 border-b bg-muted/20">
                            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as OrderByField)}>
                                <SelectTrigger className="h-7 w-40 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="signed_up_at">Sign-up date</SelectItem>
                                    <SelectItem value="last_active_at">Last active</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDirection)}>
                                <SelectTrigger className="h-7 w-36 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="desc">Newest first</SelectItem>
                                    <SelectItem value="asc">Oldest first</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="h-5 w-px bg-border hidden sm:block" />

                            <Button
                                variant={showAnonymous ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => setShowAnonymous((v) => !v)}
                            >
                                <Eye className="h-3 w-3" />
                                {showAnonymous ? 'Hide' : 'Show'} anonymous
                            </Button>

                            <Button
                                variant={showRestricted ? "destructive" : "outline"}
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => setShowRestricted((v) => !v)}
                            >
                                <Shield className="h-3 w-3" />
                                {showRestricted ? 'Hide' : 'Show'} restricted
                            </Button>

                            {(showAnonymous || showRestricted) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => {
                                        setShowAnonymous(false);
                                        setShowRestricted(false);
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table className="m-0 p-0 [&_td]:m-0 [&_th]:m-0">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b bg-muted/40">
                                    <TableHead className="pl-4 sm:pl-6 w-[28%] text-sm font-semibold text-foreground/80">User</TableHead>
                                    <TableHead className="hidden sm:table-cell w-[25%] text-sm font-semibold text-foreground/80">Email</TableHead>
                                    <TableHead className="hidden md:table-cell w-[15%] text-sm font-semibold text-foreground/80">Auth</TableHead>
                                    <TableHead className="hidden lg:table-cell w-[12%] text-sm font-semibold text-foreground/80">Signed up</TableHead>
                                    <TableHead className="hidden xl:table-cell w-[12%] text-sm font-semibold text-foreground/80">Last active</TableHead>
                                    <TableHead className="w-[10%] text-sm font-semibold text-foreground/80">Status</TableHead>
                                    <TableHead className="w-8 pr-4 sm:pr-6" />
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-16 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground/50" />
                                            <p className="text-base text-muted-foreground mt-3">Loading users...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Users className="h-10 w-10 text-muted-foreground/30" />
                                                <p className="text-base font-medium text-muted-foreground">No users found</p>
                                                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => {
                                        // Build auth method pills with proper icons
                                        const authMethods = [
                                            user.has_password && { label: 'Password', icon: Key, color: 'text-blue-500' },
                                            user.auth_with_email && { label: 'Email', icon: Mail, color: 'text-emerald-500' },
                                            user.otp_auth_enabled && { label: 'OTP', icon: Shield, color: 'text-purple-500' },
                                            user.passkey_auth_enabled && { label: 'Passkey', icon: Fingerprint, color: 'text-amber-500' },
                                            ...(user.oauth_providers ?? []).map((p: { id: string }) => ({
                                                label: p.id.charAt(0).toUpperCase() + p.id.slice(1),
                                                icon: Chrome,
                                                color: 'text-sky-500',
                                            })),
                                        ].filter(Boolean) as { label: string; icon: React.ElementType; color: string }[];

                                        // Determine status for quick reference
                                        const isBanned = user.is_restricted;
                                        const isAnonymous = user.is_anonymous;
                                        const isActive = !isBanned && !isAnonymous;

                                        return (
                                            <TableRow
                                                key={user.id}
                                                className="group hover:bg-muted/20 transition-colors duration-150 border-b"
                                            >

                                                {/* User Column */}
                                                <TableCell className="py-3 pl-4 sm:pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9 shrink-0">
                                                            {user.profile_image_url && (
                                                                <AvatarImage src={user.profile_image_url} alt={user.display_name} />
                                                            )}
                                                            <AvatarFallback className="bg-muted font-medium">
                                                                {initials(user.display_name)}
                                                            </AvatarFallback>
                                                        </Avatar>

                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">
                                                                {user.display_name}
                                                            </p>

                                                            {user.country_code && (
                                                                <p className="text-xs text-muted-foreground uppercase">
                                                                    {user.country_code}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Email Column */}
                                                <TableCell className="hidden sm:table-cell py-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">
                                                            {user.primary_email || "—"}
                                                        </p>

                                                        {user.primary_email && (
                                                            <div className="mt-0.5 flex items-center gap-1">
                                                                {user.primary_email_verified ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                                        <span className="text-xs text-muted-foreground">
                                                                            Verified
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="h-3 w-3 text-amber-500" />
                                                                        <span className="text-xs text-muted-foreground">
                                                                            Not verified
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Auth Methods Column */}
                                                <TableCell className="hidden md:table-cell py-3">
                                                    {authMethods.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {authMethods.map((method) => (
                                                                <Badge
                                                                    key={method.label}
                                                                    variant="outline"
                                                                    className="gap-1 text-xs"
                                                                >
                                                                    <method.icon className={`h-3 w-3 ${method.color}`} />
                                                                    {method.label}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>

                                                {/* Signed Up Column - 12% */}
                                                <TableCell className="hidden lg:table-cell py-3">
                                                    <div className="flex items-center gap-2 text-sm text-foreground/70 whitespace-nowrap">
                                                        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="font-medium">{fmtDate(user.signed_up_at_millis)}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Last Active Column - 12% */}
                                                <TableCell className="hidden xl:table-cell py-3">
                                                    <div className="flex items-center gap-2 text-sm text-foreground/70 whitespace-nowrap">
                                                        <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                        <span className="font-medium">{fmtDate(user.last_active_at_millis)}</span>
                                                    </div>
                                                </TableCell>

                                                {/* Status Column */}
                                                <TableCell className="py-3">
                                                    <div className="space-y-1">
                                                        {isBanned ? (
                                                            <Badge variant="destructive" className="gap-1">
                                                                <UserX className="h-3 w-3" />
                                                                Banned
                                                            </Badge>
                                                        ) : isAnonymous ? (
                                                            <Badge variant="secondary" className="gap-1">
                                                                <EyeOff className="h-3 w-3" />
                                                                Anonymous
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="gap-1">
                                                                <UserCheck className="h-3 w-3" />
                                                                Active
                                                            </Badge>
                                                        )}

                                                        {isBanned && user.restricted_by_admin_reason && (
                                                            <p
                                                                className="max-w-[160px] truncate text-xs text-muted-foreground"
                                                                title={user.restricted_by_admin_reason}
                                                            >
                                                                {user.restricted_by_admin_reason}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Actions Column - fixed width */}
                                                <TableCell className="pr-4 sm:pr-6 py-3 w-8">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-muted/60"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-44">
                                                            <DropdownMenuItem
                                                                className="text-sm cursor-pointer gap-2.5 py-2"
                                                                onClick={() => setViewUser(user)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className={`text-sm font-medium cursor-pointer gap-2.5 py-2 ${isBanned
                                                                    ? 'text-emerald-600 focus:text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-red-600 focus:text-red-600 dark:text-red-400'
                                                                    }`}
                                                                onClick={() => setBanUser(user)}
                                                            >
                                                                {isBanned ? (
                                                                    <><ShieldOff className="h-4 w-4" />Unban user</>
                                                                ) : (
                                                                    <><Shield className="h-4 w-4" />Ban user</>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                </Card>

                <div className="space-y-6">
                    <UsersCharts users={users} />
                </div>


            </div>
        </>
    );
}