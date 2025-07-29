import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { LOCAL_PYTHON_BASE_API } from "../config";

const LIVENESS_API_URL = `${LOCAL_PYTHON_BASE_API}/liveness`;
const RECOGNITION_API_URL = `${LOCAL_PYTHON_BASE_API}/recognize-by-precise-match`;

export default function FaceDetectionLiveness() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [livenessResult, setLivenessResult] = useState(null);
  // const [recognitionResult, setRecognitionResult] = useState(null);
  const [loadingLiveness, setLoadingLiveness] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);

  const countdownSeconds = 2;

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/react-app/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (modelsLoaded && cameraOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => alert("Camera error: " + err.message));
    }
    if (!cameraOpen && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    }
  }, [modelsLoaded, cameraOpen]);

  function isInsideOval(x, y, canvasWidth, canvasHeight) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const rx = canvasWidth * 0.25;
    const ry = canvasHeight * 0.35;
    return ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
  }

  useEffect(() => {
    if (!cameraOpen) return;
    let interval;
    function onPlay() {
      interval = setInterval(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          if (capturedImage) return;

          const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
          const dims = { width: video.videoWidth, height: video.videoHeight };
          const resizedDetections = faceapi.resizeResults(detections, dims);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const rx = canvas.width * 0.25;
          const ry = canvas.height * 0.35;

          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.beginPath();
          ctx.rect(0, 0, canvas.width, canvas.height);
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.fill("evenodd");
          ctx.restore();

          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          ctx.strokeStyle = "#ffffff66";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          faceapi.draw.drawDetections(canvas, resizedDetections, {
            boxColor: "#13ca72",
            label: "",
            lineWidth: 3,
          });
          ctx.restore();

          if (detections.length > 0) {
            const box = detections[0].box;
            const sampleCountX = 10;
            const sampleCountY = 10;
            let insideCount = 0;
            let totalCount = 0;

            for (let i = 0; i <= sampleCountX; i++) {
              for (let j = 0; j <= sampleCountY; j++) {
                const px = box.x + (i / sampleCountX) * box.width;
                const py = box.y + (j / sampleCountY) * box.height;
                totalCount++;
                if (isInsideOval(px, py, video.videoWidth, video.videoHeight)) {
                  insideCount++;
                }
              }
            }

            const ratio = insideCount / totalCount;
            setFaceDetected(ratio >= 0.8);
          } else {
            setFaceDetected(false);
          }
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
  }, [modelsLoaded, cameraOpen, capturedImage]);

  useEffect(() => {
    if (!cameraOpen) return;
    let timer;
    if (faceDetected && countdown === null && !loadingLiveness) {
      setLivenessResult(null);
      // setRecognitionResult(null);
      setCapturedImage(null);
      setCountdown(countdownSeconds);
    }
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    if (countdown === 0) {
      setCountdown(null);
      handleLivenessCheck();
    }
    if (!faceDetected && countdown !== null) {
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [faceDetected, countdown, loadingLiveness, cameraOpen]);

  async function handleLivenessCheck() {
    setLoadingLiveness(true);
    setLivenessResult(null);
    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
      setTimeout(() => setCameraOpen(false), 600);

      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("image", blob, "capture.jpg");

      const flaskRes = await fetch(LIVENESS_API_URL, { method: "POST", body: formData });
      const flaskData = await flaskRes.json();
      setLivenessResult(flaskData);

      // await handleFaceRecognition(blob);

    } catch (err) {
      setLivenessResult({ error: "Error sending image to backend!" });
    } finally {
      setLoadingLiveness(false);
    }
  }

//  async function handleFaceRecognition(imageBlob) {
//   try {
//     const formData = new FormData();
//     formData.append("img", imageBlob, "capture.jpg");

//     const res = await fetch(RECOGNITION_API_URL, {
//       method: "POST",
//       body: formData,
//     });

//     if (!res.ok) {
//       throw new Error("Recognition failed");
//     }

//     const data = await res.json();

//     // طباعة كاملة للـ JSON في الكونسول
//     console.log("Full recognition JSON response:", data);

//     // تحديث النتيجة على الواجهة
//     // setRecognitionResult(data);

//   } catch (err) {
//     // setRecognitionResult({ error: err.error || "Unknown recognition error" });
//   }
// }


  function handleReopenCamera() {
    setCameraOpen(true);
    setLivenessResult(null);
    setCountdown(null);
    setFaceDetected(false);
    setCapturedImage(null);
    // setRecognitionResult(null);
  }

    useEffect(() => {
    if (!capturedImage || !canvasRef.current) return;

  const img = new Image();
  img.onload = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // تأخير بسيط لتجنب التعارض مع camera close
    setTimeout(() => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
    }, 150); // تأخير 150ms يكفي
  };
  img.src = capturedImage;
  }, [capturedImage]);


  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #041f13, #052d20 70%, #01170e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vw", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ borderRadius: "2rem", background: "rgba(0, 25, 15, 0.9)", padding: "5vw", boxShadow: "0 10px 40px #011a10", textAlign: "center", width: "100%", maxWidth: "480px" }}>
        <h2 style={{ letterSpacing: 1.5, fontSize: "1.8rem", marginBottom: "0.8rem" }}>Face Liveness Check</h2>
        <p style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "500", color: "#ccc", lineHeight: 1.5 }}>Align your face inside the oval. Detection starts when at least 80% is inside.</p>

        <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#222", borderRadius: "5rem", overflow: "hidden", boxShadow: "0 2px 16px #0005", marginBottom: cameraOpen ? "1.2rem" : "2rem" }}>
          {cameraOpen && (
            <video ref={videoRef} autoPlay muted style={{ borderRadius: "1rem", width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scaleX(-1)" }} />
          )}
          <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10, pointerEvents: "none", borderRadius: "1rem" }} />
          {countdown !== null && cameraOpen && (
            <div style={{ position: "absolute", top: "42%", left: 0, width: "100%", textAlign: "center", fontSize: "2rem", fontWeight: "bold", color: "#0fd86e", textShadow: "0 2px 12px #000b", zIndex: 22, pointerEvents: "none", userSelect: "none", background: "rgba(0,0,0,0.1)" }}>{countdown > 0 ? countdown : "✓"}</div>
          )}
        </div>

        {livenessResult && (
          <div style={{ background: livenessResult.liveness ? "#e8ffe8" : "#ffe8e8", color: livenessResult.liveness ? "#00944b" : "#c20018", fontWeight: "bold", margin: "8px auto", padding: "0.8rem 1rem", borderRadius: "0.8rem", border: "1px solid #eee", fontSize: "1rem", boxShadow: "0 2px 12px #0001", width: "fit-content" }}>
            {livenessResult.liveness ? `Real face ✅ (${livenessResult.score})` : "Spoof ❌"}
          </div>
        )}

      {/* {recognitionResult && (
        <div style={{ marginTop: "1rem" }}>
          {recognitionResult.error ? (
            <div style={{ color: "#ff4d4f", fontWeight: "bold" }}>
              Recognition Error: {recognitionResult.error}
            </div>
          ) : recognitionResult.matched === true ? (
            <div style={{ textAlign: "left", color: "#0c8040", fontSize: "0.85rem", background: "#e8ffe8", padding: "1rem", borderRadius: "0.8rem", wordBreak: "break-word", maxHeight: "300px", overflowY: "auto" }}>
              <strong>✅ Match Found:</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(recognitionResult.best_match, null, 2)}</pre>
            </div>
          ) : (
            <div style={{ textAlign: "left", color: "#a00000", fontSize: "0.85rem", background: "#ffe8e8", padding: "1rem", borderRadius: "0.8rem", wordBreak: "break-word", maxHeight: "300px", overflowY: "auto" }}>
              <strong>❌ No Match Found</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(recognitionResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )} */}


        {!cameraOpen && (
          <button onClick={handleReopenCamera} style={{ marginTop: "1.5rem", background: "#0d7c66", color: "#fff", padding: "0.9rem 2rem", border: "none", borderRadius: "0.8rem", fontSize: "1rem", fontWeight: "bold", letterSpacing: 1, cursor: "pointer", maxWidth: "90%" }}>
            Next Employee
          </button>
        )}
      </div>
    </div>
  );
}
