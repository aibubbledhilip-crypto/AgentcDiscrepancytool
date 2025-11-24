import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);
      const { user, tokens } = response.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-3">
            <ShieldCheckIcon className="h-14 w-14 text-blue-400" />
            <h1 className="text-4xl font-bold text-white tracking-tight">WatchTower</h1>
          </div>
          <p className="mt-3 text-lg text-blue-200">
            Data Quality Monitoring Platform
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Enter your password"
                {...register('password', {
                  required: 'Password is required',
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-300">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Register
            </Link>
          </p>
        </form>
      </div>

      {/* Powered by Prodapt */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2">
        <span className="text-sm text-gray-400">Powered by</span>
        <img
          src="https://e7.pngegg.com/pngimages/781/291/png-clipart-prodapt-solutions-logo-brand-privately-held-company-run-s-text-logo.png"
          alt="Prodapt"
          className="h-8 object-contain brightness-0 invert opacity-70"
        />
      </div>
    </div>
  );
}
