import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition && typeof navigator !== "undefined" && !!navigator.mediaDevices;

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    // Explicitly request mic permission first so the user sees a real browser prompt
    // instead of a silent red flash on denial
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep the stream alive while recording so Chrome doesn't revoke access mid-session
      streamRef.current = stream;
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone access denied. Allow microphone in your browser's site settings and try again."
          : err.name === "NotFoundError"
          ? "No microphone found. Plug one in and try again."
          : `Microphone error: ${err.message}`;
      setError(msg);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      const errorMessages: Record<string, string> = {
        "not-allowed": "Microphone access denied. Check site settings in your browser.",
        "no-speech": "No speech detected. Try speaking closer to your mic.",
        "audio-capture": "Microphone not available. Check your device settings.",
        "network": "Network error during speech recognition.",
      };
      setError(errorMessages[event.error] || `Speech error: ${event.error}`);
      setIsListening(false);
      stopStream();
    };

    recognition.onend = () => {
      setIsListening(false);
      stopStream();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setError(null);
    setTranscript("");
    setInterimTranscript("");
  }, [SpeechRecognition]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    stopStream();
  }, [stopStream]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopStream();
    };
  }, [stopStream]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}
