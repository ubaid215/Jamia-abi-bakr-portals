import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import './index.css';

// React Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // 2 min default cache
      retry: 1,                       // retry once on failure
      refetchOnWindowFocus: false,    // avoid surprise refetches
    },
    mutations: {
      retry: 0,
    },
  },
});

// Loading component
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div
      className="animate-spin rounded-full h-16 w-16 border-b-2"
      style={{ borderColor: '#D97706' }}
    ></div>
  </div>
);

// Main App Content — waits for auth initialization
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <AppLoading />;
  }

  return <AppRoutes />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-white text-black">
            <AppContent />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1f2937',
                  color: '#ffffff',
                },
                success: {
                  style: {
                    background: '#065f46',
                  },
                },
                error: {
                  style: {
                    background: '#dc2626',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;