import React, { useState, useEffect, useCallback } from "react";
import { FiDelete } from "react-icons/fi";
import { MdDeleteForever } from "react-icons/md";
import { BiFingerprint } from "react-icons/bi";
import { apiFetch } from "../utils/api";

// Toast
function Toast({ message, show, success = true, onClose }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);
  if (!show) return null;
  return (
    <div
      className={`
        fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-8 py-5 rounded-[2rem]
        shadow-[0_4px_24px_rgba(13,124,102,0.13)]
        text-xl font-bold transition-all duration-300 backdrop-blur-xl
        ${success ? "bg-gradient-to-r from-emerald-500/90 to-teal-400/90 text-white" : "bg-gradient-to-r from-red-600/90 to-pink-500/90 text-white"}
        border border-white/20
      `}
      style={{ minWidth: 220, maxWidth: 380, textAlign: "center", cursor: "pointer", letterSpacing: "1.5px" }}
      onClick={onClose}
      title="Click to close"
    >
      {message}
    </div>
  );
}

function formatDateTime(dateObj) {
  const pad = n => n.toString().padStart(2, '0');
  return (
    dateObj.getFullYear() + '-' +
    pad(dateObj.getMonth() + 1) + '-' +
    pad(dateObj.getDate()) + ' ' +
    pad(dateObj.getHours()) + ':' +
    pad(dateObj.getMinutes()) + ':' +
    pad(dateObj.getSeconds())
  );
}

