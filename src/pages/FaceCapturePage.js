import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export default function FaceCapturePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const faceDetectedRef = useRef(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/react-app/models";
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };
    console.log('Starting face detection...');

    startVideo();
  }, [modelsLoaded]);

  useEffect(() => {
    if (!modelsLoaded) return;

    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5
        })
      );

      console.log("Face detection result:", detection);
      if (detection && isFaceInsideOval(detection.box) && !faceDetectedRef.current) {
        faceDetectedRef.current = true;
        startCountdown();
      }
    }, 300);

    return () => clearInterval(interval);
  }, [modelsLoaded]);

  const startCountdown = () => {
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          captureFace();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureFace = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { videoWidth, videoHeight } = videoRef.current;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
    faceDetectedRef.current = false;
  };

const isFaceInsideOval = (box) => {
  const videoWidth = 640;
  const videoHeight = 480;

  const ovalCenterX = videoWidth / 2;
  const ovalCenterY = videoHeight / 2;
  const rx = videoWidth * 0.2;  // 20%
  const ry = videoHeight * 0.33; // 33%

  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;

  const normalized =
    ((faceCenterX - ovalCenterX) ** 2) / rx ** 2 +
    ((faceCenterY - ovalCenterY) ** 2) / ry ** 2;

  return normalized <= 1;
};


  return (
    <div style={{ position: "relative", textAlign: "center", height: "100vh", background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="640"
        height="480"
        style={{
          borderRadius: 8,
          zIndex: 1,
          position: "relative",
        }}
      />

      {/* Overlay mask */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 640,
          height: 480,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <svg width="100%" height="100%">
          <defs>
            <mask id="mask">
              <rect width="100%" height="100%" fill="white" />
              <ellipse
                cx="320"
                cy="240"
                rx="120"
                ry="160"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.65)"
            mask="url(#mask)"
          />
          <ellipse
            cx="320"
            cy="240"
            rx="120"
            ry="160"
            stroke="#00ffa2"
            strokeWidth="3"
            fill="none"
          />
        </svg>

        {/* Message */}
        <div style={{
          position: "absolute",
          top: "170px",
          left: 0,
          width: "100%",
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "bold",
          color: "#ffffff",
          textShadow: "0 0 5px #000",
        }}>
          {countdown !== null ? `Capturing in ${countdown}...` : "Hold still"}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />
    </div>
  );
}
