import { useState } from "react";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { Layout } from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, AlertTriangle, ClipboardList, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Translation helpers ---
const ACTION_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  CREATE:  { label: 'إضافة',     variant: 'default',     color: 'bg-green-500/15 text-green-700 border-green-500/30' },
  UPDATE:  { label: 'تعديل',     variant: 'secondary',   color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  DELETE:  { label: 'حذف',       variant: 'destructive', color: 'bg-red-500/15 text-red-700 border-red-500/30' },
  LOGIN:   { label: 'دخول',      variant: 'outline',     color: 'bg-violet-500/15 text-violet-700 border-violet-500/30' },
  LOGOUT:  { label: 'خروج',      variant: 'outline',     color: 'bg-gray-500/15 text-gray-600 border-gray-400/30' },
  RESTORE: { label: 'استعادة',   variant: 'secondary',   color: 'bg-orange-500/15 text-orange-700 border-orange-500/30' },
  IMPORT:  { label: 'استيراد',   variant: 'default',     color: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30' },
};

const ENTITY_LABELS: Record<string, string> = {
  EMPLOYEE: 'موظف',
  USER:     'مستخدم',
  SETTING:  'إعداد',
  BACKUP:   'نسخة احتياطية',
  SYSTEM:   'النظام',
};

const FIELD_NAMES: Record<string, string> = {
  fullName: "الاسم الكامل",
  fatherName: "اسم الأب",
  motherName: "اسم الأم",
  placeOfBirth: "مكان الولادة",
  dateOfBirth: "تاريخ الولادة",
  nationalId: "الرقم الوطني",
  shamCashNumber: "رقم شام كاش",
  jobTitle: "الصفة الوظيفية",
  currentStatus: "الوضع الحالي",
  category: "الفئة",
  employmentStatus: "الوضع الوظيفي",
  specialization: "الاختصاص",
  assignedWork: "العمل المكلف به",
  mobile: "رقم الجوال",
  address: "العنوان",
  notes: "ملاحظات",
  certificate: "الشهادة",
  certificateType: "نوع الشهادة",
  appointmentDecisionNumber: "رقم قرار التعيين",
  appointmentDecisionDate: "تاريخ قرار التعيين",
  firstStateStart: "أول مباشرة بالدولة",
  firstDirectorateStart: "أول مباشرة بالمديرية",
  firstDepartmentStart: "أول مباشرة بالقسم",
  gender: "الجنس",
  registryPlaceAndNumber: "محل ورقم القيد",
  loginTime: "وقت الدخول",
  logoutTime: "وقت الخروج",
  username: "اسم المستخدم",
  role: "الصلاحية",
  isDeleted: "محذوف",
  documentPaths: "المرفقات",
};

function buildChangeSummary(action: string, oldV: any, newV: any): string {
  if (action === 'LOGIN') return `تسجيل دخول${newV?.loginTime ? ' في ' + format(new Date(newV.loginTime), 'HH:mm:ss') : ''}`;
  if (action === 'LOGOUT') return `تسجيل خروج${newV?.logoutTime ? ' في ' + format(new Date(newV.logoutTime), 'HH:mm:ss') : ''}`;
  if (action === 'CREATE') {
    if (newV?.source === 'excel_import') return `استيراد موظف: ${newV?.fullName || ''}`;
    const name = newV?.fullName || newV?.username || '';
    return `تمت إضافة سجل جديد${name ? ': ' + name : ''}`;
  }
  if (action === 'DELETE') {
    const name = oldV?.fullName || newV?.fullName || '';
    return `تم حذف${name ? ': ' + name : ' السجل'}`;
  }
  if (action === 'RESTORE') return 'تمت استعادة النسخة الاحتياطية';

  // UPDATE — list changed fields
  const old = oldV || {};
  const nw = newV || {};
  const skip = new Set(['updatedAt', 'createdAt', 'id']);
  const changes: string[] = [];
  for (const key of Object.keys(nw)) {
    if (skip.has(key)) continue;
    if (JSON.stringify(old[key]) !== JSON.stringify(nw[key])) {
      const label = FIELD_NAMES[key] || key;
      const from = old[key] !== undefined && old[key] !== null && old[key] !== '' ? String(old[key]) : 'فارغ';
      const to = nw[key] !== undefined && nw[key] !== null && nw[key] !== '' ? String(nw[key]) : 'فارغ';
      if (key === 'documentPaths') {
        changes.push(`تحديث المرفقات`);
        continue;
      }
      changes.push(`${label}: ${from} ← ${to}`);
    }
  }
  return changes.length > 0 ? changes.join('\n') : 'لم يتم تغيير أي بيانات جوهرية';
}

function getEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] || entityType;
}

function getActionMeta(action: string) {
  return ACTION_META[action] || { label: action, variant: 'outline' as const, color: 'bg-gray-100 text-gray-700 border-gray-300' };
}

