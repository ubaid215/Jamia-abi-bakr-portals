import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      // Redirect based on user role and status
      // Force Password Reset - DISABLED BY USER REQUEST
      // if (user.forcePasswordReset === true) {
      //   navigate('/change-password', { replace: true });
      //   return;
      // }

      switch (user.role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'TEACHER':
          navigate('/teacher/dashboard', { replace: true });
          break;
        case 'STUDENT':
          navigate('/student/dashboard', { replace: true });
          break;
        case 'PARENT':
          navigate('/parent/dashboard', { replace: true });
          break;
        default:
          navigate(from, { replace: true });
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Gold color palette using hex codes
  const goldColors = {
    50: '#FFFBEB',   // Light gold background
    100: '#FEF3C7',  // Very light gold
    200: '#FDE68A',  // Light gold
    300: '#FCD34D',  // Medium light gold
    400: '#FBBF24',  // Medium gold
    500: '#F59E0B',  // Primary gold
    600: '#D97706',  // Dark gold
    700: '#B45309',  // Very dark gold
    800: '#92400E',  // Darkest gold
    900: '#78350F',  // Brownish gold
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(135deg, ${goldColors[50]} 0%, #FFFFFF 50%, ${goldColors[50]} 100%)`
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            <div
              className="p-4 rounded-2xl shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${goldColors[500]}, ${goldColors[700]})`
              }}
            >
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-black font-serif">Jamia</h1>
              <p
                className="text-sm font-medium tracking-wide"
                style={{ color: goldColors[700] }}
              >
                Management System
              </p>
            </div>
          </div>
        </div>
        <h2 className="mt-8 text-center text-2xl font-bold text-gray-900 font-serif">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className="bg-white py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-sm"
          style={{ border: `1px solid ${goldColors[200]}50` }}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none transition-all duration-200 bg-white/80 text-gray-900 font-medium"
                  style={{
                    '--tw-ring-color': goldColors[500],
                    focus: `outline-none ring-2 ring-[${goldColors[500]}] border-transparent`
                  }}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none transition-all duration-200 bg-white/80 text-gray-900 font-medium pr-12"
                  style={{
                    '--tw-ring-color': goldColors[500],
                    focus: `outline-none ring-2 ring-[${goldColors[500]}] border-transparent`
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 transition-colors duration-200"
                  style={{
                    '--tw-hover-color': goldColors[600],
                    hover: `text-[${goldColors[600]}]`
                  }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 rounded"
                  style={{
                    '--tw-ring-color': goldColors[500],
                    '--tw-checked-color': goldColors[600],
                    focus: `ring-2 ring-[${goldColors[500]}]`,
                    checked: `bg-[${goldColors[600]}] border-[${goldColors[600]}]`
                  }}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 font-medium">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-semibold transition-colors duration-200"
                  style={{
                    color: goldColors[700],
                    '--tw-hover-color': goldColors[800],
                    hover: `color: ${goldColors[800]}`
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${goldColors[600]}, ${goldColors[700]})`,
                  '--tw-hover-from': goldColors[700],
                  '--tw-hover-to': goldColors[800],
                  hover: `background: linear-gradient(135deg, ${goldColors[700]}, ${goldColors[800]})`,
                  '--tw-focus-ring': `${goldColors[500]}30`,
                  focus: `ring-4 ring-[${goldColors[500]}30]`
                }}
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-4">
                  <LogIn
                    className="h-6 w-6 transition-colors duration-200"
                    style={{
                      color: goldColors[200],
                      '--tw-group-hover-color': goldColors[100],
                    }}
                  />
                </span>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div
                      className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
                    ></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Removed demo accounts section */}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 font-medium">
            &copy; 2026 Jamia Management System. Elevating Islamic Education.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;