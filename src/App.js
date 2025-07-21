// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LivenessCheck from "./pages/LivenessCheck";
import AttendanceKeypadPage from "./pages/AttendanceKeypadPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

const PRIMARY_COLOR = "#0d7c66";
const PRIMARY_GRADIENT = "linear-gradient(90deg, #0d7c66 70%, #21bfa5 100%)";

function HomePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e5f9f6 0%, #f3fcfb 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui,Segoe UI,Roboto,sans-serif"
    }}>
      <div style={{
        background: "#fff",
        padding: "44px 32px",
        borderRadius: "22px",
        boxShadow: "0 8px 36px 0 #b3e4dc20, 0 2px 8px #0d7c6622",
        maxWidth: 390,
        width: "98vw",
        textAlign: "center",
        border: `2px solid #0d7c6615`
      }}>
     
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginBottom: 12
        }}>
          <Link
            to="/liveness"
            style={{
              background: PRIMARY_GRADIENT,
              color: "#fff",
              fontWeight: 700,
              fontSize: 17,
              border: "none",
              borderRadius: 11,
              padding: "15px 0",
              textDecoration: "none",
              boxShadow: "0 2px 8px #0d7c6640",
              letterSpacing: ".2px",
              transition: "transform .13s,box-shadow .18s"
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = ""}
            onMouseLeave={e => e.currentTarget.style.transform = ""}
          >
            Face Liveness (Camera)
          </Link>
          <Link
            to="/keypad"
            style={{
              background: "linear-gradient(90deg, #0d7c66 65%, #47e0bf 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 17,
              border: "none",
              borderRadius: 11,
              padding: "15px 0",
              textDecoration: "none",
              boxShadow: "0 2px 8px #0d7c6630",
              letterSpacing: ".2px",
              transition: "transform .13s,box-shadow .18s"
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = ""}
            onMouseLeave={e => e.currentTarget.style.transform = ""}
          >
            Attendance Keypad
          </Link>
        </div>
        <div style={{
          marginTop: 20,
          color: "#91b4ad",
          fontSize: 13.2,
          letterSpacing: ".06em"
        }}>
          &copy; {new Date().getFullYear()} Workbench Attendance System
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/react-app">
      <Routes>
        {/* Home Page: Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Pages */}
        <Route
          path="/liveness"
          element={
            <ProtectedRoute>
              <LivenessCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keypad"
          element={
            <ProtectedRoute>
              <AttendanceKeypadPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Page */}
        <Route path="*" element={
          <div style={{
            textAlign: 'center',
            marginTop: '70px',
            color: '#e3342f',
            fontSize: 28,
            fontWeight: 600,
            fontFamily: 'system-ui,Roboto,sans-serif'
          }}>
            404 | Page Not Found
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
