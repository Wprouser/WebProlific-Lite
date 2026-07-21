import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/routes/Dashboard';
import { Styleguide } from '@/routes/Styleguide';
import { AlertList } from '@/routes/AlertList';
import { Login } from '@/routes/Login';
import { Items } from '@/routes/Items';
import { getSession } from '@/lib/auth-store';

function RequireAuth({ children }: { children: ReactNode }) {
  return getSession() ? <>{children}</> : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  return getSession() ? <Navigate to="/" replace /> : <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Pre-auth, no Global App Chrome — FR-13's Login screen. */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/items" element={<Items />} />
            <Route path="/styleguide" element={<Styleguide />} />
            <Route path="/alerts/:type" element={<AlertList />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
