import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useEffect } from "react";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import NotificationToast from "@/components/notification-toast";

function Router() {
  const { user, isLoading } = useAuth();
  const { requestPermission } = useNotifications();

  useEffect(() => {
    if (user) {
      requestPermission();
    }
  }, [user, requestPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!user ? (
        <Route path="/" component={AuthPage} />
      ) : (
        <Route path="/" component={Dashboard} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <NotificationToast />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
