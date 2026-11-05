"use client";

import { useState, useEffect } from "react";

interface RoomSettingsModalProps {
  timerDuration: number;
  onUpdateTimer: (sec: number) => void;
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  voiceSpeed: number;
  onUpdateSpeed: (speed: number) => void;
  voicePitch: number;
  onUpdatePitch: (pitch: number) => void;
  onClose: () => void;
}

export function RoomSettingsModal({
  timerDuration,
  onUpdateTimer,
  voiceEnabled,
  onToggleVoice,
  voiceSpeed,
  onUpdateSpeed,
  voicePitch,
  onUpdatePitch,
  onClose,
}: RoomSettingsModalProps) {
  const [localTimer, setLocalTimer] = useState(timerDuration);
  const [appliedFeedback, setAppliedFeedback] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(voiceSpeed);
  const [localPitch, setLocalPitch] = useState(voicePitch);
  const [localVoiceEnabled, setLocalVoiceEnabled] = useState(voiceEnabled);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  useEffect(() => {
    setLocalTimer(timerDuration);
  }, [timerDuration]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const avail = window.speechSynthesis.getVoices();
        if (avail.length > 0) {
          setVoices(avail);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  function handleTestVoice() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance("Pawan Sehrawat to Tamil Thalaivas for 2.6 Crore! Going once, going twice, SOLD!");
      utt.rate = localSpeed;
      utt.pitch = localPitch;
      if (voices[selectedVoiceIndex]) {
        utt.voice = voices[selectedVoiceIndex];
      }
      window.speechSynthesis.speak(utt);
    }
  }

  function handleApply() {
    onUpdateTimer(localTimer);
    onToggleVoice(localVoiceEnabled);
    onUpdateSpeed(localSpeed);
    onUpdatePitch(localPitch);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-[#101524] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-2xl text-white tracking-wider">
              ROOM & VOICE SETTINGS
            </h3>
            <p className="text-[11px] text-muted uppercase tracking-widest mt-0.5">
              CUSTOMIZE EXPERIENCE
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* 1. Bid Timer (Host) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              BID TIMER (HOST)
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs">
              {localTimer} Seconds
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={localTimer}
            onChange={(e) => setLocalTimer(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
          />

          <button
            onClick={() => {
              onUpdateTimer(localTimer);
              setAppliedFeedback(true);
              setTimeout(() => setAppliedFeedback(false), 2000);
            }}
            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5 ${
              appliedFeedback
                ? "bg-emerald-600 text-white animate-pulse"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {appliedFeedback ? (
              <>
                <span>✓</span>
                <span>TIMER SET TO {localTimer} SECONDS</span>
              </>
            ) : (
              <span>APPLY TIMER SETTINGS</span>
            )}
          </button>
        </div>

        {/* 2. Voice Auctioneer Settings (Screenshot 3 match) */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                VOICE AUCTIONEER
              </span>
              <p className="text-[11px] text-muted">AI speech callouts for live bids & hammer</p>
            </div>
            <button
              onClick={() => setLocalVoiceEnabled(!localVoiceEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                localVoiceEnabled ? "bg-amber-500" : "bg-white/10"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  localVoiceEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {localVoiceEnabled && (
            <div className="space-y-3 animate-in fade-in">
              {/* Speaking speed */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>SPEAKING SPEED</span>
                  <span className="font-mono text-white">{localSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={localSpeed}
                  onChange={(e) => setLocalSpeed(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/10 rounded appearance-none"
                />
              </div>

              {/* Voice pitch */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>VOICE PITCH</span>
                  <span className="font-mono text-white">{localPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.05"
                  value={localPitch}
                  onChange={(e) => setLocalPitch(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/10 rounded appearance-none"
                />
              </div>

              {/* Voice Select */}
              {voices.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold block">
                    SELECT VOICE
                  </span>
                  <select
                    value={selectedVoiceIndex}
                    onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {voices.slice(0, 15).map((v, idx) => (
                      <option key={idx} value={idx}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Test Button */}
              <button
                type="button"
                onClick={handleTestVoice}
                className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <span>🔊</span>
                <span>Test Auctioneer Callout</span>
              </button>
            </div>
          )}
        </div>

        {/* Save / Close */}
        <div className="pt-2">
          <button
            onClick={handleApply}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
