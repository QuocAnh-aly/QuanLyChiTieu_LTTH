import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  return (
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
  );
}