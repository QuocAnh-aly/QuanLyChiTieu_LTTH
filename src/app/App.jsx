import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CategoriesProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </CategoriesProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}