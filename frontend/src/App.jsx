import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { TeacherProvider } from './contexts/TeacherContext';
import { StudentProvider } from './contexts/StudentContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { RegularProgressProvider } from './contexts/RegularProgressContext';
import { HifzReportProvider } from './contexts/HifzReportContext';
import { ClassProvider } from './contexts/ClassContext';
import { SubjectProvider } from './contexts/SubjectContext';
import { EnrollmentProvider } from './contexts/EnrollmentContext';
import { PasswordResetProvider } from './contexts/PasswordResetContext'; // Add this import
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import './index.css';

// Loading component
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div 
      className="animate-spin rounded-full h-16 w-16 border-b-2"
      style={{ borderColor: '#D97706' }}
    ></div>
  </div>
);

// Main App Content
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <AppLoading />;
  }

  return <AppRoutes />;
};

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <TeacherProvider>
          <StudentProvider>
            <EnrollmentProvider>
              <AttendanceProvider>
                <ProgressProvider>
                  <RegularProgressProvider>
                    <HifzReportProvider>
                      <ClassProvider>
                        <SubjectProvider>
                          <PasswordResetProvider> {/* Add PasswordResetProvider here */}
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
                          </PasswordResetProvider>
                        </SubjectProvider>
                      </ClassProvider>
                    </HifzReportProvider>
                  </RegularProgressProvider>
                </ProgressProvider>
              </AttendanceProvider>
            </EnrollmentProvider>
          </StudentProvider>
        </TeacherProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;