import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm } from './AuthForm';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { authUser, isAdmin, loading, sessionLoaded } = useAuth();

  // Show loading while checking auth
  if (loading || !sessionLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-green-400 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!authUser) {
    return <AuthForm isAdmin={requireAdmin} />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-orange-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/80 mb-6">You don't have permission to access this area.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and authorized
  return <>{children}</>;
};