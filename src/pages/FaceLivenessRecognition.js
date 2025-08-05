import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { API_BASE_URL, LOCAL_PYTHON_BASE_API } from "../config";
const LIVENESS_API_URL = `${LOCAL_PYTHON_BASE_API}/liveness`;
const FACE_RECOGNITION_API_URL = `${API_BASE_URL}/hr/faceRecognition`;
const MIN_RATIO = 0.10; 

export default function FaceDetectionLiveness() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [livenessResult, setLivenessResult] = useState(null);
  const [loadingLiveness, setLoadingLiveness] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceRatioValue, setFaceRatioValue] = useState(null);
  const [faceRecognitionResult, setFaceRecognitionResult] = useState(null);
  const ENABLE_FACE_RECOGNITION = true; 
  const countdownSeconds = 1;
  const [brightnessLevel, setBrightnessLevel] = useState(null);
  const [brightnessStatus, setBrightnessStatus] = useState(null);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [screensaverCountdown, setScreensaverCountdown] = useState(null);
  
  const resetTimerRef = useRef(null);

  const SSAVER_SECONDS = 20;
  const SSAVER_MSECONDS = 20000;
  const DISPLAY_IMAGE_SECONDS = 15 * 1000; 
  
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);


  useEffect(() => {
  const video = videoRef.current;

  // أوقف الكاميرا في حالتين: إما الشاشة مغلقة، أو شاشة التوقف فعالة
  if ((!cameraOpen || showScreensaver) && video && video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
    return;
  }

  // شغل الكاميرا إذا كانت الشاشة مفتوحة ولا يوجد شاشة توقف
  if (modelsLoaded && cameraOpen && !showScreensaver) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (video) video.srcObject = stream;
      })
      .catch((err) => alert("Camera error: " + err.message));
  }
}, [modelsLoaded, cameraOpen, showScreensaver]);




