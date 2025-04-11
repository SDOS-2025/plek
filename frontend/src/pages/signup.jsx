import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthProvider";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, login, loading } = useContext(AuthContext);

  // Navigate to dashboard if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate, firstName, lastName]);

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
      console.log("Sending signup request:", { firstName, lastName, email, password });
      const response = await api.post(
        "/api/auth/register",
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
      await login({email, password}); // Login after signup

    } catch (err) {
      console.error("Signup error:", err.response?.data || err.message);
      const errorMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Signup failed. Please try again.";
      setError(errorMsg);
    }
  };

  const handleGoogleSignup = () => {
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
            {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-4 h-4"
                />
                Sign up with Google
              </button>
            </form>
          </div>
        </div>
      </div>
      <footer className="border-t border-gray-800 bg-[#1a1a1a]">
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
