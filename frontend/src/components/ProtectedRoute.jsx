// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute: wraps children and checks admin login from localStorage.
 * If admin is not logged in, redirect to the login page ("/").
 *
 * This is intentionally minimal (no JWT verification). For production,
 * replace this with a real token/session check against the backend.
 */
export default function ProtectedRoute({ children }) {
  try {
    const isAdmin = localStorage.getItem("adminAuth") === "true";
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
    return children;
  } catch (err) {
    return <Navigate to="/" replace />;
  }
}
