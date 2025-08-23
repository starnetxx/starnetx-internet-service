import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Wifi } from 'lucide-react';
import { secureStorage } from '../../utils/secureStorage';

interface AuthFormProps {
  isAdmin?: boolean;
}

// APK Download Section Component
const APKDownloadSection = () => {
  const handleDownload = () => {
    // Updated APK download link
    const apkUrl = "https://xgvxtnvdxqqeehjrvkwr.supabase.co/storage/v1/object/public/androidapk/StarnetX.apk";
    window.open(apkUrl, '_blank');
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-emerald-500/20 to-green-500/20 backdrop-blur-xl rounded-3xl border border-emerald-400/30 shadow-xl">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Get the Mobile App</h3>
          <p className="text-white/80 text-sm mb-4">Download our Android app for the best experience</p>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 transform hover:-translate-y-1"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Download APK for Android
        </button>

        {/* iOS Coming Soon */}
        <div className="text-white/60 text-sm font-medium">
          iOS version coming soon
        </div>
      </div>
    </div>
  );
};

export const AuthForm: React.FC<AuthFormProps> = ({ isAdmin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { login, register, adminLogin, profileLoading, authUser } = useAuth();
  
  // Load saved credentials on component mount and optionally auto-login
  React.useEffect(() => {
    const credentials = secureStorage.getCredentials();
    if (credentials && credentials.rememberMe) {
      setEmail(credentials.email);
      setPassword(credentials.password);
      setRememberMe(true);
      
      // Optional: Auto-login if credentials exist and user is not authenticated
      // Uncomment the following lines to enable auto-login
      // if (!authUser && !loading) {
      //   handleAutoLogin(credentials.email, credentials.password);
      // }
    }
  }, []);
  
  // If user is already authenticated, show a message
  React.useEffect(() => {
    if (authUser) {
      console.log('User already authenticated, should redirect from login page');
    }
  }, [authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;
      
      if (isAdmin) {
        success = await adminLogin(email, password);
        if (!success) {
          setError('Invalid admin credentials or insufficient permissions');
        }
      } else if (isLogin) {
        const result = await login(email, password);
        success = result.success;
        if (!success) {
          setError(result.error || 'Invalid email or password. Please check your credentials and try again.');
        } else {
          // Save or clear credentials based on remember me
          secureStorage.saveCredentials(email, password, rememberMe);
        }
      } else {
        const result = await register(email, password, phone, referralCode);
        success = result.success;
        if (!success) {
          setError(result.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Add APK download section at the top for non-admin users */}
        {!isAdmin && <APKDownloadSection />}
        
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Subtle loading indicator for auth check */}
          {profileLoading && (
            <div className="mb-6 p-4 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl">
              <div className="flex items-center gap-3 text-blue-100 text-sm">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full animate-spin"></div>
                <span className="font-medium">Checking authentication...</span>
              </div>
            </div>
          )}
          
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Wifi className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              {isAdmin ? 'Admin' : 'StarNetX'}
            </h1>
            <p className="text-white/80 text-lg">
              {isAdmin ? 'Admin Dashboard Access' : (isLogin ? 'Welcome back!' : 'Create your account')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              required
            />

            {!isLogin && !isAdmin && (
              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={setPhone}
                placeholder="Enter your phone number (optional)"
              />
            )}

            {!isLogin && !isAdmin && (
              <Input
                label="Referral Code"
                type="text"
                value={referralCode}
                onChange={setReferralCode}
                placeholder="Enter referral code (optional)"
              />
            )}

            {isLogin && !isAdmin && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="rememberMe" className="text-white/80 text-sm font-medium cursor-pointer hover:text-white transition-colors">
                    Remember me
                  </label>
                </div>
                {rememberMe && email && password && (
                  <div className="px-1 text-xs text-green-300/80 font-medium">
                    ✓ Credentials saved for quick login
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-2xl">
                <div className="flex items-center gap-3 text-red-100 text-sm">
                  <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-1"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </div>
              ) : (
                (isAdmin ? 'Admin Login' : (isLogin ? 'Sign In' : 'Sign Up'))
              )}
            </button>

            {!isAdmin && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};