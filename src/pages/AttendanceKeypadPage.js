import React, { useState } from "react";
import LoginForm from "../components/LoginForm";
import AttendanceKeypad from "../components/AttendanceKeypad";
import { getToken } from "../utils/auth";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());

  const handleLogin = () => setIsLoggedIn(true);

  return (
    <div>
      {isLoggedIn
        ? <AttendanceKeypad />
        : <LoginForm onLogin={handleLogin} />
      }
    </div>
  );
}

export default App;
