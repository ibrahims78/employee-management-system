import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, User, Key, Eye, EyeOff, Info, ShieldCheck } from "lucide-react";
import { Redirect } from "wouter";

function buildSchema(apiKeyRequired: boolean) {
  return z.object({
    username: z.string().min(1, "اسم المستخدم مطلوب"),
    password: z.string().min(1, "كلمة المرور مطلوبة"),
    apiKey: apiKeyRequired
      ? z.string().min(1, "مفتاح API مطلوب للدخول إلى النظام")
      : z.string().optional().default(""),
  });
}

type LoginFormValues = {
  username: string;
  password: string;
  apiKey: string;
};

export default function Login() {
  const { login, isLoggingIn, user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: setupStatus } = useQuery<{ apiKeyRequired: boolean }>({
    queryKey: ["/api/auth/setup-status"],
    queryFn: async () => {
      const res = await fetch("/api/auth/setup-status");
      return res.json();
    },
    retry: false,
  });

  const apiKeyRequired = setupStatus?.apiKeyRequired ?? false;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(buildSchema(apiKeyRequired)),
    defaultValues: { username: "", password: "", apiKey: "" },
  });

  if (user) return <Redirect to="/" />;

  function onSubmit(data: LoginFormValues) {
    login({ username: data.username, password: data.password, apiKey: data.apiKey ?? "" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 font-[Tajawal]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

      <Card className="w-full max-w-md border-primary/10 shadow-2xl shadow-primary/5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />

        <CardHeader className="space-y-4 pb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 transform transition-transform hover:scale-105">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">
              برنامج ذاتية الموظفين في المكتب الهندسي
            </CardTitle>
            <CardDescription className="text-muted-foreground/80">
              أدخل بيانات الدخول للمتابعة
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Bootstrap mode notice */}
          {!apiKeyRequired && (
            <div className="mb-5 flex items-start gap-2 p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>وضع التشغيل الأول:</strong> لا توجد مفاتيح API بعد. سجّل دخولك كمدير وأنشئ المفاتيح من صفحة الإعدادات.
              </span>
            </div>
          )}

          {/* API key enforcement active badge */}
          {apiKeyRequired && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-green-500/8 border border-green-500/20 text-xs text-green-700 dark:text-green-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="font-bold">حماية API Key مفعّلة — يتطلب مفتاح صالح للدخول.</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold">اسم المستخدم</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          className="pr-9 border-primary/20 focus:border-primary transition-all bg-background/50"
                          placeholder="admin"
                          autoComplete="username"
                          data-testid="input-username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold">كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          className="pr-9 border-primary/20 focus:border-primary transition-all bg-background/50"
                          type="password"
                          placeholder="••••••"
                          autoComplete="current-password"
                          data-testid="input-password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* API Key */}
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      مفتاح API
                      {!apiKeyRequired && (
                        <span className="text-xs font-normal text-muted-foreground">(اختياري في هذه المرحلة)</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Input
                          className={`pl-10 border-primary/20 focus:border-primary transition-all bg-background/50 font-mono text-sm tracking-wider ${apiKeyRequired ? "border-primary/40" : ""}`}
                          type={showApiKey ? "text" : "password"}
                          placeholder={apiKeyRequired ? "أدخل مفتاح API الخاص بك *" : "أدخل مفتاح API (اختياري)"}
                          autoComplete="off"
                          data-testid="input-api-key"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute left-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => setShowApiKey((v) => !v)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {apiKeyRequired && (
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        مطلوب من مسؤول النظام قبل الدخول. راجع صفحة الإعدادات.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full text-base font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] mt-2"
                disabled={isLoggingIn}
                data-testid="btn-login"
              >
                {isLoggingIn ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-primary/10 text-center">
            <p className="text-xs text-muted-foreground/60 font-medium tracking-wide uppercase flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-primary/20" />
              تصميم وتطوير المبرمج
              <span className="h-px w-8 bg-primary/20" />
            </p>
            <p className="mt-2 text-sm font-bold text-primary/80 hover:text-primary transition-colors cursor-default">
              إبراهيم الصيداوي
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
