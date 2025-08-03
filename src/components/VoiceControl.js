"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { FaMicrophoneAlt, FaArrowLeft } from "react-icons/fa";

export default function VoiceControl({ keyVal }) {
  const [active, setActive] = useState(false);
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();
  const wsRef = useRef(null);
  const sendIntervalRef = useRef(null);

  const VOICE_COMMANDS = [
    {
      id: 0,
      name: "Forward",
      description: "Move robot forward",
      examples: ["move forward", "go ahead", "forward"],
    },
    {
      id: 1,
      name: "Backward",
      description: "Move robot backward",
      examples: ["move backward", "go back", "reverse"],
    },
    {
      id: 2,
      name: "Rotate",
      description: "Rotate robot",
      examples: ["rotate", "turn around", "spin"],
    },
    {
      id: 3,
      name: "Right",
      description: "Move robot right",
      examples: ["move right", "go right", "turn right"],
    },
    {
      id: 4,
      name: "Left",
      description: "Move robot left",
      examples: ["move left", "go left", "turn left"],
    },
    {
      id: 5,
      name: "Elbow Up",
      description: "Move elbow up",
      examples: ["elbow up", "raise elbow", "lift elbow"],
    },
    {
      id: 6,
      name: "Elbow Down",
      description: "Move elbow down",
      examples: ["elbow down", "lower elbow", "drop elbow"],
    },
    {
      id: 7,
      name: "Claw Open",
      description: "Open robot claw",
      examples: ["open claw", "open gripper", "release"],
    },
    {
      id: 8,
      name: "Claw Close",
      description: "Close robot claw",
      examples: ["close claw", "close gripper", "grab"],
    },
    {
      id: 9,
      name: "Base Rotate Left",
      description: "Rotate base left",
      examples: ["base left", "rotate base left", "turn base left"],
    },
    {
      id: 10,
      name: "Base Rotate Right",
      description: "Rotate base right",
      examples: ["base right", "rotate base right", "turn base right"],
    },
    {
      id: 11,
      name: "Shoulder Up",
      description: "Move shoulder up",
      examples: ["shoulder up", "raise shoulder", "lift shoulder"],
    },
    {
      id: 12,
      name: "Shoulder Down",
      description: "Move shoulder down",
      examples: ["shoulder down", "lower shoulder", "drop shoulder"],
    },
    {
      id: 13,
      name: "Stop",
      description: "Stop all movement",
      examples: ["stop", "halt", "freeze", "pause"],
    },
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const GROQ_API_KEY =
    "";

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(
          "wss://hand-gesture-recognition-mediapipe-web.onrender.com/ws"
        );

        ws.onopen = () => {
          console.log("WebSocket connected");
          setWsConnected(true);
          ws.send(JSON.stringify({ type: "join", username: keyVal }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received from server:", data);
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setWsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setWsConnected(false);
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
      }
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, [keyVal]);

  useEffect(() => {
    if (currentCommand !== null && wsConnected && isSending) {
      sendIntervalRef.current = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: "voice",
            command: currentCommand,
          });
          wsRef.current.send(message);
          console.log("Continuously sending command:", currentCommand);
        }
      }, 50); // Send every 500ms

      return () => {
        if (sendIntervalRef.current) {
          clearInterval(sendIntervalRef.current);
        }
      };
    } else {
      // Stop sending if no command or not connected
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    }
  }, [currentCommand, wsConnected, isSending]);

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser doesn`t support speech recognition.</p>;
  }

  const toggleMic = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setActive(false);
    } else {
      resetTranscript();
      setIntent("");
      SpeechRecognition.startListening({ continuous: true });
      setActive(true);
    }
  };

  const sendToLLM = async () => {
    if (!transcript) return;

    setLoading(true);

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `You are a robot control interpreter. Figure out what the user is trying to say. The user might say different phrases that correspond to one of the commands below. Detect which command the user wants and respond ONLY with the integer index of the matched command:

                          0: (Forward)
                          1: (Backward)
                          2: (Rotate)
                          3: (robot Right)
                          4: (Robot Left)
                          5: (Elbow Up)
                          6: (Elbow Down)
                          7: (Claw Open)
                          8: (Claw Close)
                          9: (Base Rotate Left)
                          10:(Base Rotate Right)
                          11:(Shoulder Up)
                          12:(Shoulder Down)
                          13:(Stop)

                          Respond ONLY with the number corresponding to the user's intended command like 1 or 3 or 12 dont do "1 2" or "1 12, 
                          in case no response detectec send 'error'".
                          `,
              },
              {
                role: "user",
                content: transcript,
              },
            ],
            temperature: 0.3,
          }),
        }
      );

      const data = await response.json();
      console.log("LLM Response:", data);
      const result = data.choices?.[0]?.message?.content?.trim();
      resetTranscript();
      setIntent(result || "Unknown");

      if (result === "error") {
        setIntent("Error processing command");
        setCurrentCommand(null);
        setIsSending(false);
      } else {
        // Set the new command and start continuous sending
        setCurrentCommand(result);
        setIsSending(true);
        console.log("New command set:", result);
      }
    } catch (error) {
      console.error("Error calling LLM:", error);
      setIntent("Error processing command");
      setCurrentCommand(null);
      setIsSending(false);
    } finally {
      setLoading(false);
    }
  };

  const stopSending = () => {
    setCurrentCommand(null);
    setIsSending(false);
    setIntent("");
    console.log("Stopped sending commands");
  };

  const handleBackClick = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4 font-[family-name:var(--font-geist-sans)] w-[95%] mt-5">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        <div className="flex justify-between w-full mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">Voice Control</h1>
        </div>

        {/* Connection Status */}
        <div
          className={`px-3 py-1 rounded-full text-sm ${
            wsConnected ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {wsConnected ? "Connected" : "Disconnected"}
        </div>

        {/* Sending Status */}
        {isSending && currentCommand !== null && (
          <div className="px-3 py-1 rounded-full text-sm bg-blue-500 text-white animate-pulse">
            Continuously sending command: {currentCommand}
          </div>
        )}

        <button
          onClick={toggleMic}
          className={`w-50 h-50 rounded-full flex items-center justify-center transition-all duration-300 ${
            active ? "bg-red-500 text-white" : "bg-white text-black"
          } shadow-lg border border-gray-300 hover:scale-105`}
        >
          <FaMicrophoneAlt size={60} />
        </button>

        <p className="text-lg text-center">
          {listening ? "Listening..." : "Tap to speak"}
        </p>

        <div className="w-full bg-gray-100 rounded-lg p-4 shadow-inner h-40 overflow-y-auto text-sm">
          <p className="whitespace-pre-wrap break-words text-black">
            {transcript || "Say something to your robot..."}
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4">
          <button
            onClick={sendToLLM}
            disabled={!transcript || loading || !wsConnected}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Process Command"}
          </button>

          {isSending && (
            <button
              onClick={stopSending}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Stop Command
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Detecting intent...</p>
        ) : (
          intent && (
            <p className="text-green-600 font-bold text-xl">Intent: {intent}</p>
          )
        )}

        <div className="bg-gray-800 rounded-lg p-6 w-full">
          <h2 className="text-xl font-semibold text-white mb-4">
            Supported Voice Commands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VOICE_COMMANDS.map((command) => (
              <div key={command.id} className="bg-gray-700 p-3 rounded-md">
                <p className="text-white">
                  <span className="font-bold">{command.name}</span> -{" "}
                  {command.description}
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  Examples: {command.examples.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