export default function AuditLogs() {
  const { data: logs, isLoading } = useAuditLogs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/audit-logs', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'خطأ في المسح' }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-logs'] });
      toast({ title: 'تم مسح سجل العمليات بنجاح' });
      setConfirmClear(false);
    },
    onError: (e: any) => {
      toast({ title: 'فشل المسح', description: e.message, variant: 'destructive' });
    },
  });

  const filteredLogs = (logs || []).filter(({ log, user: u }) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const action = getActionMeta(log.action).label;
    const entity = getEntityLabel(log.entityType);
    const username = u?.username || '';
    return action.includes(q) || entity.includes(q) || username.toLowerCase().includes(q) || String(log.entityId || '').includes(q);
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>جاري تحميل السجلات...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">سجل العمليات</h1>
            <p className="mt-1 text-muted-foreground font-medium">
              تتبع جميع التغييرات والإجراءات التي تمت على النظام
              {logs && logs.length > 0 && (
                <span className="mr-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {logs.length} عملية
                </span>
              )}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button
              variant="destructive"
              className="gap-2 font-bold"
              onClick={() => setConfirmClear(true)}
              disabled={!logs || logs.length === 0}
              data-testid="btn-clear-audit-logs"
            >
              <Trash2 className="h-4 w-4" />
              مسح السجل
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في السجل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 text-right"
            data-testid="input-audit-search"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-right font-bold w-12">#</TableHead>
                <TableHead className="text-right font-bold">المستخدم</TableHead>
                <TableHead className="text-right font-bold">العملية</TableHead>
                <TableHead className="text-right font-bold">نوع السجل</TableHead>
                <TableHead className="text-right font-bold">ملخص</TableHead>
                <TableHead className="text-right font-bold">التاريخ والوقت</TableHead>
                <TableHead className="text-center font-bold w-20">تفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <ClipboardList className="h-12 w-12 opacity-20" />
                      <p className="font-medium">{search ? 'لا توجد نتائج مطابقة' : 'لا توجد سجلات بعد'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(({ log, user: u }, i) => {
                  const meta = getActionMeta(log.action);
                  const entityLabel = getEntityLabel(log.entityType);
                  const summary = buildChangeSummary(log.action, log.oldValues, log.newValues);
                  const firstLine = summary.split('\n')[0];
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {u?.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-bold text-sm">
                            {u ? u.username : <span className="text-muted-foreground italic text-xs">محذوف</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-medium">{entityLabel}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground max-w-xs truncate" title={firstLine}>
                          {firstLine}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" dir="ltr">
                        {format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10" data-testid={`btn-view-log-${log.id}`}>
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-2xl rounded-xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.color}`}>
                                  {meta.label}
                                </span>
                                تفاصيل العملية
                              </DialogTitle>
                            </DialogHeader>
                            <div className="mt-2 space-y-5">
                              {/* Meta info */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">المستخدم</p>
                                  <p className="font-bold">{u?.username || 'مستخدم محذوف'}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">نوع السجل</p>
                                  <p className="font-bold">{entityLabel}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">معرّف السجل</p>
                                  <p className="font-mono text-sm">{log.entityId || '—'}</p>
                                </div>
                                <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium">التاريخ والوقت</p>
                                  <p className="font-bold" dir="ltr">{format(new Date(log.createdAt), 'yyyy/MM/dd HH:mm:ss')}</p>
                                </div>
                              </div>

                              {/* Change summary */}
                              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                                <h4 className="font-bold text-sm mb-3 text-primary">ملخص التغييرات</h4>
                                <div className="space-y-1.5">
                                  {summary.split('\n').map((line, i) => (
                                    <p key={i} className="text-sm leading-relaxed text-foreground">
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Raw JSON side by side */}
                              {(log.oldValues || log.newValues) && (
                                <div className="grid grid-cols-2 gap-3" dir="ltr">
                                  <div className="rounded-xl border p-3 bg-muted/20">
                                    <h4 className="font-bold text-xs mb-2 text-red-600">قبل التغيير</h4>
                                    <ScrollArea className="h-[180px]">
                                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(log.oldValues, null, 2) || '—'}</pre>
                                    </ScrollArea>
                                  </div>
                                  <div className="rounded-xl border p-3 bg-muted/20">
                                    <h4 className="font-bold text-xs mb-2 text-green-600">بعد التغيير</h4>
                                    <ScrollArea className="h-[180px]">
                                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(log.newValues, null, 2) || '—'}</pre>
                                    </ScrollArea>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-black">مسح سجل العمليات</AlertDialogTitle>
            <AlertDialogDescription className="text-center leading-relaxed">
              هل أنت متأكد من رغبتك في مسح <span className="font-bold text-foreground">جميع سجلات العمليات</span> نهائياً؟
              <br />
              <span className="text-destructive font-bold text-sm">لا يمكن التراجع عن هذه العملية.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-bold">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              نعم، مسح السجل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
