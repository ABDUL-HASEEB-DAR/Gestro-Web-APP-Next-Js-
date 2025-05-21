"use client";

import React, { useState, useEffect, use } from "react";
import { FaHandPaper, FaMicrophone } from "react-icons/fa";
import VoiceControl from "../../../components/VoiceControl";
import GestureControl from "../../../components/GestureControl";

export default function Main({ params }) {
  const [mode, setMode] = useState("");
  const [keyVal, setKeyVal] = useState(null);

  const resolvedParams = use(params);

  useEffect(() => {
    if (resolvedParams) {
      setKeyVal(resolvedParams);
    }
  }, [resolvedParams]);

  return (
    <div className="flex flex-1 items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center justify-center w-full max-w-4xl">
        {mode === "" ? (
          <div className="flex flex-row gap-5 justify-center">
            <button
              className="bg-transparent text-white text-[28px] px-30 py-25 rounded-lg border-4 border-b-gray-400 border-t-gray-700 border-l-gray-700 border-r-gray-700
              hover:bg-gray-800 transition-colors flex items-center gap-2"
              onClick={() => {
                setMode("gesture");
              }}
            >
              <FaHandPaper /> Gesture Control
            </button>
            <button
              className="bg-transparent text-white text-[28px] px-30 py-25 rounded-lg border-4 border-b-gray-400 border-t-gray-700 border-l-gray-700 border-r-gray-700
              hover:bg-gray-800 transition-colors flex items-center gap-2"
              onClick={() => {
                setMode("voice");
              }}
            >
              <FaMicrophone /> Voice Control
            </button>
          </div>
        ) : mode === "gesture" ? (
          <GestureControl keyVal={resolvedParams} setMode={setMode} />
        ) : mode === "voice" ? (
          <VoiceControl keyVal={resolvedParams} setMode={setMode} />
        ) : null}
      </main>
    </div>
  );
}
