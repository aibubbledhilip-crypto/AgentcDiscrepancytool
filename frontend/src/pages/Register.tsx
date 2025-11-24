import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <ShieldCheckIcon className="h-14 w-14 text-blue-400" />
            <h1 className="text-4xl font-bold text-white tracking-tight">WatchTower</h1>
          </div>
          <h2 className="text-2xl font-semibold text-white">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-blue-200">
            Sign up to monitor your data quality
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl border border-white/20" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-blue-100 mb-1">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${errors.firstName ? 'border-red-400' : ''}`}
                  {...register('firstName', {
                    required: 'First name is required',
                  })}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-blue-100 mb-1">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${errors.lastName ? 'border-red-400' : ''}`}
                  {...register('lastName', {
                    required: 'Last name is required',
                  })}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-100 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${errors.email ? 'border-red-400' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-100 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${errors.password ? 'border-red-400' : ''}`}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Password must contain uppercase, lowercase, and number',
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-100 mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${errors.confirmPassword ? 'border-red-400' : ''}`}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-blue-200">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
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
