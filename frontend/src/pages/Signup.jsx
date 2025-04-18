import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthProvider";
import Footer from "../components/Footer";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [googleSdkLoaded, setGoogleSdkLoaded] = useState(false);
  const navigate = useNavigate();
  const { user, login, loading } = useContext(AuthContext);

  // Navigate to dashboard if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Initialize Google Sign-In SDK
  useEffect(() => {
    if (window.google && window.google.accounts) {
      console.log("Google SDK loaded, initializing...");
      window.google.accounts.id.initialize({
        client_id:
          "47840497232-2q9v23fnco2ijfok7l56hlh8356of7lb.apps.googleusercontent.com",
        callback: handleGoogleSignup,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signup-button"),
        {
          type: "standard",
          size: "large",
          text: "signup_with",
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

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      console.log("Sending signup request:", {
        firstName,
        lastName,
        email,
        password,
      });
      const response = await api.post(
        "/api/auth/register/",
        {
          first_name: firstName,
          last_name: lastName,
          email,
          password1: password,
          password2: confirmPassword,
          user_category: "student",
        },
        { withCredentials: true }
      );
      console.log("Signup response:", response.data);
      await login({ email, password }); // Login after signup
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Signup failed. Please try again.";
      setError(errorMsg);
    }
  };

  const handleGoogleSignup = async (response) => {
    try {
      setError("");
      console.log("Google signup response:", response);
      const socialData = { access_token: response.credential };
      const res = await login({ social: true, socialData });
      console.log("Google signup response:", res);
      navigate("/dashboard");
    } catch (err) {
      console.error("Google signup error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(
        err.response?.data?.error ||
          "Failed to sign up with Google. Please try again."
      );
    }
  };

  const handleManualGoogleSignup = () => {
    console.log("Manual Google signup triggered");
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
            <h2 className="card-header text-center">Create Your Account</h2>

            {error && (
              <div className="mb-6 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                    required
                  />
                </div>
              </div>

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
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Create account
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
              id="google-signup-button"
              className="flex justify-center"
            ></div>
            {!googleSdkLoaded && (
              <button
                type="button"
                onClick={handleManualGoogleSignup}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors mt-4"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-4 h-4"
                />
                Sign up with Google (Fallback)
              </button>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-plek-purple hover:text-purple-400 font-medium"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
