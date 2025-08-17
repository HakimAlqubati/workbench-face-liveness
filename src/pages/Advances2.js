import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import { API_BASE_URL, LOCAL_PYTHON_BASE_API } from "../config";

const LIVENESS_API_URL = `${LOCAL_PYTHON_BASE_API}/liveness`;
const FACE_RECOGNITION_API_URL = `${API_BASE_URL}/hr/faceRecognition`;
const MIN_RATIO = 0.10;

export default function FaceLivenesAdvanced() {
  // -------------------- Refs --------------------
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const resetTimerRef = useRef(null);
  const objectURLRef = useRef(null);

  // Reuse canvases & caches
  const lightCanvasRef = useRef(null);
  const brightnessCacheRef = useRef(null);
  const frameCountRef = useRef(0);
  const drawEveryNRef = useRef(0);
  const captureCanvasRef = useRef(null);
  const rvfcStopRef = useRef(false);

  // -------------------- State --------------------
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [livenessResult, setLivenessResult] = useState(null);
  const [loadingLiveness, setLoadingLiveness] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(true);
  const [capturedImageURL, setCapturedImageURL] = useState(null);
  const [faceRatioValue, setFaceRatioValue] = useState(null);
  const [faceRecognitionResult, setFaceRecognitionResult] = useState(null);
  const [brightnessLevel, setBrightnessLevel] = useState(null);
  const [brightnessStatus, setBrightnessStatus] = useState(null);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [screensaverCountdown, setScreensaverCountdown] = useState(null);

  const kickProcessingRef = useRef(() => {}); // لإعادة تشغيل حلقة المعالجة عند الطلب
  const processingStateRef = useRef({ started: false, intervalId: null });

  // -------------------- Config --------------------
  const ENABLE_FACE_RECOGNITION = false;
  const countdownSeconds = 1;
  const SSAVER_SECONDS = 5;
  const SSAVER_MSECONDS = SSAVER_SECONDS * 1000;
  const DISPLAY_IMAGE_MS = 2 * 1000;
  const BRIGHTNESS_SAMPLE_W = 64, BRIGHTNESS_SAMPLE_H = 36;
  const BRIGHTNESS_EVERY_N_FRAMES = 5;
  const DRAW_DETECTIONS_EVERY_N = 2;
  const PROCESS_INTERVAL_MS = 150;

  // -------------------- Camera control --------------------
  function stopAllCameras() {
    try {
      rvfcStopRef.current = true; // أوقف RVFC loop
      const v = videoRef.current;
      const s = streamRef.current || (v && v.srcObject);
      if (s) {
        s.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
          try { s.removeTrack?.(t); } catch {}
        });
      }
      streamRef.current = null;

      if (v) {
        try { v.pause?.(); } catch {}
        v.srcObject = null;
        try { v.load?.(); } catch {}
      }
    } catch (e) {
      console.warn("stopAllCameras error:", e);
    }
  }

  async function openMainCamera() {
    const video = videoRef.current;
    if (!video) return;

    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720,  max: 720  },
          frameRate: { ideal: 24, max: 24 },
          aspectRatio: 16 / 9,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      video.srcObject = stream;

      // انتظر الميتاداتا
      await new Promise((resolve) => {
        const ready = () => {
          video.removeEventListener("loadedmetadata", ready);
          resolve();
        };
        if (video.readyState >= 1 && video.videoWidth && video.videoHeight) resolve();
        else video.addEventListener("loadedmetadata", ready, { once: true });
      });

      try { await video.play(); } catch {}
      // حفّز onPlay حتى لو المتصفح ما أطلق الحدث تلقائيًا
      try { video.dispatchEvent(new Event("play")); } catch {}

    } catch (err) {
      alert("Camera error: " + err.message);
    }
  }

  // -------------------- Models --------------------
  useEffect(() => {
    (async () => {
      const MODEL_URL = "/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    })();
  }, []);

  // -------------------- Open/Close camera by state --------------------
  useEffect(() => {
    if (!cameraOpen || showScreensaver) {
      stopAllCameras();
      return;
    }
    if (modelsLoaded && cameraOpen && !showScreensaver) {
      rvfcStopRef.current = false;
      openMainCamera();
    }
  }, [modelsLoaded, cameraOpen, showScreensaver]);

  // -------------------- Inactivity → Screensaver --------------------
  useEffect(() => {
    let timeoutId;
    let countdownInterval;
    let startTime;

    const startInactivityCountdown = () => {
      clearTimeout(timeoutId);
      clearInterval(countdownInterval);

      setShowScreensaver(false);
      setScreensaverCountdown(null);

      startTime = Date.now();
      setScreensaverCountdown(SSAVER_SECONDS);

      countdownInterval = setInterval(() => {
        const secondsPassed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = SSAVER_SECONDS - secondsPassed;
        if (remaining > 0) setScreensaverCountdown(remaining);
        else clearInterval(countdownInterval);
      }, 1000);

      timeoutId = setTimeout(() => {
        setShowScreensaver(true);
        stopAllCameras();
        processingStateRef.current.started = false; // ✅ صفّر حالة المعالجة
      }, SSAVER_MSECONDS);
    };

    const onActivity = () => startInactivityCountdown();
    const events = ["mousemove","keydown","click","touchstart","pointermove","wheel","scroll","touchmove"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onVisibility = () => { if (document.visibilityState === "visible") startInactivityCountdown(); };
    document.addEventListener("visibilitychange", onVisibility);

    resetTimerRef.current = startInactivityCountdown;
    startInactivityCountdown();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timeoutId);
      clearInterval(countdownInterval);
    };
  }, [SSAVER_SECONDS, SSAVER_MSECONDS]);

  // -------------------- Geometry helper --------------------
  function isInsideOval(x, y, canvasWidth, canvasHeight) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const rx = canvasWidth * 0.33;
    const ry = canvasHeight * 0.45;
    return ((x - cx) ** 2) / rx ** 2 + ((y - cy) ** 2) / ry ** 2 <= 1;
  }

  // -------------------- Brightness (reused canvas + throttling) --------------------
  function calculateBrightnessFromVideoLite(video) {
    frameCountRef.current = (frameCountRef.current + 1) % BRIGHTNESS_EVERY_N_FRAMES;
    if (frameCountRef.current !== 0 && brightnessCacheRef.current != null) {
      return brightnessCacheRef.current;
    }

    let c = lightCanvasRef.current;
    if (!c) {
      c = document.createElement("canvas");
      c.width = BRIGHTNESS_SAMPLE_W;
      c.height = BRIGHTNESS_SAMPLE_H;
      lightCanvasRef.current = c;
    }

    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const val = total / (data.length / 4);
    brightnessCacheRef.current = val;
    return val;
  }

  // -------------------- Frame Processing (with hard guards) --------------------
  const SAMPLE_X = 10;
  const SAMPLE_Y = 10;

  async function processFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    if (rvfcStopRef.current || !cameraOpen || capturedImageURL) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth | 0;
    const vh = video.videoHeight | 0;
    if (!vw || !vh) return; // حارس أساسي

    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // إطار الإرشاد
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rx = canvas.width * 0.33;
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

    // كشف الوجوه
    const tf = faceapi.tf;
    const detect = () => faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
    let detections;
    try {
      detections = tf?.tidy ? await tf.tidy(detect) : await detect();
    } catch {
      return;
    }

    // قلل الرسم لكل فريمين + حماية resizeResults
    drawEveryNRef.current = (drawEveryNRef.current + 1) % DRAW_DETECTIONS_EVERY_N;
    const shouldDrawDetections = (drawEveryNRef.current === 0);

    if (shouldDrawDetections && detections && detections.length > 0) {
      const dims = { width: vw, height: vh };
      try {
        const resizedDetections = faceapi.resizeResults(detections, dims);
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        faceapi.draw.drawDetections(canvas, resizedDetections, {
          boxColor: "#13ca72",
          label: "",
          lineWidth: 3,
        });
        ctx.restore();
      } catch {
        return; // تجاهل دورة الرسم إذا حدث تبدل مفاجئ للأبعاد
      }
    }

    // قياسات/تحقق
    if (detections && detections.length > 0) {
      const box = detections[0].box;
      const faceArea = box.width * box.height;
      const frameArea = vw * vh;
      const faceRatio = frameArea ? faceArea / frameArea : 0;
      setFaceRatioValue(faceRatio);

      const brightness = calculateBrightnessFromVideoLite(video);
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

      let insideCount = 0;
      let totalCount = 0;
      for (let i = 0; i <= SAMPLE_X; i++) {
        for (let j = 0; j <= SAMPLE_Y; j++) {
          const px = box.x + (i / SAMPLE_X) * box.width;
          const py = box.y + (j / SAMPLE_Y) * box.height;
          totalCount++;
          if (isInsideOval(px, py, vw, vh)) insideCount++;
        }
      }
      const ratio = totalCount ? insideCount / totalCount : 0;
      setFaceDetected(ratio >= 0.8);
    } else {
      setFaceDetected(false);
    }
  }

  // -------------------- Polling loop (RVFC or interval) --------------------
  useEffect(() => {
    if (!cameraOpen) return;

    const state = processingStateRef.current;
    state.started = false; // سنعيد تقييم البدء
    rvfcStopRef.current = false;

    const startRVFC = () => {
      const v = videoRef.current;
      if (!v || !v.requestVideoFrameCallback) return false;

      const step = async () => {
        const v2 = videoRef.current;
        if (!v2 || rvfcStopRef.current) return;

        // لا تعالج إذا ما عندنا أبعاد أو نعرض صورة ملتقطة
        if (!v2.videoWidth || !v2.videoHeight || capturedImageURL) {
          v2.requestVideoFrameCallback(step);
          return;
        }
        await processFrame();
        v2.requestVideoFrameCallback(step);
      };

      v.requestVideoFrameCallback(step);
      return true;
    };

    const startInterval = () => {
      // منع تعدد الـinterval
      stopInterval();
      const id = setInterval(async () => {
        const v = videoRef.current, c = canvasRef.current;
        if (!v || !c || capturedImageURL || rvfcStopRef.current) return;
        if (!v.videoWidth || !v.videoHeight) return;
        await processFrame();
      }, PROCESS_INTERVAL_MS);
      processingStateRef.current.intervalId = id;
    };

    const stopInterval = () => {
      const id = processingStateRef.current.intervalId;
      if (id) {
        clearInterval(id);
        processingStateRef.current.intervalId = null;
      }
    };

    // دالة تبدأ المعالجة بأمان، مع إعادة محاولة عند غياب الأبعاد
    const startProcessingSafe = () => {
      if (rvfcStopRef.current || !cameraOpen || !modelsLoaded) return;

      const v = videoRef.current, c = canvasRef.current;
      if (!v || !c) return;

      // لو الأبعاد 0، أعد المحاولة بعد لحظات قصيرة
      if (!(v.videoWidth && v.videoHeight)) {
        setTimeout(() => {
          if (!rvfcStopRef.current && cameraOpen && modelsLoaded) {
            startProcessingSafe();
          }
        }, 60);
        return;
      }

      // اضبط أبعاد الكانفس مرة عند الانطلاق
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
      }

      if (!state.started) {
        state.started = true;
        // جرّب RVFC أولاً، وإلا استخدم interval
        if (!startRVFC()) startInterval();
      }
    };

    // نحفظها في ref لكي نقدر نناديها من خارج الـeffect (بعد شاشة التوقف/إعادة فتح الكاميرا)
    kickProcessingRef.current = startProcessingSafe;

    // Listeners تضمن الانطلاق مهما كان ترتيب الأحداث
    const onPlay = () => startProcessingSafe();
    const onLoadedMeta = () => startProcessingSafe();

    const v = videoRef.current;
    if (v) {
      v.addEventListener("play", onPlay);
      v.addEventListener("loadedmetadata", onLoadedMeta);
      // إن كان جاهز أصلاً، ابدأ الآن
      if (v.readyState >= 2) startProcessingSafe();
    }

    return () => {
      // تنظيف شامل
      rvfcStopRef.current = true;
      stopInterval();
      const v2 = videoRef.current;
      if (v2) {
        v2.removeEventListener("play", onPlay);
        v2.removeEventListener("loadedmetadata", onLoadedMeta);
      }
      processingStateRef.current.started = false;
    };
  }, [modelsLoaded, cameraOpen, capturedImageURL]);

  // -------------------- Countdown → Liveness --------------------
  useEffect(() => {
    if (!cameraOpen) return;
    let timer;

    if (faceDetected && countdown === null && !loadingLiveness) {
      setLivenessResult(null);
      if (objectURLRef.current) {
        URL.revokeObjectURL(objectURLRef.current);
        objectURLRef.current = null;
      }
      setCapturedImageURL(null);

      // يبدأ عدّاد الالتقاط
      setCountdown(countdownSeconds);

      // أعِد تشغيل عدّاد الخمول/الشاشة المتحركة من الصفر
      resetTimerRef.current?.();   // ✅
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

  // -------------------- Liveness (Blob + Object URL) --------------------
  function getCaptureCanvas(w, h) {
    let c = captureCanvasRef.current;
    if (!c) {
      c = document.createElement("canvas");
      captureCanvasRef.current = c;
    }
    c.width = w;
    c.height = h;
    return c;
  }

  async function handleLivenessCheck() {
    setLoadingLiveness(true);
    setLivenessResult(null);
    try {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        alert("Video not ready yet");
        return;
      }

      const canvas = getCaptureCanvas(video.videoWidth, video.videoHeight);
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.75);
      });

      const url = URL.createObjectURL(blob);
      if (objectURLRef.current && objectURLRef.current !== url) {
        try { URL.revokeObjectURL(objectURLRef.current); } catch {}
      }
      objectURLRef.current = url;
      setCapturedImageURL(url);

      stopAllCameras();
      setCameraOpen(false);

      setTimeout(() => {
        handleReopenCamera();
      }, DISPLAY_IMAGE_MS);

      const formData = new FormData();
      formData.append("image", blob, "capture.jpg");

      const flaskRes = await fetch(LIVENESS_API_URL, { method: "POST", body: formData });
      const flaskData = await flaskRes.json();
      setLivenessResult(flaskData);

      if (ENABLE_FACE_RECOGNITION) {
        const laravelRes = await fetch(FACE_RECOGNITION_API_URL, { method: "POST", body: formData });
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

    // صفّر كاشات القياس واستأنف الحلقة
    brightnessCacheRef.current = null;
    drawEveryNRef.current = 0;
    frameCountRef.current = 0;
    rvfcStopRef.current = false;
    processingStateRef.current.started = false; // ✅ مهم

    if (objectURLRef.current) {
      try { URL.revokeObjectURL(objectURLRef.current); } catch {}
      objectURLRef.current = null;
    }
    setCapturedImageURL(null);

    // افتح الكاميرا/حفّز play ثم اركل حلقة المعالجة صراحة
    const ensureKick = () => {
      try { videoRef.current?.dispatchEvent(new Event("play")); } catch {}
      kickProcessingRef.current?.(); // ✅
    };

    if (!videoRef.current?.srcObject) {
      openMainCamera().then(() => {
        if (videoRef.current?.readyState >= 2) {
          ensureKick();
        } else {
          videoRef.current?.addEventListener("loadedmetadata", ensureKick, { once: true });
        }
      });
    } else {
      const v = videoRef.current;
      setTimeout(() => {
        if (v && v.readyState >= 2) {
          ensureKick();
        } else {
          v?.addEventListener("loadedmetadata", ensureKick, { once: true });
        }
      }, 30);
    }
  }

  // -------------------- Draw captured image URL --------------------
  useEffect(() => {
    if (!capturedImageURL) return;

    let revoked = false;
    const img = new Image();
    img.onload = () => {
      const cnv = canvasRef.current;
      if (!cnv) return;
      const ctx = cnv.getContext("2d");
      cnv.width = img.naturalWidth;
      cnv.height = img.naturalHeight;
      ctx.clearRect(0, 0, cnv.width, cnv.height);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    };
    img.src = capturedImageURL;

    return () => {
      if (!revoked) {
        try { URL.revokeObjectURL(capturedImageURL); } catch {}
      }
    };
  }, [capturedImageURL]);

  // -------------------- Cleanup --------------------
  useEffect(() => {
    return () => {
      rvfcStopRef.current = true;
      stopAllCameras();
      if (objectURLRef.current) {
        try { URL.revokeObjectURL(objectURLRef.current); } catch {}
        objectURLRef.current = null;
      }
    };
  }, []);

  // -------------------- Render --------------------
  if (showScreensaver) {
    return (
      <div
        onClick={async () => {
          setShowScreensaver(false);

          // إصلاحات الخروج من شاشة التوقف
          rvfcStopRef.current = false;
          processingStateRef.current.started = false;  // ✅
          brightnessCacheRef.current = null;
          drawEveryNRef.current = 0;
          frameCountRef.current = 0;

          setCameraOpen(true);

          // افتح الكاميرا ثم اضمن تشغيل الحلقة
          const ensureKick = () => {
            try { videoRef.current?.dispatchEvent(new Event("play")); } catch {}
            kickProcessingRef.current?.(); // ✅
          };

          if (!videoRef.current?.srcObject) {
            await openMainCamera();
            if (videoRef.current?.readyState >= 2) {
              ensureKick();
            } else {
              videoRef.current?.addEventListener("loadedmetadata", ensureKick, { once: true });
            }
          } else {
            if (videoRef.current?.readyState >= 2) {
              ensureKick();
            } else {
              videoRef.current?.addEventListener("loadedmetadata", ensureKick, { once: true });
            }
          }

          // إعادة تشغيل عداد الخمول
          resetTimerRef.current?.();
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "#000",
          overflow: "hidden",
          zIndex: 9999,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          userSelect: "none",
        }}
        title="Click to exit screensaver"
      >
        <img
          src="https://nltworkbench.com/storage/logo/default-wb.png"
          alt="NLT Workbench"
          draggable={false}
          style={{
            width: "min(60vw, 420px)",
            height: "auto",
            filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.7))",
            animation: "floaty 18s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />

        <style>{`
          @keyframes floaty {
            0%   { transform: translate(-12vw, -10vh) scale(1);   opacity: 0.95; }
            25%  { transform: translate(10vw,  -6vh)  scale(1.03); opacity: 1;    }
            50%  { transform: translate(12vw,  10vh)  scale(1);    opacity: 0.95; }
            75%  { transform: translate(-8vw,  8vh)   scale(1.02); opacity: 1;    }
            100% { transform: translate(-12vw, -10vh) scale(1);    opacity: 0.95; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "black",
          color: "#fff",
          fontFamily: "'Segoe UI', sans-serif",
          overflow: "hidden",
          zIndex: 999,
          touchAction: "none",
        }}
      >
        {/* Main video */}
        {cameraOpen && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
            }}
          />
        )}

        {/* Contrast layer */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(75% 60% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 100%)",
          }}
        />

        {/* Canvas overlay */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />

        {/* Guided oval + countdown */}
        {cameraOpen && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              zIndex: 11,
            }}
          >
            <div
              style={{
                width: "min(70vw, 60vh)",
                height: "min(90vw, 80vh)",
                borderRadius: "50% / 60%",
                boxShadow:
                  "0 0 0 2px #ffffff66 inset, 0 0 0 200vmax rgba(0,0,0,0.35)",
                backdropFilter: "blur(0.5px)",
              }}
            />
            {countdown !== null && (
              <div
                style={{
                  position: "absolute",
                  bottom: "15vh",
                  fontSize: "clamp(24px, 6vw, 56px)",
                  fontWeight: 800,
                  color: "#0fd86e",
                  textShadow: "0 4px 24px rgba(0,0,0,0.8)",
                }}
              >
                {countdown > 0 ? countdown : "✓"}
              </div>
            )}
          </div>
        )}

        {/* Top HUD */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "max(env(safe-area-inset-top),16px) 20px 12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))",
            zIndex: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontWeight: 700, letterSpacing: 0.5 }}></span>
            {screensaverCountdown !== null && (
              <span
                style={{
                  fontSize: 13,
                  color: "#0fd86e",
                  background: "rgba(17,17,34,0.6)",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {screensaverCountdown}s
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const root = document.documentElement;
                try {
                  if (!document.fullscreenElement) {
                    await (root.requestFullscreen?.() || root.webkitRequestFullscreen?.());
                    if (window.screen?.orientation?.lock) {
                      try { await window.screen.orientation.lock("portrait"); } catch {}
                    }
                  } else {
                    await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
                  }
                } catch (err) {
                  console.warn("Fullscreen error:", err);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #ffffff33",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Toggle Fullscreen"
            >
              ⤢
            </button>
          </div>
        </div>

        {/* Bottom tools bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 20px max(env(safe-area-inset-bottom),16px) 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))",
            zIndex: 12,
            flexWrap: "wrap",
          }}
        >
          {!capturedImageURL && cameraOpen && (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  height: 10,
                  background: "#222",
                  borderRadius: 999,
                  overflow: "hidden",
                  border: "1px solid #444",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${
                      faceRatioValue
                        ? Math.max(1, Math.min(100, (faceRatioValue / MIN_RATIO) * 100))
                        : 1
                    }%`,
                    background:
                      faceRatioValue < MIN_RATIO
                        ? "linear-gradient(to right, #dc2626, #ef4444)"
                        : "linear-gradient(to right, #22c55e, #4ade80)",
                    transition: "width 0.3s ease-in-out, background 0.3s ease-in-out",
                  }}
                />
              </div>
              <div style={{ width: 56, textAlign: "right", fontWeight: 700 }}>
                {faceRatioValue !== null
                  ? `${Math.min(100, Math.max(1, ((faceRatioValue / MIN_RATIO) * 100))).toFixed(0)}%`
                  : "1%"}
              </div>
            </div>
          )}

          {brightnessLevel !== null && !capturedImageURL && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid #ffffff22",
                fontWeight: 600,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
                maxWidth: "100%",
              }}
              title={`${brightnessLevel.toFixed(0)} / 255`}
            >
              {brightnessStatus} - {brightnessLevel.toFixed(0)} / 255
            </div>
          )}

          {!cameraOpen ? (
            <div
              style={{
                flexBasis: "100%",
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <button
                onClick={handleReopenCamera}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "#0d7c66",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  cursor: "pointer",
                  flex: "0 0 auto",
                }}
              >
                Next Employee
              </button>
            </div>
          ) : null}
        </div>

        {livenessResult && (
          <div
            style={{
              position: "absolute",
              top: "12vh",
              left: "50%",
              transform: "translateX(-50%)",
              background: livenessResult.liveness ? "#0e7a4d" : "#7a0e1f",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 800,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              zIndex: 13,
            }}
          >
            {livenessResult.liveness && livenessResult.score >= 0.85
              ? `Real face ✅ (${livenessResult.score})`
              : `❌ (${livenessResult.score})`}
          </div>
        )}

        {faceRecognitionResult && !cameraOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(12vh + 56px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "#334155",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 700,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              zIndex: 13,
            }}
          >
            {faceRecognitionResult.found
              ? `Employee: ${faceRecognitionResult.name}`
              : "Employee: No match found"}
          </div>
        )}
      </div>
    </>
  );
}
