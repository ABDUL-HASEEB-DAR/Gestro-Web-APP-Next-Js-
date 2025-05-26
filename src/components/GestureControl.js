"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHandPaper, FaArrowLeft } from "react-icons/fa";

const gestureLabels = ["Open", "Close", "Pointer", "OK", "Peace"];
const GESTURE_DESCRIPTIONS = [
  "Open palm 🖐️ - Move Forward",
  "Closed fist ✊ - Move Backward",
  "Pointer 👆 - Rotate",
  "Point Right 👉 - Move Right",
  "Point Left 👈 - Move Left",
  "Thumbs Up 👍 - Elbow Up",
  "Thumbs Down 👎 - Elbow Down",
  "Pinch Open 🤏 - Claw Open",
  "Pinch Close 🤏 - Claw Close",
  "Peace ✌️ - Base Rotate Left",
  "Rock 🤘 - Base Rotate Right",
  "2-Finger Up 👆 - Shoulder Up",
  "2-Finger Down 👇 - Shoulder Down",
];

export default function GestureControl({ keyVal, setMode }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [prediction, setPrediction] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

  const stopGestureDetection = () => {
    setPrediction(null);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        );

        if (typeof window.Camera !== "function") {
          console.error(
            "Camera constructor not found. Make sure camera_utils.js loaded correctly."
          );
          return;
        }

        // Setup WebSocket
        const ws = new WebSocket(
          "wss://hand-gesture-recognition-mediapipe-web.onrender.com/ws"
        );
        ws.onopen = () => ws.send(JSON.stringify({ type: "join", keyVal }));
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (typeof data.prediction !== "undefined") {
            setPrediction(data.prediction);
          }
        };
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setError("WebSocket connection failed. Please try again.");
        };
        setSocket(ws);

        // Setup MediaPipe
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const hands = new window.Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults((results) => {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (results.multiHandLandmarks?.length) {
            const landmarks = results.multiHandLandmarks[0];
            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 2,
            });
            window.drawLandmarks(ctx, landmarks, {
              color: "#FF0000",
              lineWidth: 1,
            });

            const landmarkList = landmarks.map((lm) => [
              Math.floor(lm.x * canvas.width),
              Math.floor(lm.y * canvas.height),
            ]);

            const baseX = landmarkList[0][0];
            const baseY = landmarkList[0][1];
            let relCoords = landmarkList
              .map(([x, y]) => [x - baseX, y - baseY])
              .flat();
            const maxVal = Math.max(...relCoords.map(Math.abs)) || 1;
            const processed = relCoords.map((v) => v / maxVal);

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({ type: "gesture", landmarks: processed })
              );
            }
          } else {
            setPrediction(null);
          }

          ctx.restore();
        });

        const camera = new window.Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 640,
          height: 480,
        });

        camera.start();
      } catch (err) {
        console.error("Error initializing:", err);
        setError(
          "Failed to initialize camera or hand tracking. Please ensure camera permissions are granted and try again."
        );
      }
    };

    init();

    return () => {
      stopGestureDetection();
    };
  }, []);

  const handleBackClick = () => {
    stopGestureDetection();
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 w-full max-w-3xl">
      <div className="flex justify-between w-full mb-6">
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
        >
          <FaArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-bold text-white">Gesture Control</h1>
      </div>
      <div className="bg-gray-800 rounded-lg p-6 w-full mb-6">
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-full aspect-video bg-white rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ display: "none" }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              width={480}
              height={480}
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
          {error && (
            <div className="w-full p-3 bg-red-600 text-white rounded-md">
              <p>{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full mt-4">
            {gestureLabels.map((label, index) => (
              <div
                key={index}
                className={`p-3 border-2 flex items-center justify-center font-bold rounded-lg transition-all duration-300 ${
                  prediction === index
                    ? "bg-white text-black border-gray-700 shadow-lg scale-110"
                    : "bg-gray-700 text-gray-300 border-gray-600"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Supported Gestures
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GESTURE_DESCRIPTIONS.map((description, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded-md">
                <p className="text-white">
                  <span className="font-bold">{gestureLabels[index]}</span> -{" "}
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
