// importing context
import { AuthProvider, NotificationsProvider, ThemeProvider, UIProvider } from "@/app/context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <UIProvider>
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
        </UIProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};
