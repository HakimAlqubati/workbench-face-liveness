import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { LOCAL_PYTHON_BASE_API } from "../config";
const API_URL = `${LOCAL_PYTHON_BASE_API}/liveness`; // عدل حسب مسار Flask API

export default function FaceDetectionLiveness() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [livenessResult, setLivenessResult] = useState(null);
  const [loadingLiveness, setLoadingLiveness] = useState(false);

  // 1. تحميل نماذج face-api.js
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/react-app/models"; // عدل حسب مسارك
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  // 2. تشغيل الكاميرا بعد تحميل النماذج
  useEffect(() => {
    if (modelsLoaded) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          alert("Camera error: " + err.message);
        });
    }
  }, [modelsLoaded]);

  // 3. كشف الوجه ورسم المربع
  useEffect(() => {
    let interval;
    function onPlay() {
      interval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          // تأكد من ضبط أبعاد الكانفاس تلقائيًا
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions()
          );
          const dims = { width: video.videoWidth, height: video.videoHeight };
          const resizedDetections = faceapi.resizeResults(detections, dims);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections, {
            boxColor: "#13ca72", // أخضر
            label: "",
            lineWidth: 3,
          });
        }
      }, 120);
    }
    if (modelsLoaded && videoRef.current) {
      videoRef.current.addEventListener("play", onPlay);
    }
    return () => {
      clearInterval(interval);
      if (videoRef.current) videoRef.current.removeEventListener("play", onPlay);
    };
  }, [modelsLoaded]);

  // 4. دالة فحص الحيوية DeepFace API
  async function handleLivenessCheck() {
    setLoadingLiveness(true);
    setLivenessResult(null);
    // أخذ صورة snapshot من الفيديو
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");

    // إرسال الصورة إلى API
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();

      formData.append("image", blob, "capture.jpg");

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setLivenessResult(data);
      console.log(data)
    } catch (err) {
      setLivenessResult({ error: "Error sending image to backend!" });
    } finally {
      setLoadingLiveness(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a4223, #083620 70%, #011c14)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        borderRadius: 30,
        background: "rgba(0,30,18,0.8)",
        padding: 32,
        boxShadow: "0 6px 24px #011a10",
        textAlign: "center"
      }}>
        <h2 style={{letterSpacing:2}}>Face Detection & Liveness</h2>
        {!modelsLoaded && (
          <div style={{padding:32}}>
            <div className="spinner" style={{
              margin:"auto",border:"6px solid #eee",
              borderTop:"6px solid #0d7c66", borderRadius:"50%",
              width:36, height:36, animation:"spin 1s linear infinite"
            }}></div>
            <div style={{marginTop:12,opacity:.7}}>Loading face detection models...</div>
            <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        <div style={{
          position: "relative",
          width: 370,
          height: 275,
          margin: "20px auto"
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              borderRadius: 20,
              background: "#222",
              boxShadow: "0 2px 14px #0005",
              width: "100%",
              maxWidth: "350px",
              height: "auto",
              display: "block"
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              borderRadius: 20,
              pointerEvents: "none",
              width: "100%",
              height: "auto",
              zIndex: 10
            }}
          />
        </div>
        <button onClick={handleLivenessCheck} disabled={loadingLiveness || !modelsLoaded}
          style={{
            marginTop: 18, background: "#0d7c66", color: "#fff",
            padding: "12px 28px", border: "none", borderRadius: "8px",
            fontSize: 18, fontWeight: "bold", letterSpacing: 1, cursor: "pointer"
          }}>
          {loadingLiveness ? "Checking..." : "Liveness Check"}
        </button>
        <div style={{ minHeight: 40, marginTop: 15 }}>
          {livenessResult && (
            livenessResult.error ? (
              <div style={{ color: "red" }}>{livenessResult.error}</div>
            ) : (
              <div style={{
                background: livenessResult.liveness ? "#e8ffe8" : "#ffe8e8",
                color: livenessResult.liveness ? "#00944b" : "#c20018",
                fontWeight: "bold",
                margin: "8px auto",
                padding: 16,
                borderRadius: 10,
                border: "1px solid #eee",
                width: "fit-content",
                boxShadow: "0 2px 12px #0001"
              }}>
                  {livenessResult.liveness ? "Real face detected ✅" : "Fake/Spoof detected ❌"}
                  <div>
                    Score: <b>{livenessResult.score}</b>
                  </div>
              </div>
            )
          )}
        </div>
        <div style={{opacity:.7,fontSize:15,marginTop:20}}>
          Stand in front of the camera. Green box = face detected. Press "Liveness Check" to verify it's real!
        </div>
      </div>
    </div>
  );
}
