import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthProvider";
import Footer from "../components/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, login, loading } = useContext(AuthContext);

  // Navigate to dashboard when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      console.log("Sending login request with email:", email);
      const response = await login({ email, password });
      console.log("Login response:", response);

    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.email?.[0] ||
        "Invalid email or password"
      );
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://127.0.0.1:8000/accounts/google/login/";
  };

  return (
    <div className="page-container auth-page">
      <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-12 flex justify-center">
            <Link to="/">
              <h1 className="text-5xl font-bold text-plek-purple">Plek</h1>
            </Link>
          </div>

          <div className="section-card">
            <h2 className="card-header text-center">Welcome Back</h2>
            {error && (
              <div className="mb-6 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-plek-purple hover:text-purple-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Sign in
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-plek-dark text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-4 h-4"
                />
                Sign in with Google
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link to="/signup" className="text-plek-purple hover:text-purple-400 font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