useEffect(() => {
  let timeoutId;
  let countdownInterval;
  let startTime;


  const resetTimer = () => {
    clearTimeout(timeoutId);
    clearInterval(countdownInterval);
    setShowScreensaver(false);
    setScreensaverCountdown(null);
    // window.location.reload();
    if (!faceDetected) {
      startTime = Date.now();
      setScreensaverCountdown(SSAVER_SECONDS); // 10 ثواني

      countdownInterval = setInterval(() => {
        const secondsPassed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = SSAVER_SECONDS - secondsPassed;
        if (remaining > 0) {
          setScreensaverCountdown(remaining);
        } else {
          clearInterval(countdownInterval);
        }
      }, 1000);

      timeoutId = setTimeout(() => {
        setShowScreensaver(true);
      }, SSAVER_MSECONDS); // 10 ثواني
    }
  };

  const events = ['mousemove', 'keydown', 'click', 'touchstart'];
  events.forEach(event => window.addEventListener(event, resetTimer));

  resetTimerRef.current = resetTimer;
  resetTimer();
  return () => {
    events.forEach(event => window.removeEventListener(event, resetTimer));
    clearTimeout(timeoutId);
    clearInterval(countdownInterval);
  };
}, [faceDetected]);

  function isInsideOval(x, y, canvasWidth, canvasHeight) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const rx = canvasWidth * 0.33;
    const ry = canvasHeight * 0.45;
    return ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1;
  }

  

  async function processFrame() {
  if (!videoRef.current || !canvasRef.current) return;

  const video = videoRef.current;
  const canvas = canvasRef.current;

  // ضبط أبعاد الكانفس
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }

  if (capturedImage) return; // لا تعالج إذا التقطنا صورة

  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
  const dims = { width: video.videoWidth, height: video.videoHeight };
  const resizedDetections = faceapi.resizeResults(detections, dims);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // إعدادات الدائرة البيضاوية
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const rx = canvas.width * 0.33;   // عرض أقل
  const ry = canvas.height * 0.5;  

  // رسم الطبقة المظللة خارج البيضاوي
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
  ctx.fill("evenodd");
  ctx.restore();

  // رسم خط البيضاوي
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = "#ffffff66";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // عكس الوجه ورسم الكشف
  ctx.save(); 
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  faceapi.draw.drawDetections(canvas, resizedDetections, {
    boxColor: "#a01300ff",
    label: "",
    lineWidth: 3,
  });
  ctx.restore();

  // في حالة تم الكشف عن وجه
  if (detections && detections.length > 0) {
    const box = detections[0].box;
    const faceArea = box.width * box.height;
    const frameArea = video.videoWidth * video.videoHeight;
    const faceRatio = faceArea / frameArea;

    setFaceRatioValue(faceRatio); // لتحديث progress bar

    // الإضاءة
    const brightness = calculateBrightnessFromVideo(video);
    setBrightnessLevel(brightness);

    if (brightness < 30) setBrightnessStatus("Very dark ❌");
    else if (brightness < 60) setBrightnessStatus("Too dim ❌");
    else if (brightness < 100) setBrightnessStatus("Dim light ⚠️");
    else if (brightness < 160) setBrightnessStatus("Good lighting ✅");
    else if (brightness < 220) setBrightnessStatus("Excellent lighting 🌟");
    else setBrightnessStatus("Too bright ⚠️");

    if (faceRatio < MIN_RATIO) {
      setFaceDetected(false);
      return;
    }

    // هل الوجه داخل الدائرة؟
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

// useEffect(() => {
//   if (!cameraOpen || !modelsLoaded || !videoRef.current) return;

//   let lastExecutionTime = 0;
//   let animationFrameId;

//   const onPlay = async (timestamp) => {
//     const delay = 300; // milliseconds
//     if (timestamp - lastExecutionTime >= delay) {
//       lastExecutionTime = timestamp;
//       await processFrame();
//     }
//     animationFrameId = requestAnimationFrame(onPlay);
//   };

//   const video = videoRef.current;
//   video.addEventListener("play", () => {
//     animationFrameId = requestAnimationFrame(onPlay);
//   });

//   return () => {
//     cancelAnimationFrame(animationFrameId);
//   };
// }, [modelsLoaded, cameraOpen, capturedImage]);


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
          const rx = canvas.width * 0.33;   // عرض أقل
          const ry = canvas.height * 0.5;  

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

          if (detections && detections.length > 0) {  
            const box = detections[0].box;
            const faceArea = box.width * box.height;
            const frameArea = video.videoWidth * video.videoHeight;
            const faceRatio = faceArea / frameArea;


            setFaceRatioValue(faceRatio); // لتحديث progress bar

            
            const brightness = calculateBrightnessFromVideo(video);
            setBrightnessLevel(brightness);


             
            if (brightness < 30) {
                setBrightnessStatus("Very dark ❌");
              } else if (brightness < 60) {
                setBrightnessStatus("Too dim ❌");
              } else if (brightness < 100) {
                setBrightnessStatus("Dim light ⚠️");
              } else if (brightness < 160) {
                setBrightnessStatus("Good lighting ✅");
              } else if (brightness < 220) {
                setBrightnessStatus("Excellent lighting 🌟");
              } else {
                setBrightnessStatus("Too bright ⚠️");
              }

            if (faceRatio < MIN_RATIO) {
              setFaceDetected(false);
              return;
            }
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
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert("Video not ready yet");
        return;
      }
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

      // أغلق الكاميرا بعد الالتقاط
      setTimeout(() => setCameraOpen(false), 600);

      // إعادة فتح الكاميرا تلقائيًا بعد المدة المحددة
      setTimeout(() => {
        handleReopenCamera();
      }, DISPLAY_IMAGE_SECONDS);

      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("image", blob, "capture.jpg");

      const flaskRes = await fetch(LIVENESS_API_URL, { method: "POST", body: formData });
      const flaskData = await flaskRes.json();
      setLivenessResult(flaskData);

      if (ENABLE_FACE_RECOGNITION) {
         // 2. التعرف على الوجه في Laravel حتى لو spoof
      const laravelRes = await fetch(FACE_RECOGNITION_API_URL, {
        method: "POST",
        body: formData,
      });

      const recognitionData = await laravelRes.json();
      setFaceRecognitionResult(recognitionData?.match); 
      } 
    } catch (err) {
      setLivenessResult({ error: "Error sending image to backend!" });
    } finally {
      setLoadingLiveness(false);
    }
  }

  function handleReopenCamera() {
    setCameraOpen(true);
    setLivenessResult(null);
    setCountdown(null);
    setFaceDetected(false);
    setCapturedImage(null);
  }


  function calculateBrightnessFromVideo(video) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = frame.data;

    let totalBrightness = 0;
    let pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixelCount;
    return avgBrightness;
  }

 useEffect(() => {
  if (!capturedImage) return;

  const interval = setInterval(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height);
      };
      img.src = capturedImage;
      clearInterval(interval);
    }
  }, 100); // يتأكد كل 100ms حتى يتوفر canvas

  return () => clearInterval(interval);
}, [capturedImage]);
 
  useEffect(() => {
  if (!showScreensaver || !modelsLoaded) return;

  const video = document.createElement("video");
  let stream;
  let animationId;

  const startBackgroundCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      await video.play();

      const detect = async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        if (detections.length > 0) {
          // اكتشف وجه، أخرج من شاشة التوقف
          setShowScreensaver(false);
          setCameraOpen(true);
          stopBackgroundCamera();
          if (resetTimerRef.current) resetTimerRef.current();
          setScreensaverCountdown(SSAVER_SECONDS); 
        } else {
          setTimeout(() => detect(), 2000);
        }
      };

      detect();
    } catch (err) {
      console.error("Error starting background camera:", err);
    }
  };

  const stopBackgroundCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    cancelAnimationFrame(animationId);
  };

  startBackgroundCamera();

  return () => {
    stopBackgroundCamera();
  };
}, [showScreensaver, modelsLoaded]);


 if (showScreensaver) {
  return (
    <div
      onClick={() => setShowScreensaver(false)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
        zIndex: 9999,
        cursor: "pointer"
      }}
    >
      <div
        className="moving-text"
        style={{
          position: "absolute",
          fontSize: "5rem",
          fontWeight: "bold",
          color: "#0fd86e",
          animation: "bounce 12s linear infinite",
        }}
      >
        NLT
      </div>

      <style>
        {`
          @keyframes bounce {
            0% {
              top: 0;
              left: 0;
            }
            25% {
              top: 0;
              left: 80%;
            }
            50% {
              top: 80%;
              left: 80%;
            }
            75% {
              top: 80%;
              left: 0;
            }
            100% {
              top: 0;
              left: 0;
            }
          }
        `}
      </style>
    </div>
  );
}



  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #041f13, #052d20 70%, #01170e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vw", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ borderRadius: "2rem", background: "rgba(0, 25, 15, 0.9)", padding: "5vw", boxShadow: "0 10px 40px #011a10", textAlign: "center", width: "100%", maxWidth: "480px" }}>
        <h2 style={{ letterSpacing: 1.5, fontSize: "1.8rem", marginBottom: "0.8rem" }}>Face Liveness Check</h2>
        {screensaverCountdown !== null && (
        <span style={{
          fontSize: "0.9rem",
          fontWeight: "500",
          color: "#0fd86e",
          background: "#112", 
          padding: "4px 10px",
          borderRadius: "8px"
        }}>
      ({screensaverCountdown}s to screensaver)
    </span>
  )}
        <p style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "500", color: "#ccc", lineHeight: 1.5 }}>Align your face inside the oval. Detection starts when at least 80% is inside.</p>

      {cameraOpen && (
       <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "10px", 
      marginBottom: "0.7rem"
    }}>
  <div style={{ 
    flexGrow: 1,
    height: "12px", 
    background: "#222", 
    borderRadius: "10px", 
    overflow: "hidden", 
    border: "1px solid #555"
  }}>
    <div
      style={{
        height: "100%",
        width: `${faceRatioValue ? Math.max(1, Math.min(100, ((faceRatioValue / MIN_RATIO) * 100))) : 1}%`,
        background: faceRatioValue < MIN_RATIO
          ? `linear-gradient(to right, #dc2626, #ef4444)`
          : `linear-gradient(to right, #22c55e, #4ade80)`,
        transition: "width 0.3s ease-in-out, background 0.3s ease-in-out",
      }}
    />
  </div>

  <div style={{ minWidth: "48px", textAlign: "right", fontSize: "0.9rem", fontWeight: "bold", color: "#ddd" }}>
    {faceRatioValue !== null ? `${Math.min(100, Math.max(1, ((faceRatioValue / MIN_RATIO) * 100))).toFixed(0)}%` : "1%"}
  </div>
