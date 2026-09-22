import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Shield,
  Volume2,
  Sparkles,
  ScreenShare,
} from 'lucide-react';

interface ActiveCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerName: string;
  peerAvatar?: string;
  peerRole?: string;
  callType: 'audio' | 'video';
  projectName?: string;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  isOpen,
  onClose,
  peerName,
  peerAvatar,
  peerRole = 'Specialist',
  callType,
  projectName,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'HD Encrypted' | 'Stable'>('HD Encrypted');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Timer for active call duration
  useEffect(() => {
    let timer: any = null;
    if (isOpen) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen]);

  // Handle local camera & microphone streams if permitted
  useEffect(() => {
    if (!isOpen) {
      // Clean up any active tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      return;
    }

    const initStream = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Microphone/Camera device permission not granted or running in sandbox:', err);
      }
    };

    initStream();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, callType]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          setIsScreenSharing(true);
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
        }
      } catch (err) {
        console.warn('Screen share unavailable or cancelled:', err);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <Card className="w-full max-w-4xl bg-slate-950 border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col h-[80vh] max-h-[700px]">
        {/* Top bar header */}
        <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{peerName}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {peerRole}
                </span>
              </div>
              {projectName && (
                <p className="text-xs text-slate-400 truncate max-w-xs">{projectName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>{connectionQuality}</span>
            </div>
            <div className="text-sm font-mono font-bold text-white px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30">
              {formatTime(callDuration)}
            </div>
          </div>
        </div>

        {/* Video & Stage Area */}
        <div className="flex-1 relative bg-gradient-to-b from-slate-900 to-black flex items-center justify-center overflow-hidden">
          {/* Main Remote Video Mock / Simulation Canvas */}
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative">
            {/* Visualizer Wave when audio only */}
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-2 border-cyan-400/40 p-1 flex items-center justify-center overflow-hidden bg-slate-800 shadow-2xl">
                  {peerAvatar ? (
                    <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-3xl font-bold text-cyan-400 font-mono">
                      {peerName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Audio pulse ring */}
                <div className="absolute -inset-3 rounded-full border border-cyan-400/20 animate-ping pointer-events-none" />
                <div className="absolute -inset-6 rounded-full border border-emerald-400/10 animate-pulse pointer-events-none" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{peerName}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Audio connected • 48kHz HD Opus Audio</span>
                </p>
              </div>

              {/* Dynamic Equalizer Simulation */}
              <div className="flex items-center gap-1.5 h-8 mt-2">
                {[40, 75, 100, 60, 85, 30, 95, 70, 50, 80].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 120}ms`,
                      animationDuration: '800ms',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Local Video Thumbnail (PiP) */}
            <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl bg-slate-900 border border-white/20 overflow-hidden shadow-2xl flex items-center justify-center">
              {isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                  <VideoOff className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] font-mono">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-white/80 bg-black/60 px-1.5 py-0.5 rounded">
                You
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/70 flex items-center justify-center gap-4">
          {/* Mute Mic */}
          <Button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Toggle Video */}
          <Button
            type="button"
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all ${
              !isVideoEnabled
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            type="button"
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full p-0 flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
            title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
          >
            <ScreenShare className="w-5 h-5" />
          </Button>

          {/* End Call Button */}
          <Button
            type="button"
            onClick={onClose}
            className="w-14 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white p-0 flex items-center justify-center shadow-lg hover:scale-105 transition-all ml-4"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
