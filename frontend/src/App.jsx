// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminLogin from "./components/AdminLogin";
import AddStudent from "./pages/AddStudent";
import Attendance from "./pages/Attendance";
import StudentList from "./components/StudentList";
import PollSummary from "./pages/PollSummary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  palette: {
    primary: { main: "#007BFF" },
    secondary: { main: "#28A745" },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public */}
        <Route path="/" element={<AdminLogin />} />

        {/* Protected routes (admin only) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AddStudent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <StudentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/poll-summary"
          element={
            <ProtectedRoute>
              <PollSummary />
            </ProtectedRoute>
          }
        />

        {/* Fallback: any other routes -> login */}
        <Route path="*" element={<AdminLogin />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
