"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import DailyIframe from "@daily-co/daily-js";

// =============================================
// TYPES
// =============================================
interface PatientVideoEmbedProps {
  appointment: {
    id: string;
    dailyco_meeting_url: string | null;
    dailyco_room_name: string | null;
    dailyco_owner_token: string | null;
    requested_date_time: string | null;
  } | null;
  patientName?: string;
  doctorName?: string;
}

// Daily Frame type
type DailyFrame = ReturnType<typeof DailyIframe.createFrame>;

// =============================================
// PANEL STATES
// =============================================
type PanelState = "closed" | "expanded" | "minimized";
type CallState = "idle" | "joining" | "joined" | "error" | "left";

// =============================================
// MAIN COMPONENT
// =============================================
export default function PatientVideoEmbed({
  appointment,
  patientName = "Patient",
  doctorName = "Your Provider",
}: PatientVideoEmbedProps) {
  // =============================================
  // PORTAL & MOUNTING
  // =============================================
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);

    // Create portal container
    const existing = document.getElementById("medazon-patient-video-portal");
    if (existing) {
      setPortalContainer(existing);
    } else {
      const container = document.createElement("div");
      container.id = "medazon-patient-video-portal";
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
      `;
      document.body.appendChild(container);
      setPortalContainer(container);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Cleanup portal on unmount
  useEffect(() => {
    return () => {
      const el = document.getElementById("medazon-patient-video-portal");
      if (el && document.body.contains(el)) {
        document.body.removeChild(el);
      }
    };
  }, []);

  // =============================================
  // PANEL STATE
  // =============================================
  const [panelState, setPanelState] = useState<PanelState>("closed");
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 700, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const posRef = useRef(position);
  const sizeRef = useRef(size);

  useEffect(() => { posRef.current = position; }, [position]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  // =============================================
  // DAILY.CO STATE
  // =============================================
  const dailyFrameRef = useRef<DailyFrame | null>(null);
  const prebuiltContainerRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [callError, setCallError] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"good" | "low" | "very-low">("good");

  // =============================================
  // COUNTDOWN
  // =============================================
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!appointment?.requested_date_time) return;
    const updateTimer = () => {
      const diff = new Date(appointment.requested_date_time!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }
      setTimeRemaining({
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isPast: false,
      });
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [appointment?.requested_date_time]);

  const joinUrl = useMemo(() => appointment?.dailyco_meeting_url || "", [appointment?.dailyco_meeting_url]);

  // =============================================
  // DRAG & RESIZE HANDLERS
  // =============================================
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = posRef.current;

    const onMove = (ev: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(startPos.x + ev.clientX - startX, window.innerWidth - 100)),
        y: Math.max(0, Math.min(startPos.y + ev.clientY - startY, window.innerHeight - 50)),
      });
    };
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [isMobile]);

  const startResize = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = sizeRef.current;

    const onMove = (ev: MouseEvent) => {
      setSize({
        width: Math.max(500, Math.min(startSize.width + ev.clientX - startX, window.innerWidth - posRef.current.x)),
        height: Math.max(350, Math.min(startSize.height + ev.clientY - startY, window.innerHeight - posRef.current.y)),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [isMobile]);

  // =============================================
  // DAILY PREBUILT INITIALIZATION
  // =============================================
  const initializeDailyPrebuilt = useCallback(async () => {
    if (!joinUrl) {
      setCallError("No meeting URL available");
      setCallState("error");
      return;
    }

    if (!prebuiltContainerRef.current) {
      setCallError("Video container not ready");
      setCallState("error");
      return;
    }

    try {
      setCallState("joining");
      setCallError(null);

      // Cleanup existing frame if any
      if (dailyFrameRef.current) {
        try {
          await dailyFrameRef.current.destroy();
        } catch (e) {
          console.warn("Error destroying existing frame:", e);
        }
        dailyFrameRef.current = null;
      }

      // Clear container
      prebuiltContainerRef.current.innerHTML = "";

      // Create Daily Prebuilt Frame with dark theme
      const frame = DailyIframe.createFrame(prebuiltContainerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
          background: "#0a0e14",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: true,
        // Dark theme customization
        theme: {
          colors: {
            accent: "#00cba9", // Teal accent (Medazon brand)
            accentText: "#ffffff",
            background: "#0a0e14",
            backgroundAccent: "#1a2332",
            baseText: "#ffffff",
            border: "#2d3748",
            mainAreaBg: "#0a0e14",
            mainAreaBgAccent: "#0f1419",
            mainAreaText: "#ffffff",
            supportiveText: "#94a3b8",
          },
        },
        layoutConfig: {
          grid: {
            maxTilesPerPage: 4,
            minTilesPerPage: 1,
          },
        },
      });

      dailyFrameRef.current = frame;

      // ========== EVENT HANDLERS ==========
      
      frame.on("joined-meeting", () => {
        console.log("Daily: joined-meeting");
        setCallState("joined");
        setCallError(null);
        callTimerRef.current = setInterval(() => {
          setCallSeconds((prev) => prev + 1);
        }, 1000);
        const participants = frame.participants();
        setParticipantCount(Object.keys(participants).length);
      });

      frame.on("left-meeting", () => {
        console.log("Daily: left-meeting");
        setCallState("left");
        setCallSeconds(0);
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
      });

      frame.on("participant-joined", (event) => {
        console.log("Daily: participant-joined", event?.participant?.user_name);
        const participants = frame.participants();
        setParticipantCount(Object.keys(participants).length);
      });

      frame.on("participant-left", (event) => {
        console.log("Daily: participant-left", event?.participant?.user_name);
        const participants = frame.participants();
        setParticipantCount(Object.keys(participants).length);
      });

      frame.on("network-quality-change", (event) => {
        if (event?.threshold) {
          setNetworkQuality(event.threshold as "good" | "low" | "very-low");
        }
      });

      frame.on("error", (event) => {
        console.error("Daily: error", event);
        setCallError(event?.errorMsg || "An error occurred");
        setCallState("error");
      });

      // ========== JOIN THE MEETING ==========
      console.log("Daily: Joining meeting...", joinUrl);
      
      // Build join config - only include token if it's a valid string
      const joinConfig: { url: string; userName: string; token?: string } = {
        url: joinUrl,
        userName: patientName,
      };
      
      // Only add token if it exists and is a non-empty string
      if (appointment?.dailyco_owner_token && typeof appointment.dailyco_owner_token === 'string' && appointment.dailyco_owner_token.trim() !== '') {
        joinConfig.token = appointment.dailyco_owner_token;
      }
      
      await frame.join(joinConfig);

      console.log("Daily: Join call completed");

    } catch (error) {
      console.error("Failed to initialize Daily:", error);
      setCallError(error instanceof Error ? error.message : "Failed to join meeting");
      setCallState("error");
    }
  }, [joinUrl, appointment?.dailyco_owner_token, patientName]);

  // =============================================
  // CALL CONTROLS
  // =============================================
  const toggleMute = useCallback(async () => {
    const frame = dailyFrameRef.current;
    if (!frame) return;
    
    try {
      const newMutedState = !isMuted;
      frame.setLocalAudio(!newMutedState);
      setIsMuted(newMutedState);
    } catch (error) {
      console.error("Toggle mute error:", error);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    const frame = dailyFrameRef.current;
    if (!frame) return;
    
    try {
      const newVideoOffState = !isVideoOff;
      frame.setLocalVideo(!newVideoOffState);
      setIsVideoOff(newVideoOffState);
    } catch (error) {
      console.error("Toggle video error:", error);
    }
  }, [isVideoOff]);

  const leaveCall = useCallback(async () => {
    const frame = dailyFrameRef.current;
    
    if (frame) {
      try {
        await frame.leave();
        await frame.destroy();
      } catch (e) {
        console.warn("Error leaving call:", e);
      }
      dailyFrameRef.current = null;
    }
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    setCallState("idle");
    setCallSeconds(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setPanelState("closed");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dailyFrameRef.current) {
        dailyFrameRef.current.destroy().catch(console.error);
        dailyFrameRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, []);

  // =============================================
  // HELPERS
  // =============================================
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isInCall = callState === "joined";

  // =============================================
  // RENDER: TRIGGER BUTTON (Orange "Start Visit" button)
  // =============================================
  const renderTriggerButton = () => (
    <button
      onClick={() => setPanelState("expanded")}
      disabled={!joinUrl}
      className={`flex flex-col w-full text-center font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-lg transition-all shadow-lg ${
        joinUrl
          ? "bg-[#f97316] hover:bg-orange-600 text-black cursor-pointer"
          : "bg-gray-600 text-white cursor-not-allowed"
      }`}
    >
      <span className="text-lg">Click Here to Start Visit</span>
      <span className="text-sm mt-3 opacity-80">We also sent it to you by SMS/E-mail</span>
    </button>
  );

  // =============================================
  // RENDER: MINIMIZED BAR
  // =============================================
  const renderMinimizedBar = () => (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-2 bg-slate-900/95 backdrop-blur-md border border-[#00cba9]/50 rounded-full shadow-2xl"
      style={{
        position: "absolute",
        left: isMobile ? "50%" : position.x,
        bottom: isMobile ? 20 : "auto",
        top: isMobile ? "auto" : position.y,
        transform: isMobile ? "translateX(-50%)" : "none",
      }}
    >
      {/* Status indicator */}
      <div className={`w-3 h-3 rounded-full ${isInCall ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
      
      {/* Timer */}
      <span className="text-white font-mono text-sm">{formatTime(callSeconds)}</span>
      
      {/* Status text */}
      <span className="text-gray-400 text-sm hidden sm:block">
        {isInCall ? `With ${doctorName}` : `Waiting for ${doctorName}`}
      </span>
      
      {/* Mute button */}
      <button onClick={toggleMute} className={`p-2 rounded-full ${isMuted ? "bg-red-500" : "bg-slate-700"}`}>
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMuted ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          )}
        </svg>
      </button>
      
      {/* Expand button */}
      <button onClick={() => setPanelState("expanded")} className="p-2 bg-[#00cba9] rounded-full hover:bg-[#00cba9]/80">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      
      {/* End call button */}
      <button onClick={leaveCall} className="p-2 bg-red-600 rounded-full hover:bg-red-700">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  // =============================================
  // RENDER: EXPANDED PANEL
  // =============================================
  const renderExpandedPanel = () => (
    <div
      className={`pointer-events-auto flex flex-col bg-[#0a0e14] rounded-2xl shadow-2xl overflow-hidden border-2 border-[#00cba9]/30`}
      style={{
        position: "absolute",
        left: isMobile ? 0 : position.x,
        top: isMobile ? 0 : position.y,
        width: isMobile ? "100%" : size.width,
        height: isMobile ? "100%" : size.height,
        cursor: isDragging ? "grabbing" : "default",
        boxShadow: "0 25px 80px rgba(0, 203, 169, 0.15), 0 10px 40px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0a0e14] to-[#0f1419] border-b border-slate-700/50 cursor-grab active:cursor-grabbing flex-shrink-0"
        onMouseDown={startDrag}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center flex-shrink-0">
            <span className="text-orange-500 font-bold tracking-wider">MEDAZON</span>
            <span className="text-white font-bold mx-1">+</span>
            <span className="text-[#00cba9] font-bold tracking-wider">HEALTH</span>
          </div>
          
          {/* Call status */}
          <div className="flex items-center gap-2 ml-4 bg-slate-800/50 px-3 py-1 rounded-full flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isInCall ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
            <span className="text-white text-sm font-mono">{formatTime(callSeconds)}</span>
            {isInCall && <span className="text-gray-500 text-sm">• {participantCount}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isMobile && <span className="text-slate-500 text-xs mr-2">Drag to move</span>}
          <button onClick={() => setPanelState("minimized")} className="p-2 hover:bg-white/10 rounded-lg text-white" title="Minimize">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button onClick={leaveCall} className="p-2 hover:bg-red-500/30 rounded-lg text-white" title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative min-h-0">
        {/* Pre-call state */}
        {callState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#00cba9] to-[#0891b2] rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#00cba9]/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">Ready to Join</h3>
              <p className="text-gray-400 mb-6">Your video visit with {doctorName}</p>
              <button
                onClick={initializeDailyPrebuilt}
                className="px-8 py-3 bg-gradient-to-r from-[#00cba9] to-[#0891b2] text-white rounded-xl hover:from-[#00cba9]/90 hover:to-[#0891b2]/90 transition-all font-semibold shadow-lg shadow-[#00cba9]/30"
              >
                Join Video Call
              </button>
            </div>
          </div>
        )}

        {/* Joining state */}
        {callState === "joining" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center p-6">
              <div className="w-16 h-16 border-4 border-[#00cba9]/30 border-t-[#00cba9] rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-white text-xl font-semibold mb-2">Connecting...</h3>
              <p className="text-gray-400">Setting up your video visit</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {callState === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center p-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">Connection Error</h3>
              <p className="text-red-400 mb-4">{callError || "Failed to join the meeting"}</p>
              <button
                onClick={initializeDailyPrebuilt}
                className="px-6 py-2 bg-[#00cba9] text-white rounded-lg hover:bg-[#00cba9]/80 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Daily Prebuilt iframe container */}
        <div 
          ref={prebuiltContainerRef} 
          className="absolute inset-0"
          style={{ 
            display: (callState === "joining" || callState === "joined") ? "block" : "none",
            background: "#0a0e14"
          }}
        />
      </div>

      {/* Bottom Controls */}
      {isInCall && (
        <div className="flex items-center justify-center gap-3 p-4 bg-[#0a0e14] border-t border-slate-700/50 flex-shrink-0">
          {/* Mute */}
          <button onClick={toggleMute} className={`p-3 rounded-full transition-all ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`} title={isMuted ? "Unmute" : "Mute"}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              )}
            </svg>
          </button>

          {/* Camera */}
          <button onClick={toggleVideo} className={`p-3 rounded-full transition-all ${isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`} title={isVideoOff ? "Turn on camera" : "Turn off camera"}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isVideoOff ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              )}
            </svg>
          </button>

          {/* End Call */}
          <button onClick={leaveCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all" title="End Call">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      )}

      {/* Resize Handle */}
      {!isMobile && (
        <div
          className="absolute right-0 bottom-0 w-6 h-6 cursor-se-resize bg-[#00cba9]/50 rounded-tl-lg hover:bg-[#00cba9] transition-colors flex items-center justify-center"
          onMouseDown={startResize}
        >
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}
    </div>
  );

  // =============================================
  // MAIN RENDER
  // =============================================
  const renderFloatingContent = () => {
    const showMinimizedBar = panelState === "minimized";
    const keepExpandedMounted = panelState === "expanded" || (panelState === "minimized" && isInCall);
    const isExpandedVisible = panelState === "expanded";
    
    return (
      <>
        {showMinimizedBar && renderMinimizedBar()}
        {keepExpandedMounted && (
          <div 
            style={{ 
              visibility: isExpandedVisible ? "visible" : "hidden",
              pointerEvents: isExpandedVisible ? "auto" : "none",
            }}
          >
            {renderExpandedPanel()}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {renderTriggerButton()}

      {isMounted && portalContainer && panelState !== "closed" && createPortal(renderFloatingContent(), portalContainer)}
    </>
  );
}

