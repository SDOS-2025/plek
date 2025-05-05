import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { AuthContext } from "../../context/AuthProvider";
import Footer from "../../components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!email) {
      setError("Email address is required");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call the password reset endpoint
      console.log("Sending password reset request for email:", email);
      const response = await api.post(
        "/api/auth/password/reset/",
        { email },
        { withCredentials: true }
      );
      console.log("Password reset response:", response.data);
      setSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err.response?.data || err.message);
      setError(
        err.response?.data?.email?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Failed to process your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
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
            <h2 className="card-header text-center">Reset Your Password</h2>
            
            {error && (
              <div className="mb-6 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}
            
            {success ? (
              <div className="mb-6 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
                <p>Password reset email sent! Please check your inbox for instructions to reset your password.</p>
              </div>
            ) : (
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? "Sending..." : "Reset Password"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-400">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-plek-purple hover:text-purple-400 font-medium"
              >
                Back to login
              </Link>
            </div>
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