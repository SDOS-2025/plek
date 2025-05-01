import React, { createContext, useState, useEffect, useContext } from "react";
import { fetchInstitutePolicies } from "../utils/institutePolicies";

// Create the context
export const PolicyContext = createContext();

export const PolicyProvider = ({ children }) => {
  const [policies, setPolicies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load policies on component mount
  useEffect(() => {
    const loadPolicies = async () => {
      try {
        setLoading(true);
        const data = await fetchInstitutePolicies();
        setPolicies(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load institute policies:", err);
        setError("Failed to load institute policies");
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();

    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(loadPolicies, 5 * 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Manually refresh policies function
  const refreshPolicies = async () => {
    try {
      setLoading(true);
      const data = await fetchInstitutePolicies();
      setPolicies(data);
      setError(null);
      return data;
    } catch (err) {
      console.error("Failed to refresh institute policies:", err);
      setError("Failed to refresh institute policies");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <PolicyContext.Provider
      value={{ policies, loading, error, refreshPolicies }}
    >
      {children}
    </PolicyContext.Provider>
  );
};

// Custom hook to use the policy context
export const usePolicies = () => {
  const context = useContext(PolicyContext);
  if (!context) {
    throw new Error("usePolicies must be used within a PolicyProvider");
  }
  return context;
};

export default PolicyProvider;
