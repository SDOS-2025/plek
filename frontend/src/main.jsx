import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";
import { PolicyProvider } from "./context/PolicyProvider";

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PolicyProvider>
          <App />
        </PolicyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
