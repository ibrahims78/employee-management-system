import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { Users, UserCheck, Briefcase, GraduationCap, ShieldCheck, UserX, UserMinus, Send } from "lucide-react";
import { Layout } from "@/components/Layout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import type { Employee } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  'على رأس عمله': '#22c55e',
  'إجازة بلا أجر': '#f97316',
  'نقل': '#0ea5e9',
  'استقالة': '#ef4444',
};

const STATUS_ICONS: Record<string, any> = {
  'على رأس عمله': UserCheck,
  'إجازة بلا أجر': UserMinus,
  'نقل': Send,
  'استقالة': UserX,
};

const CHART_COLORS = ['#22c55e', '#f97316', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const { data: allEmployees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees', { all: true }],
    queryFn: async () => {
      const res = await fetch('/api/employees?all=true');
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const { users, isLoading: usersLoading } = useUsers();
  const { user: currentUser } = useAuth();
  const isLoading = empLoading || usersLoading;

  if (isLoading) {
    return <Layout><div className="flex h-96 items-center justify-center">جاري التحميل...</div></Layout>;
  }

  const activeUsers = users?.filter(u => u.isOnline) || [];

  const totalEmployees = allEmployees.length;
  const categoryFirst = allEmployees.filter(e => e.category === "أولى").length;
  const categorySecond = allEmployees.filter(e => e.category === "ثانية").length;
  const categoryThird = allEmployees.filter(e => e.category === "ثالثة").length;
  const categoryFourth = allEmployees.filter(e => e.category === "رابعة").length;

  // Status distribution for all employees
  const statusCounts = allEmployees.reduce((acc, emp) => {
    const status = emp.currentStatus || 'غير محدد';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Gender distribution
  const maleCount = allEmployees.filter(e => e.gender === 'ذكر').length;
  const femaleCount = allEmployees.filter(e => e.gender === 'أنثى').length;
  const genderData = [
    { name: 'ذكر', value: maleCount },
    { name: 'أنثى', value: femaleCount },
  ].filter(d => d.value > 0);

  const recentEmployees = [...allEmployees].slice(0, 6);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">لوحة التحكم</h1>
          <p className="mt-1 text-muted-foreground font-medium">نظرة شاملة على إحصائيات الموظفين والوضع الوظيفي</p>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatsCard
            title="إجمالي الموظفين"
            value={totalEmployees}
            icon={Users}
            color="blue"
            description="جميع الموظفين المسجلين"
          />
          <StatsCard
            title="الفئة الأولى"
            value={categoryFirst}
            icon={GraduationCap}
            color="green"
            description="حملة الشهادات الجامعية"
          />
          <StatsCard
            title="الفئة الثانية"
            value={categorySecond}
            icon={Briefcase}
            color="orange"
            description="المعاهد التقنية"
          />
          <StatsCard
            title="الفئة الثالثة"
            value={categoryThird}
            icon={UserCheck}
            color="blue"
            description="الشهادة الثانوية"
          />
          <StatsCard
            title="الفئة الرابعة"
            value={categoryFourth}
            icon={UserCheck}
            color="red"
            description="الخدمات والمهن"
          />
        </div>

        {/* Status Summary Cards */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">توزع الموظفين حسب الوضع الحالي</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(statusCounts).length === 0 ? (
              <div className="col-span-4 text-center text-muted-foreground py-6">لا توجد بيانات</div>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => {
                const Icon = STATUS_ICONS[status] || UserCheck;
                const color = STATUS_COLORS[status] || '#8b5cf6';
                const pct = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) : 0;
                return (
                  <Card key={status} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-3xl font-black" style={{ color }}>{count}</span>
                      </div>
                      <p className="font-bold text-sm text-foreground">{status}</p>
                      <div className="mt-2">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{pct}% من الإجمالي</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Status Pie Chart */}
          <Card className="lg:col-span-2 shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold">الرسم البياني لتوزع الأوضاع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.name] || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value + ' موظف', name]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'inherit' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">لا توجد بيانات كافية</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gender + Active Users sidebar */}
          <div className="space-y-6">
            {/* Gender Distribution */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">توزع الجنس</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[150px]">
                  {genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" outerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          <Cell fill="#0ea5e9" />
                          <Cell fill="#ec4899" />
                        </Pie>
                        <Tooltip formatter={(v: number, n: string) => [v + ' موظف', n]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {currentUser?.role === 'admin' && (
              <Card className="shadow-lg border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-blue-600">{activeUsers.length}</p>
                      <p className="text-sm font-bold text-foreground">مستخدم نشط حالياً</p>
                      <p className="text-xs text-muted-foreground">مسجّلون دخول الآن</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Employees */}
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold">آخر الموظفين المضافين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentEmployees.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا يوجد موظفين</p>
              ) : (
                recentEmployees.map(emp => {
                  const statusColor = STATUS_COLORS[emp.currentStatus] || '#8b5cf6';
                  return (
                    <div key={emp.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {emp.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{emp.fullName}</p>
                          <p className="text-xs text-muted-foreground">{emp.jobTitle || emp.specialization || '—'}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs font-bold shrink-0"
                        style={{ borderColor: statusColor + '60', color: statusColor, backgroundColor: statusColor + '15' }}
                      >
                        {emp.currentStatus || '—'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