export default function AttendanceKeypad() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [apiSuccess, setApiSuccess] = useState(null);
  const [toastShow, setToastShow] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const digitalClock = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  useEffect(() => {
    if (apiMessage) setToastShow(true);
  }, [apiMessage]);

  const handleToastClose = useCallback(() => {
    setToastShow(false);
    setTimeout(() => {
      setApiMessage("");
      setApiSuccess(null);
    }, 400);
  }, []);

  const handleDigit = digit => input.length < 10 && setInput(input + digit);
  const handleBackspace = () => setInput(input.slice(0, -1));
  const handleClear = () => setInput("");

  const handleStore = async () => {
    if (!input) return;
    setLoading(true);
    setApiMessage("");
    setApiSuccess(null);
    try {
      const params = {
        rfid: input,
          date_time: formatDateTime(new Date()),

      };
      console.log('params',params)
      const response = await apiFetch("/hr/attendance/store", {
        method: "POST",
        body: JSON.stringify(params),
      });

      const isSuccess = response.status === true;
      setApiSuccess(isSuccess);

      if (!isSuccess) {
        let message = response.message || "Failed to record attendance.";
        if (response.errors) {
          const allErrors = Object.values(response.errors)
            .flat()
            .join(" | ");
          message = allErrors;
        }
        setApiMessage(message);
      } else {
        setApiMessage(response.message || "Attendance recorded successfully.");
        setInput("");
      }
    } catch (error) {
      setApiSuccess(false);
      setApiMessage("Error connecting to server.");
    }
    setLoading(false);
  };

  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['back', 0, 'clear']
  ];

  // زر الأرقام بدون توهج
  const renderButton = val => {
    if (val === 'back') return (
      <button
        key="back"
        onClick={handleBackspace}
        className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-[#f8fff7] 
          border border-[#f5eccc] shadow-[0_2px_10px_0_rgba(13,124,102,0.09)]
          flex items-center justify-center transition-all duration-150
          hover:bg-yellow-50 active:scale-95"
        title="Backspace"
        tabIndex={-1}
      >
        <FiDelete className="text-xl md:text-2xl text-[#c0392b]" />
      </button>
    );
    if (val === 'clear') return (
      <button
        key="clear"
        onClick={handleClear}
        className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-[#fff6f6]
          border border-[#f5eccc] shadow-[0_2px_10px_0_rgba(180,30,30,0.09)]
          flex items-center justify-center transition-all duration-150
          hover:bg-red-100 active:scale-95"
        title="Clear All"
        tabIndex={-1}
      >
        <MdDeleteForever className="text-xl md:text-2xl text-[#d43843]" />
      </button>
    );
    // أزرار الأرقام بدون توهج
    return (
      <button
        key={val}
        onClick={() => handleDigit(val)}
        className="h-14 w-14 md:h-16 md:w-16 rounded-2xl 
          bg-white/95 text-[#0d7c66] font-bold text-2xl md:text-3xl
          shadow-[0_4px_20px_0_rgba(13,124,102,0.10)]
          border border-[#0d7c66]/12
          flex items-center justify-center
          hover:bg-[#e0f7ef] active:bg-[#b8f8df] 
          focus-visible:ring-2 focus-visible:ring-[#0d7c66]/30
          transition-all duration-100"
        style={{ fontVariantNumeric: "tabular-nums" }}
        tabIndex={-1}
      >
        {val}
      </button>
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at 70% 90%, #b7ffe5 0%, #0d7c66 70%, #02291f 100%)",
      }}
    >
      <Toast
        message={apiMessage}
        show={toastShow}
        success={apiSuccess === true}
        onClose={handleToastClose}
      />

      <div
        className="
          bg-white/40 rounded-[2rem]
          shadow-[0_8px_40px_0_rgba(13,124,102,0.13)]
          border-[4px] border-[#0d7c66] outline outline-[8px] outline-[#caffee] 
          backdrop-blur-2xl
          px-6 py-7 w-[320px] md:w-[370px] flex flex-col gap-7 relative overflow-hidden
          animate-fadeIn
        "
      >
        {/* خلفية جمالية إضافية */}
        <div className="absolute -top-8 -right-12 w-40 h-40 bg-gradient-to-br from-[#d0fff5]/35 to-[#0d7c66]/0 blur-2xl rounded-full opacity-90 z-0 pointer-events-none"></div>
        <div className="absolute -bottom-16 left-0 w-52 h-52 bg-gradient-to-tr from-[#caffee]/45 to-[#0d7c66]/0 blur-2xl rounded-full opacity-80 z-0 pointer-events-none"></div>
        
        {/* الوقت */}
        <div className="flex flex-col items-center mb-2 z-10">
          <span className="text-2xl md:text-3xl font-mono"
            style={{
              color: "#09523e",
              textShadow: "0 2px 8px #fff8, 0 1px 1px #0d7c6677"
            }}
          >{digitalClock}</span>
        </div>
        {/* شاشة الإدخال */}
        <div className="text-4xl md:text-5xl font-mono text-center py-6 bg-white/90 rounded-2xl border border-[#0d7c66]/15 select-none tracking-widest mb-1 h-20 flex items-center justify-center shadow-inner z-10">
          {input
            ? <span className="text-[#0d7c66] drop-shadow-md">{input}</span>
            : <span className="text-slate-300">—</span>
          }
        </div>
        {/* الأزرار */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 z-10 justify-items-center">
          {rows.flat().map(renderButton)}
        </div>
        {/* زر البصمة مع توهج فقط */}
        <button
          onClick={handleStore}
          disabled={!input || loading}
          className={`
            w-full mt-4 py-6 rounded-[1.5rem]
            bg-gradient-to-r from-[#0d7c66] via-[#1be69e] to-[#8bffe7]
            hover:from-[#098f72] hover:to-[#81ffe5]
            active:scale-95
            text-white text-lg font-bold shadow-lg flex flex-col items-center justify-center gap-2 transition-all duration-150
            border-2 border-[#0d7c66]/20
            ${(!input || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_24px_0_rgba(13,124,102,0.11)]'}
          `}
          title="Confirm attendance"
        >
          {loading
            ? (
              <span className="flex flex-col items-center">
                <svg className="animate-spin mb-3" width="38" height="38" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#19eab2" strokeWidth="6" strokeLinecap="round" strokeDasharray="31 100" />
                </svg>
                <BiFingerprint className="text-5xl md:text-6xl text-white drop-shadow-lg animate-glow" />
              </span>
            )
            : (
              <BiFingerprint className="text-5xl md:text-6xl text-white drop-shadow-lg animate-glow" />
            )
          }
        </button>
      </div>
      {/* تأثيرات أنيميشن للواجهة والتوهج */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(.95);}
          to { opacity: 1; transform: scale(1);}
        }
        .animate-fadeIn { animation: fadeIn 0.7s cubic-bezier(.19,1,.22,1) both; }
        @keyframes glow {
          0%,100% { filter: drop-shadow(0 0 0px #fff); }
          50%     { filter: drop-shadow(0 0 20px #fff); }
        }
        .animate-glow { animation: glow 1.6s infinite alternate; }
        .drop-shadow-lg { filter: drop-shadow(0 0 8px #0d7c66aa) drop-shadow(0 0 2px #fff); }
        .animate-pulse-slow { animation: pulse 3s cubic-bezier(.4,0,.6,1) infinite; }
      `}</style>
    </div>
  );
}
