import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { Toaster } from './components/ui/feedback/sonner';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <SettingsProvider>
          <CategoriesProvider>
            <NotificationProvider>
              <RouterProvider router={router} />
              <Toaster position="top-right" richColors />
            </NotificationProvider>
          </CategoriesProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}