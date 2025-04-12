import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthProvider";

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
    <div className="min-h-screen bg-plek-background flex flex-col">
      <div className="flex-grow flex flex-col items-center p-32">
        <div className="w-full max-w-md">
          <div className="mb-32 flex justify-center">
            <h1 className="text-6xl font-bold text-white">Plek</h1>
          </div>

          <div className="bg-plek-dark p-8 rounded-lg shadow-xl">
            {error && (
              <div className="mb-4 text-red-500 text-center">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-plek-purple hover:text-purple-400"
                >
                  Forgot your password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Login
              </button>

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
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white transition-colors">
              About us
            </Link>
            <Link to="/help" className="hover:text-white transition-colors">
              Help Center
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
