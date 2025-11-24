import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

// WatchTower Logo SVG Component
const WatchTowerLogo = () => (
  <svg
    viewBox="0 0 200 200"
    className="w-48 h-48 md:w-64 md:h-64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Tower base structure */}
    <path
      d="M70 180 L80 100 L120 100 L130 180"
      stroke="url(#towerGradient)"
      strokeWidth="3"
      fill="none"
    />
    {/* Tower cross beams */}
    <line x1="82" y1="120" x2="118" y2="120" stroke="url(#towerGradient)" strokeWidth="2" />
    <line x1="84" y1="140" x2="116" y2="140" stroke="url(#towerGradient)" strokeWidth="2" />
    <line x1="86" y1="160" x2="114" y2="160" stroke="url(#towerGradient)" strokeWidth="2" />
    {/* Diagonal supports */}
    <line x1="80" y1="100" x2="116" y2="140" stroke="url(#towerGradient)" strokeWidth="1.5" opacity="0.7" />
    <line x1="120" y1="100" x2="84" y2="140" stroke="url(#towerGradient)" strokeWidth="1.5" opacity="0.7" />
    <line x1="84" y1="140" x2="114" y2="160" stroke="url(#towerGradient)" strokeWidth="1.5" opacity="0.7" />
    <line x1="116" y1="140" x2="86" y2="160" stroke="url(#towerGradient)" strokeWidth="1.5" opacity="0.7" />

    {/* Tower top/cabin */}
    <rect x="75" y="85" width="50" height="20" rx="2" stroke="url(#towerGradient)" strokeWidth="2.5" fill="rgba(59, 130, 246, 0.1)" />

    {/* Tower roof */}
    <path d="M70 85 L100 55 L130 85" stroke="url(#towerGradient)" strokeWidth="2.5" fill="none" />

    {/* Magnifying glass */}
    <circle cx="100" cy="70" r="20" stroke="url(#glassGradient)" strokeWidth="3" fill="rgba(59, 130, 246, 0.15)" />
    <line x1="114" y1="84" x2="130" y2="100" stroke="url(#glassGradient)" strokeWidth="4" strokeLinecap="round" />

    {/* Glow effect for magnifying glass */}
    <circle cx="100" cy="70" r="12" fill="url(#glowGradient)" opacity="0.3" />

    {/* Small data dots inside magnifying glass */}
    <circle cx="93" cy="65" r="2" fill="#60A5FA" />
    <circle cx="100" cy="72" r="2" fill="#60A5FA" />
    <circle cx="107" cy="68" r="2" fill="#60A5FA" />

    <defs>
      <linearGradient id="towerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93C5FD" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
      <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        {/* Bottom cityscape silhouette effect */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/30 to-transparent" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col items-center justify-center relative z-10 p-12">
        <div className="flex flex-col items-center">
          <WatchTowerLogo />
          <h1 className="text-5xl xl:text-6xl font-bold text-white mt-4 tracking-wide">
            WatchTower
          </h1>
          <p className="text-xl xl:text-2xl text-blue-300 mt-3 font-light tracking-wider">
            Reconciliation Data Analytics
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center relative z-10 p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <WatchTowerLogo />
            </div>
            <h1 className="text-3xl font-bold text-white">WatchTower</h1>
            <p className="text-blue-300 mt-1">Reconciliation Data Analytics</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  Username
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full px-4 py-3 bg-white/90 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="Username"
                  {...register('email', {
                    required: 'Username is required',
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
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 bg-white/90 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Password"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...register('rememberMe')}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-300">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit(onSubmit)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25"
              >
                {loading ? 'Signing in...' : 'Log In'}
              </button>

              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 underline">
                  Forgot Password?
                </Link>
              </div>

              <p className="text-center text-sm text-gray-400 pt-2 border-t border-white/10">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Powered by Prodapt */}
      <div className="absolute bottom-4 right-6 flex items-center gap-2 z-20">
        <span className="text-sm text-gray-400">Powered by</span>
        <img
          src="https://cms-eu.jibecdn.com/prod/prodapt/assets/OPENGRAPH-IMAGE-en-us-1738676924627.jpg"
          alt="Prodapt"
          className="h-8 object-contain rounded"
        />
      </div>
    </div>
  );
}
