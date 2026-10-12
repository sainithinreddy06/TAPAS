'use client'

import { useEffect, useRef, useState } from 'react'
import { Phone, PhoneCall, PhoneOff, Volume2, ShieldAlert, CheckCircle2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceCallModalProps {
  isOpen: boolean
  onClose: () => void
  recipientName: string
  recipientPhone: string
  wardName: string
  onAcknowledged?: () => void
}

export function VoiceCallModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  wardName,
  onAcknowledged,
}: VoiceCallModalProps) {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'completed' | 'ended'>('ringing')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [keypadPressed, setKeypadPressed] = useState<number | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Play telephone ring tone using Web Audio API
  const playRingTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.frequency.value = 440 // A4
      osc2.frequency.value = 480 // B4
      osc1.type = 'sine'
      osc2.type = 'sine'

      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(ctx.currentTime)
      osc2.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 1.2)
      osc2.stop(ctx.currentTime + 1.2)
    } catch {
      // Audio context might require explicit user gesture
    }
  }

  // Play DTMF Touchtone beep
  const playDTMF = (digit: number) => {
    try {
      if (!audioCtxRef.current) return
      const ctx = audioCtxRef.current
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      const freqs = digit === 1 ? [697, 1209] : [697, 1336]
      osc1.frequency.value = freqs[0]
      osc2.frequency.value = freqs[1]
      gain.gain.value = 0.12

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      setTimeout(() => {
        osc1.stop()
        osc2.stop()
      }, 200)
    } catch {}
  }

  // Speak voice broadcast using Web Speech Synthesis
  const speakBroadcast = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const text = `This is an automated heat alert from TAPAS, the Thermal Analytics and Public health Advisory System. You have been alerted by the Mandal Officer for ${wardName}. The current heat risk level is Extreme, Level 5. Thermal stress index is 43 degrees Celsius. The high risk period is from 12:40 to 17:20 today. Recommended emergency actions: One. Conduct welfare checks on elderly residents in your area. Two. Verify that drinking water points are functioning. Three. Confirm cooling centres are open and accessible. Four. Suspend outdoor work during the high risk period. Press 1 on your keypad to acknowledge this alert, or press 2 if you require assistance.`

    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.95
    utter.pitch = 1.0

    // Prefer Indian English voice if available in system
    const voices = window.speechSynthesis.getVoices()
    const indianVoice = voices.find((v) => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Aditi'))
    if (indianVoice) utter.voice = indianVoice

    utter.onstart = () => {
      setTranscript(
        `"This is an automated heat alert from TAPAS... Heat risk level is EXTREME (Level 5) for ${wardName}. Suspend outdoor works 12:40-17:20. Press 1 to acknowledge, or 2 for assistance."`
      )
    }

    utter.onerror = () => {
      setAudioBlocked(true)
    }

    window.speechSynthesis.speak(utter)
  }

  // Ringing cycle
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      setCallState('ringing')
      setSeconds(0)
      setTranscript('')
      setKeypadPressed(null)
      return
    }

    // Start ringing
    playRingTone()
    ringIntervalRef.current = setInterval(() => {
      playRingTone()
    }, 2800)

    // Auto-connect after 3 seconds
    const connectTimer = setTimeout(() => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
      setCallState('connected')
      speakBroadcast()

      // Start call timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }, 3200)

    return () => {
      clearTimeout(connectTimer)
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isOpen, wardName])

  const handleKeypad = (digit: number) => {
    setKeypadPressed(digit)
    playDTMF(digit)

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const confirmText =
        digit === 1
          ? 'Alert acknowledged via keypad. Mandal Command updated. Stay safe and hydrated.'
          : 'Assistance request logged. Mandal Emergency Response team notified.'
      const utter = new SpeechSynthesisUtterance(confirmText)
      utter.rate = 1.0
      const voices = window.speechSynthesis.getVoices()
      const indianVoice = voices.find((v) => v.lang === 'en-IN' || v.name.includes('India'))
      if (indianVoice) utter.voice = indianVoice
      window.speechSynthesis.speak(utter)
      setTranscript(`Keypad [${digit}] Received: ${confirmText}`)
    }

    setCallState('completed')
    onAcknowledged?.()

    setTimeout(() => {
      onClose()
    }, 3500)
  }

  const handleEndCall = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setCallState('ended')
    setTimeout(() => {
      onClose()
    }, 600)
  }

  if (!isOpen) return null

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[#0C1014] p-6 shadow-2xl text-center space-y-5 overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-700 ${
            callState === 'ringing'
              ? 'bg-amber-500'
              : callState === 'connected'
              ? 'bg-emerald-500'
              : 'bg-blue-500'
          }`}
        />

        {/* Header Badges */}
        <div className="flex items-center justify-between border-b border-[#20272D] pb-3 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <Radio className="h-3.5 w-3.5 animate-pulse text-amber-400" />
            <span>TAPAS AUTOMATED VOICE BROADCAST</span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {callState === 'ringing' ? 'OUTBOUND DIALING' : `LIVE AUDIO · ${formatTimer(seconds)}`}
          </span>
        </div>

        {/* Recipient Profile */}
        <div className="space-y-1.5 pt-2">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#1C252D] to-[#121920] border-2 border-emerald-500/40 shadow-inner">
            {callState === 'ringing' ? (
              <Phone className="h-9 w-9 text-amber-400 animate-bounce" />
            ) : callState === 'connected' ? (
              <PhoneCall className="h-9 w-9 text-emerald-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            )}

            {/* Ripple rings when ringing */}
            {callState === 'ringing' && (
              <div className="absolute inset-0 rounded-full border border-amber-400/40 animate-ping" />
            )}
          </div>

          <h3 className="text-lg font-bold text-white pt-2">{recipientName}</h3>
          <p className="text-xs font-mono text-[var(--accent)]">{recipientPhone}</p>
          <p className="text-[11px] text-[var(--text-muted)]">Jurisdiction: {wardName} Mandal Command</p>
        </div>

        {/* Call Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#20272D] bg-[#141B22] px-4 py-1.5 text-xs">
          {callState === 'ringing' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-semibold">Ringing mobile handset…</span>
            </>
          ) : callState === 'connected' ? (
            <>
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-semibold">Audio Advisory Active (Amazon Polly Aditi)</span>
            </>
          ) : callState === 'completed' ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold">
                Alert Acknowledged via DTMF Keypad [{keypadPressed ?? 1}]
              </span>
            </>
          ) : (
            <span className="text-[var(--text-muted)]">Call Ended</span>
          )}
        </div>

        {/* Live Audio Transcript Box */}
        {callState === 'connected' && (
          <div className="rounded-xl border border-[#20272D] bg-[#080B0E] p-3 text-left space-y-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE SPEECH TRANSCRIPT
              </span>
              <span>16 kHz Mono TTS</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono whitespace-pre-wrap">
              {transcript || 'Connecting speech engine audio stream…'}
            </p>
          </div>
        )}

        {/* Interactive Keypad Response per SIH Part 4.3 */}
        {callState === 'connected' && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              Simulate recipient mobile keypad input:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleKeypad(1)}
                className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 p-2.5 text-xs font-bold text-emerald-300 transition-colors shadow-sm"
              >
                <span className="rounded bg-emerald-500 text-black px-1.5 py-0.5 text-[10px] font-black font-mono">1</span>
                <span>Acknowledge Alert</span>
              </button>

              <button
                type="button"
                onClick={() => handleKeypad(2)}
                className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 p-2.5 text-xs font-bold text-amber-300 transition-colors shadow-sm"
              >
                <span className="rounded bg-amber-500 text-black px-1.5 py-0.5 text-[10px] font-black font-mono">2</span>
                <span>Request Assistance</span>
              </button>
            </div>
          </div>
        )}

        {/* End Call Button */}
        <div className="pt-2 border-t border-[#20272D] flex items-center justify-center">
          <Button
            type="button"
            onClick={handleEndCall}
            className="w-full max-w-[200px] bg-red-600 hover:bg-red-500 text-white text-xs font-bold gap-2 py-2.5 rounded-full shadow-lg shadow-red-950/50"
          >
            <PhoneOff className="h-4 w-4" /> End Voice Call
          </Button>
        </div>
      </div>
    </div>
  )
}
