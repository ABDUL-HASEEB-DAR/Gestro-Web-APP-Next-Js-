"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const [key, setKey] = useState();
  const router = useRouter();

  const handleNext = (e) => {
    e.preventDefault();
    router.push(`/main/${key}`);
  };

  return (
    <div className="flex flex-col gap-5 items-center justify-center min-h-screen font-[family-name:var(--font-geist-sans)] ">
      <div className="flex flex-col gap-5 items-center justify-center w-1/3">
        <Image
          className="pb-10"
          src="/LogoRobotw.png"
          width={250}
          height={100}
          alt="logo"
        />
        <h1 className="text-[28px] font-bold leading-[1.2] sm:text-[30px] self-start text-left">
          Enter your Robot's Auth key
        </h1>
        <form className="flex flex-col gap-4 w-full">
          <input
            onChange={(e) => {
              setKey(e.target.value);
            }}
            className="border border-gray-00 rounded-lg p-2"
            placeholder="Enter your key"
          ></input>
          <button
            className="bg-white text-black p-2 rounded-lg"
            onClick={handleNext}
          >
            Go :)
          </button>
        </form>
      </div>
    </div>
  );
}
