import React from 'react';
import { useVoiceCommands } from '../../hooks/voice/useVoiceCommands';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Send, Loader2, Globe, Mic, Square, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export function ChatInput({ 
  input, 
  setInput, 
  onSubmit, 
  onWebSearch, 
  loading, 
  inputRef,
  isWebSearchEnabled,
  setIsWebSearchEnabled
}) {
  const [isListening, setIsListening] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const { processText } = useVoiceCommands();

  const startRecording = async () => {
    try {
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log(`🎙️ Audio chunk received: ${e.data.size} bytes`);
        }
      };
      
      recorder.onstop = async () => {
        console.log('🎙️ Recorder stopped. Creating blob...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log(`🎙️ Final Blob size: ${audioBlob.size} bytes. Starting transcription...`);
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Capture in 1s slices for reliability
      setIsListening(true);
      console.log('🎙️ Recording started (Local)');
    } catch (err) {
      console.error('🎙️ Failed to start recording:', err);
      toast.error('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    console.log('🎙️ Stop triggered. State:', { 
      hasRecorder: !!mediaRecorderRef.current, 
      isListening 
    });
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      console.log('🎙️ MediaRecorder.stop() called');
    } else {
      console.warn('🎙️ Cannot stop: recorder is null or already inactive');
      setIsListening(false);
    }
  };

  const handleTranscription = async (blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      
      const response = await api.post('/stt/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data?.success && response.data?.text) {
        const text = response.data.text;
        
        // INTERCEPT COMMANDS
        const cmd = processText(text);
        if (cmd.matched) {
          setInput(''); // Clear any partial text
          toast.success(cmd.label, {
            icon: '🎙️',
            style: {
              borderRadius: '20px',
              background: 'hsl(var(--secondary))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--primary) / 0.2)',
              fontWeight: 'bold',
              fontSize: '12px'
            }
          });
          return;
        }

        setInput(text);
      }
    } catch (err) {
      console.error('🎙️ Transcription error:', err);
      toast.error('Failed to transcribe audio.');
    } finally { 
      setIsTranscribing(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isListening) {
        console.log('🎙️ ESC pressed - stopping recording');
        stopRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  // For debugging
  React.useEffect(() => {
    window.stopMic = stopRecording;
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleFormSubmit = (e) => {
    if (isListening) {
      stopRecording();
    }
    onSubmit(e);
  };

  return (
    <div className="relative z-10 px-8 pb-10 pt-4">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-border/20 bg-secondary/30 p-2 shadow-[0_32px_64px_-12px_rgba(45,58,40,0.15)] backdrop-blur-3xl ring-1 ring-white/10 transition-all duration-700 hover:shadow-[0_48px_80px_-12px_rgba(45,58,40,0.2)]">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2.5">
          <label htmlFor="chat-message-input" className="sr-only">
            Ask a question or query the network
          </label>
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
              disabled={loading}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-500 rounded-2xl",
                isWebSearchEnabled 
                  ? "bg-primary text-white shadow-xl shadow-primary/30" 
                  : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
              )}
              title={isWebSearchEnabled ? "Search Local Graph Only" : "Enable External Web Search"}
              aria-label={isWebSearchEnabled ? "Disable web search" : "Enable web search"}
            >
              <Globe className={cn("w-5.5 h-5.5 transition-transform duration-700", isWebSearchEnabled && "animate-spin-slow")} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleListening();
              }}
              disabled={loading || isTranscribing}
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center transition-all duration-500 rounded-2xl relative",
                isListening 
                  ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110 animate-pulse" 
                  : (isTranscribing ? "bg-primary/20 text-primary" : "text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10")
              )}
              title={isTranscribing ? "Transcribing..." : (isListening ? "Click to Finish (ESC)" : "Voice input")}
            >
              {isTranscribing ? (
                <Loader2 className="w-5.5 h-5.5 animate-spin" />
              ) : isListening ? (
                <Square className="w-5.5 h-5.5 fill-current" />
              ) : (
                <Mic className="w-5.5 h-5.5" />
              )}
            </button>
            {isListening && (
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse hidden md:block px-2">
                Listening...
              </span>
            )}
          </div>

          <div className="flex-1 relative flex items-center">
            <Input
              id="chat-message-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTranscribing ? "Transcribing voice..." : (isListening ? "I'm listening..." : (isWebSearchEnabled ? "Query the global network..." : "Search the local graph..."))}
              className="flex-1 border-none bg-transparent shadow-none focus:ring-0 h-12 text-[15px] font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 pr-10"
              disabled={loading || isTranscribing}
              aria-describedby="chat-input-help"
              autoComplete="off"
            />
            {input && !loading && !isTranscribing && (
              <button
                type="button"
                onClick={() => setInput('')}
                className="absolute right-2 text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-2xl shadow-xl shadow-primary/20 transition-all duration-500 active:scale-95 group/send"
            disabled={loading || isTranscribing || !input.trim()}
            aria-label={loading ? 'Synthesizing...' : 'Seed query'}
          >
            {loading ? (
              <Loader2 className="w-5.5 h-5.5 animate-spin" />
            ) : (
              <Send className="w-5.5 h-5.5 transition-transform group-hover/send:translate-x-1 group-hover/send:-translate-y-1" />
            )}
          </Button>
        </form>
      </div>
      <p id="chat-input-help" className="sr-only">
        Enter to submit. Use the globe to toggle web search.
      </p>
    </div>
  );
}
