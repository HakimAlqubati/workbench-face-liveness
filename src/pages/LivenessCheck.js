import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const API_URL = "http://192.168.8.153:8000/analyze"; // عدّل حسب عنوان سيرفرك

export default function LivenessCheck() {
  const webcamRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // دالة التقاط الصورة وإرسالها للباك إند
  const captureAndSend = async () => {
    setLoading(true);
    setResult(null);

    // التقاط صورة من الكاميرا
    const imageSrc = webcamRef.current.getScreenshot();

    // تحويل Base64 إلى Blob
    const blob = await fetch(imageSrc).then(res => res.blob());
    const formData = new FormData();
    formData.append("image", blob, "capture.jpg");

    // إرسال للباك إند
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Error sending image to backend" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Liveness Detection Test</h1>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={350}
        videoConstraints={{ facingMode: "user" }}
      />
      <div style={{ margin: "20px" }}>
        <button onClick={captureAndSend} disabled={loading}>
          {loading ? "Checking..." : "Start Liveness Check"}
        </button>
      </div>
      <div>
        {result && (
          result.error
            ? <div style={{ color: "red" }}>{result.error}</div>
            : <pre style={{ textAlign: "left", display: "inline-block" }}>{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
