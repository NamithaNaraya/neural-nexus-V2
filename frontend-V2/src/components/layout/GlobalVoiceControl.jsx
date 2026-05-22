import React, { useState, useRef, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useVoiceCommands } from '../../hooks/voice/useVoiceCommands';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export function GlobalVoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoStopTimeoutRef = useRef(null);
  const { processText } = useVoiceCommands();

  // Helper to safely stop the recorder
  const stopRecorder = (shouldKeepSystemActive = false) => {
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // We don't set isListening here, we let the onstop handler or the manual click handle it
    }
    
    if (!shouldKeepSystemActive) {
      setIsListening(false);
    }
  };

  const startRecording = async () => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Close stream to free hardware
        stream.getTracks().forEach(track => track.stop());
        handleTranscription(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);

      // Set chunk timer
      autoStopTimeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecorder(true); // Stop chunk but stay active
        }
      }, 4000);

    } catch (err) {
      console.error('🎙️ Global Voice start error:', err);
      toast.error('Mic access failed');
      setIsListening(false);
    }
  };

  const handleTranscription = async (blob) => {
    if (blob.size < 1000) {
       // Too small to be speech
       finalizeTranscription();
       return;
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      
      const response = await api.post('/stt/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data?.success && response.data?.text) {
        const text = response.data.text;
        const result = processText(text);
        
        if (result.matched) {
          toast.success(result.label, { icon: '🎙️', duration: 2000 });
        } else if (text.trim().length > 3) {
          toast(`Heard: "${text}"`, { icon: '💬', duration: 1500 });
        } else {
          // If text is very short/unclear
          console.log('🎙️ Ignored short audio:', text);
        }
      }
    } catch (err) {
      console.error('🎙️ Transcription error:', err);
    } finally {
      finalizeTranscription();
    }
  };

  const finalizeTranscription = () => {
    setIsTranscribing(false);
    // If user didn't click stop, keep the loop going
    if (isListening) {
      setTimeout(() => {
        if (isListening) startRecording();
      }, 300);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/5 border border-red-500/10 animate-in fade-in zoom-in duration-500">
          <span className="relative flex h-1.5 w-1.5">
            {isTranscribing ? (
              <Loader2 className="h-1.5 w-1.5 animate-spin text-primary" />
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </>
            )}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/80">
            {isTranscribing ? 'Processing' : 'Listening'}
          </span>
        </div>
      )}
      
      <button
        onClick={() => isListening ? stopRecorder(false) : startRecording()}
        className={cn(
          "group relative flex h-9 w-9 items-center justify-center rounded-[14px] transition-all duration-500 active:scale-90",
          isListening 
            ? "bg-red-500/10 text-red-500 ring-2 ring-red-500/20 shadow-[0_0_25px_-5px_rgba(239,68,68,0.4)]" 
            : "bg-card text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
        )}
      >
        {isListening && !isTranscribing && (
          <span className="absolute inset-0 rounded-[14px] bg-red-500 animate-pulse opacity-10" />
        )}
        
        {isTranscribing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <StopIcon className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function StopIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}
