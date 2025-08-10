import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface AuthFormProps {
  isAdmin?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isAdmin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, adminLogin } = useAuth();

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
        success = await login(email, password);
        if (!success) {
          setError('Invalid email or password');
        }
      } else {
        success = await register(email, password, phone, referralCode);
        if (!success) {
          setError('Registration failed. Email may already exist or referral code is invalid.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-green-400 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin ? 'Admin' : 'StarNetX'}
          </h1>
          <p className="text-gray-600">
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

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Please wait...' : (isAdmin ? 'Admin Login' : (isLogin ? 'Sign In' : 'Sign Up'))}
          </Button>

          {!isAdmin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};