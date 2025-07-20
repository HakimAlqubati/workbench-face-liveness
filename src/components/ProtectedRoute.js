// src/components/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../utils/auth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const isLoggedIn = !!getToken();

  if (!isLoggedIn) {
    // أعد توجيه المستخدم إلى /login، واحفظ الوجهة السابقة ليعود لها بعد الدخول
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
