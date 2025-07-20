import React, { useState } from "react";
import { setToken } from "../utils/auth";
import { API_BASE_URL } from "../config";
import { useNavigate, useLocation } from "react-router-dom";

// Optional: Orbitron for sci-fi touch, but lighter font-weight and sizes
const fontFamily = "'Orbitron', 'Segoe UI', Arial, sans-serif";

const LOGO_URL = "https://nltworkbench.com/storage/logo/default.png";
// If you uploaded another logo, you can use your file path instead.

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/liveness";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        navigate(from, { replace: true });
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Server error. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 60% 40%, #101726 70%, #0d7c66 170%, #0e2323 300%)",
        fontFamily,
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm relative z-10 bg-white/10 border border-[#21e3b7] shadow-[0_8px_60px_0px_#0d7c6640] rounded-3xl px-8 pb-8 pt-14 flex flex-col gap-5 backdrop-blur-md"
        style={{
          boxShadow: "0 0 40px 5px #0d7c6645, 0 1.5px 40px #29f3c399",
          border: "1.6px solid #21e3b7",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark Logo Background */}
        <img
          src={LOGO_URL}
          alt="Workbench Watermark"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 300,
            height: 300,
            opacity: 0.07,
            transform: "translate(-50%, -55%)",
            pointerEvents: "none",
            zIndex: 0,
            filter: "blur(0.5px)",
            userSelect: "none"
          }}
        />
        {/* Floating logo */}
        <div
          className="absolute left-1/2 -top-14 -translate-x-1/2 z-20"
          style={{
            background:
              "linear-gradient(135deg, #25d9aa 40%, #101726 90%)",
            borderRadius: "50%",
            padding: 7,
            boxShadow:
              "0 0 24px #21e3b7, 0 0 10px #0d7c66, 0 0 0 6px #101726",
            border: "2.5px solid #1fe4a8",
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={LOGO_URL}
            alt="Workbench Logo"
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "#181f1e",
              objectFit: "cover",
              display: "none",
              filter: "drop-shadow(0 0 8px #0d7c6688)",
            }}
          />
        </div>
        {/* Headline */}
        <div className="text-center mt-2 mb-0 relative z-10">
          <h2
            className="text-lg font-extrabold tracking-wide"
            style={{
              color: "#21e3b7",
              letterSpacing: "2.2px",
              fontFamily,
              textShadow: "0 0 6px #1fe4a880, 0 0 16px #0d7c66",
            }}
          > 
          </h2>
          <div
            className="text-[15px] font-medium tracking-wide mt-0.5"
            style={{
              color: "#8cf9e2",
              textShadow: "0 0 4px #0d7c6630",
              fontWeight: 400,
              letterSpacing: ".04em"
            }}
          >
            Sign in to Workbench Attendance
          </div>
        </div>

        <input
          type="text"
          placeholder="Email"
          autoFocus
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="rounded-lg px-4 py-2.5 border-2 bg-white/10 border-[#21e3b7] focus:ring-2 focus:ring-[#21e3b7] focus:outline-none text-base shadow-md transition placeholder:text-[#36d5c1] text-[#18b893] font-semibold"
          required
          style={{
            letterSpacing: ".05em",
            fontFamily,
            fontSize: 15.5,
            boxShadow: "0 0 7px #21e3b73c",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="rounded-lg px-4 py-2.5 border-2 bg-white/10 border-[#21e3b7] focus:ring-2 focus:ring-[#21e3b7] focus:outline-none text-base shadow-md transition placeholder:text-[#36d5c1] text-[#18b893] font-semibold"
          required
          style={{
            letterSpacing: ".05em",
            fontFamily,
            fontSize: 15.5,
            boxShadow: "0 0 7px #21e3b73c",
          }}
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-[#0d7c66] hover:bg-[#21e3b7] transition font-bold text-white py-2.5 text-base tracking-widest border border-[#21e3b7] shadow-lg hover:shadow-[#29f3c3b8] mt-1"
          disabled={loading}
          style={{
            fontFamily,
            letterSpacing: ".11em",
            fontWeight: 700,
            textShadow: "0 0 7px #0d7c66a1",
            borderWidth: 2,
            boxShadow: "0 0 12px #1fe4a885"
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#1fe4a8"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="#1fe4a8"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span style={{
                color: "#b1ffec",
                textShadow: "0 0 7px #1fe4a8bb",
                fontSize: 15
              }}>Signing in...</span>
            </span>
          ) : (
            "SIGN IN"
          )}
        </button>

        {error && (
          <div
            className="text-center py-2 px-3 rounded-lg border-2 border-[#f44336] font-semibold text-xs shadow mt-1"
            style={{
              color: "#f44336",
              background: "#ffccda14",
              fontFamily,
              boxShadow: "0 0 8px #f4433650",
              letterSpacing: ".06em"
            }}
          >
            {error}
          </div>
        )}

        <div
          className="flex justify-between text-xs mt-1"
          style={{
            color: "#5bfce2",
            fontFamily,
            letterSpacing: ".05em"
          }}
        >
          <span>
            © {new Date().getFullYear()} Workbench  
          </span>
          
        </div>
      </form>
      {/* Optional Neon Glow on Background */}
      <div
        style={{
          position: "fixed",
          zIndex: 0,
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 60% 20%, #21e3b725 0%, transparent 70%), radial-gradient(ellipse at 30% 80%, #0d7c6614 0%, transparent 80%)",
        }}
      />
    </div>
  );
}
