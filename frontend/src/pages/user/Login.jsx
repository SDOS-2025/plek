import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { AuthContext } from "../../context/AuthProvider";
import Footer from "../../components/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleSdkLoaded, setGoogleSdkLoaded] = useState(false);
  const navigate = useNavigate();
  const { user, login, loading } = useContext(AuthContext);

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (window.google && window.google.accounts) {
      console.log("Google SDK loaded, initializing...");
      window.google.accounts.id.initialize({
        client_id:
          "47840497232-2q9v23fnco2ijfok7l56hlh8356of7lb.apps.googleusercontent.com",
        callback: handleGoogleLogin,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        {
          type: "standard",
          size: "large",
          text: "sign_in_with",
          shape: "rectangular",
          theme: "filled_black",
          logo_alignment: "left",
          width: "300",
        }
      );
      setGoogleSdkLoaded(true);
    } else {
      console.warn("Google SDK not loaded");
      const checkGoogleSdk = setInterval(() => {
        if (window.google && window.google.accounts) {
          console.log("Google SDK loaded on retry");
          setGoogleSdkLoaded(true);
          clearInterval(checkGoogleSdk);
        }
      }, 100);
      return () => clearInterval(checkGoogleSdk);
    }
  }, []);

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

  const handleGoogleLogin = async (response) => {
    try {
      setError("");
      console.log("Google login response:", response);
      const socialData = { access_token: response.credential };
      const res = await login({ social: true, socialData });
      console.log("Google login response:", res);
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(
        err.response?.data?.error ||
          "Failed to sign in with Google. Please try again."
      );
    }
  };

  const handleManualGoogleLogin = () => {
    console.log("Manual Google login triggered");
    window.location.href = "http://localhost:8000/api/auth/google/";
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
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-plek-dark text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div
              id="google-signin-button"
              className="flex justify-center"
            ></div>
            {!googleSdkLoaded && (
              <button
                type="button"
                onClick={handleManualGoogleLogin}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors mt-4"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-4 h-4"
                />
                Sign in with Google (Fallback)
              </button>
            )}
          </div>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-plek-purple hover:text-purple-400 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
