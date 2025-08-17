import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AttendanceKeypadPage from "./pages/AttendanceKeypadPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";  
import FaceLivenesAdvanced from "./pages/FaceLivenesAdvanced"; 
 

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
            to="/advanced-webcam"
            style={buttonStyle}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = ""}
            onMouseLeave={e => e.currentTarget.style.transform = ""}
          >
            Advanced Webcam
          </Link>
          
          

          <Link
            to="/keypad"
            style={{
              ...buttonStyle,
              background: "linear-gradient(90deg, #0d7c66 65%, #47e0bf 100%)"
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

const buttonStyle = {
  background: "linear-gradient(90deg, #0d7c66 60%, #29e3d0 100%)",
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
};

export default function App() {
  return (
    <BrowserRouter basename="/">
      <Routes>
      
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/advanced-webcam"
          element={
            <ProtectedRoute>
              <FaceLivenesAdvanced />
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
       
       
        <Route
          path="*"
          element={
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
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
