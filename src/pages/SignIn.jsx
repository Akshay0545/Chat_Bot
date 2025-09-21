import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser, clearError } from '../store/authSlice';

const SignIn = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component unmounts or form changes
  React.useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
    if (error) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await dispatch(loginUser(formData)).unwrap();
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by the auth slice
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-25 to-indigo-50 flex items-center justify-center px-2.5 sm:px-4 lg:px-5 overflow-hidden">
      <div className="max-w-sm w-full">
        <div className="bg-white shadow-xl border-2 border-gray-200 p-2.5 sm:p-4" style={{borderRadius: '16px'}}>
          <div className="text-center mb-4">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign In</h1>
            <p className="text-gray-600 text-xs">Enter your credentials to access your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-gray-900 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-3 border-0 rounded-2xl shadow-inner focus:outline-none focus:ring-0 focus:border focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-900 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pr-10 border-0 rounded-2xl shadow-inner focus:outline-none focus:ring-0 focus:border focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1A1A1A] hover:text-[#3B82F6] transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3B82F6] text-white py-3 px-4 rounded-2xl font-semibold hover:bg-[#5692f2] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-sm"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-xs">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;