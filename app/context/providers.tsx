// importing context
import { AuthProvider, ThemeProvider, UIProvider } from "@/app/context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};
