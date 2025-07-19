// src/components/LoginForm.js
import React, { useState } from "react";
import { setToken } from "../utils/auth";
import { API_BASE_URL } from "../config";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      console.log(data)
      if (data.token) {
        setToken(data.token);
        onLogin && onLogin(data.user); // إذا أردت عمل setUser في الـ app
      } else {
        setError(data.message || "فشل تسجيل الدخول");
      }
    } catch {
      setError("خطأ في الاتصال بالسيرفر.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80 mx-auto mt-20 bg-white shadow-lg rounded-xl p-8">
      <h2 className="text-xl font-bold text-center mb-2">تسجيل الدخول</h2>
      <input
        type="text"
        placeholder="البريد الإلكتروني"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700"
        disabled={loading}
      >{loading ? "جاري الدخول..." : "دخول"}</button>
      {error && <div className="text-red-600 text-center">{error}</div>}
    </form>
  );
}
