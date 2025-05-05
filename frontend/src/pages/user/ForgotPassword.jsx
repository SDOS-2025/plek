import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { AuthContext } from "../../context/AuthProvider";
import Footer from "../../components/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
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

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Email address is required");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call the password reset OTP endpoint
      console.log("Sending password reset OTP request for email:", email);
      const response = await api.post(
        "/api/accounts/password/reset-otp/",
        { email },
        { withCredentials: true }
      );
      console.log("Password reset OTP response:", response.data);
      setStep(2); // Move to OTP verification step
    } catch (err) {
      console.error("Password reset error:", err.response?.data || err.message);
      setError(
        err.response?.data?.detail ||
        "Failed to process your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!otp) {
      setError("OTP is required");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      // Call the reset password with OTP endpoint
      const response = await api.post(
        "/api/accounts/password/reset-with-otp/",
        { 
          email,
          otp,
          new_password: newPassword
        },
        { withCredentials: true }
      );
      console.log("Password reset response:", response.data);
      setSuccess(true);
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err.response?.data || err.message);
      setError(
        err.response?.data?.detail ||
        "Failed to reset your password. Please check your OTP and try again."
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
                <p>Your password has been reset successfully! You will be redirected to the login page shortly.</p>
              </div>
            ) : (
              <>
                {step === 1 ? (
                  <form onSubmit={handleRequestOTP} className="space-y-6">
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
                      {isSubmitting ? "Sending..." : "Send OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Enter OTP
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                        required
                      />
                      <p className="mt-1 text-sm text-gray-400">Check your email for the OTP</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-3 rounded bg-plek-lightgray border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
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

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-plek-purple hover:text-purple-400"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`bg-plek-purple hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors ${
                          isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                      >
                        {isSubmitting ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </form>
                )}
              </>
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