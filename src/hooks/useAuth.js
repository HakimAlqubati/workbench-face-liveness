import { useState } from "react";
import { getToken } from "../utils/auth";

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const login = () => setIsLoggedIn(true);
  const logout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  };
  return { isLoggedIn, login, logout };
}
