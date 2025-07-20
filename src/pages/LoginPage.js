import React, { useEffect } from "react";

import LoginForm from "../components/LoginForm";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
      const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      // المستخدم عنده توكن بالفعل
      navigate("/", { replace: true });
    }
  }, []);

  return <LoginForm />;
}
