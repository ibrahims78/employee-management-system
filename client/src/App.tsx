import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import AuditLogs from "@/pages/AuditLogs";
import UsersPage from "@/pages/Users";
import SettingsPage from "@/pages/Settings";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
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

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/employees">
        <ProtectedRoute component={Employees} />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UsersPage} />
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute component={AuditLogs} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user, logoutMutation } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const [showWarning, setShowWarning] = useState(false);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    setShowWarning(false);

    if (user) {
      warningRef.current = setTimeout(() => {
        setShowWarning(true);
      }, SESSION_TIMEOUT_MS - WARNING_BEFORE_MS);

      timeoutRef.current = setTimeout(() => {
        setShowWarning(false);
        logoutMutation.mutate();
      }, SESSION_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handler = () => resetTimer();

    events.forEach(event => document.addEventListener(event, handler));
    resetTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user, logoutMutation]);

  const handleExtendSession = () => {
    setShowWarning(false);
    resetTimer();
  };

  const handleLogoutNow = () => {
    setShowWarning(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    logoutMutation.mutate();
  };

  return (
    <>
      <Router />
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right text-amber-600">⚠️ تنبيه: الجلسة على وشك الانتهاء</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              ستنتهي جلستك خلال دقيقة واحدة بسبب عدم النشاط. هل تريد تمديد الجلسة والاستمرار في العمل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel onClick={handleLogoutNow}>تسجيل الخروج الآن</AlertDialogCancel>
            <AlertDialogAction onClick={handleExtendSession} className="bg-primary">
              تمديد الجلسة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default App;
