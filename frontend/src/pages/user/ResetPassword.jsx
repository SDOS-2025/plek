import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import api from "../../api";
import Footer from "../../components/Footer";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [uid, setUid] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Extract token and uid from URL parameters or route params
  useEffect(() => {
    // First try getting from URL search params
    const searchParams = new URLSearchParams(location.search);
    let tokenParam = searchParams.get("token");
    let uidParam = searchParams.get("uid");
    
    // If not in search params, try from route params
    if (!tokenParam && params.token) {
      tokenParam = params.token;
    }
    
    if (!uidParam && params.uid) {
      uidParam = params.uid;
    }
    
    if (tokenParam) setToken(tokenParam);
    if (uidParam) setUid(uidParam);
  }, [location, params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token || !uid) {
      setError("Invalid or missing password reset token. Please try requesting a new password reset.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call the password reset confirmation endpoint
      const response = await api.post(
        "/api/auth/password/reset/confirm/",
        {
          new_password1: password,
          new_password2: confirmPassword,
          token: token,
          uid: uid
        },
        { withCredentials: true }
      );
      console.log("Password reset confirmation response:", response.data);
      setSuccess(true);
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err.response?.data || err.message);
      
      // Get the specific error message
      let errorMsg = "Failed to reset your password. Please try again.";
      
      if (err.response?.data) {
        if (err.response.data.new_password1) {
          errorMsg = err.response.data.new_password1[0];
        } else if (err.response.data.new_password2) {
          errorMsg = err.response.data.new_password2[0];
        } else if (err.response.data.token) {
          errorMsg = err.response.data.token[0];
        } else if (err.response.data.uid) {
          errorMsg = err.response.data.uid[0];
        } else if (err.response.data.non_field_errors) {
          errorMsg = err.response.data.non_field_errors[0];
        }
      }
      
      setError(errorMsg);
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
            <h2 className="card-header text-center">Set New Password</h2>
            
            {error && (
              <div className="mb-6 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}
            
            {success ? (
              <div className="mb-6 p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
                <p>Your password has been successfully reset! You will be redirected to the login page shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full p-3 rounded bg-plek-lightgray border ${
                      error?.includes("password") ? "border-red-500" : "border-gray-700"
                    } text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
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
                  disabled={isSubmitting}
                  className={`w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors ${
                    isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
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
        </div>
      </div>

      <Footer />
    </div>
  );
}