</div>

      )}

        <div style={{ position: "relative", width: "100%", height:"15rem", aspectRatio: "4/4", background: "#222", borderRadius: "5rem", overflow: "hidden", boxShadow: "0 2px 16px #0005", marginBottom: cameraOpen ? "1.2rem" : "2rem" }}>

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
            {livenessResult.liveness && livenessResult.score >= 0.85 ? `Real face ✅ (${livenessResult.score})` : `❌ (${livenessResult.score})`}
          </div>
        )}
        {faceRecognitionResult && (
          <div style={{
            background: "#eef",
            color: "#003366",
            fontWeight: "bold",
            margin: "6px auto",
            padding: "0.6rem 1rem",
            borderRadius: "0.8rem",
            border: "1px solid #ddd",
            fontSize: "0.95rem",
            boxShadow: "0 1px 8px #0001",
            width: "fit-content"
          }}>
            {faceRecognitionResult.found
              ? `Employee: ${faceRecognitionResult.name}`
              : "Employee: No match found"}
          </div>
        )}


        {!cameraOpen && (
          <button onClick={handleReopenCamera} style={{ marginTop: "1.5rem", background: "#0d7c66", color: "#fff", padding: "0.9rem 2rem", border: "none", borderRadius: "0.8rem", fontSize: "1rem", fontWeight: "bold", letterSpacing: 1, cursor: "pointer", maxWidth: "90%" }}>
            Next Employee
          </button>
        )}

        {brightnessLevel !== null && (
          <div style={{ marginBottom: "0.5rem", fontSize: "0.95rem", color: "#ccc", fontWeight: "bold" }}>
            {brightnessStatus} - {brightnessLevel.toFixed(0)} / 255
          </div>
        )}
        
  

      </div>
      
    </div>
  );
}
