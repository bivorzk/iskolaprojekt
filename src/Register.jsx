import React, { useState } from 'react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isParent: false,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setLoading(true);

    try {
      // Execute reCAPTCHA v3
      const token = await new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute('6LfkaeErAAAAAEzBV6Puvepk4UoMKNyMPlKqbQmk', { action: 'register' }).then(resolve).catch(reject);
        });
      });

      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ...formData,
          'g-recaptcha-response': token,
        }),
      });

      if (response.ok) {
        const message = await response.text();
        alert('Registration successful: ' + message);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          isParent: false,
        });
      } else {
        const error = await response.text();
        alert('Registration failed: ' + error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <svg viewBox="0 0 500 140" className="mx-auto h-16 w-auto">
            {/* Tray base */}
            <rect x="25" y="55" width="90" height="50" rx="6" fill="#FF6B35"/>
            {/* Tray compartments */}
            <rect x="30" y="60" width="35" height="40" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="95" y="60" width="20" height="18" rx="3" fill="#FFE5DC"/>
            <rect x="70" y="82" width="45" height="18" rx="3" fill="#FFE5DC"/>
            {/* Lightning/Snap element */}
            <path d="M80 25 L65 52 L75 52 L60 80 L85 50 L75 50 L90 25 Z" fill="#FFC857" stroke="#FF6B35" strokeWidth="2" strokeLinejoin="round"/>
            {/* Text */}
            <text x="150" y="85" fontFamily="system-ui, -apple-system, sans-serif" fontSize="56" fontWeight="bold" fill="#FF6B35" letterSpacing="-1">SnapTray</text>
            <text x="150" y="105" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fill="#6C757D" letterSpacing="2">SCHOOL CAFETERIA ORDERING</text>
          </svg>
        </div>

        <div className="bg-white shadow-2xl rounded-lg p-8">
          <h2 className="text-3xl font-bold text-center text-primary mb-8">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isParent"
                name="isParent"
                checked={formData.isParent}
                onChange={handleChange}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="isParent" className="ml-2 block text-sm text-gray-900">
                Parent Account
              </label>
            </div>

            <div className="text-xs text-gray-500">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy" className="text-primary hover:text-secondary">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="https://policies.google.com/terms" className="text-primary hover:text-secondary">
                Terms of Service
              </a>{' '}
              apply.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Verifying...' : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/" className="font-medium text-primary hover:text-secondary">
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;