import React, { useEffect, useState } from 'react';
import { Volume2, Mic, Headphones } from 'lucide-react';
import { cn } from '../../../utils/cn';

export function VoiceSettingsCard() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(localStorage.getItem('preferredVoice') || '');

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Filter for English voices by default as the app is optimized for English
      setVoices(availableVoices.filter(v => v.lang.startsWith('en')));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleVoiceChange = (e) => {
    const voiceName = e.target.value;
    setSelectedVoice(voiceName);
    localStorage.setItem('preferredVoice', voiceName);
    
    // Immediate test of the voice so user can hear the difference
    if (voiceName) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Voice calibration successful.");
      const voice = voices.find(v => v.name === voiceName);
      if (voice) {
        utterance.voice = voice;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="rounded-[32px] border border-border/20 bg-secondary/20 p-8 backdrop-blur-3xl shadow-xl">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <Headphones className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-foreground">Voice Interface</h2>
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Configure Speech-to-Text & Output</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <Volume2 className="h-3 w-3" /> Preferred Output Voice
          </label>
          <select
            value={selectedVoice}
            onChange={handleVoiceChange}
            className="w-full rounded-2xl border border-border/20 bg-background/50 px-5 py-4 text-sm font-bold text-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40 backdrop-blur-xl transition-all cursor-pointer hover:bg-background/80"
          >
            <option value="">Default System Voice</option>
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground/40 italic font-medium px-1">
            Note: Available voices depend on your Operating System and Browser.
          </p>
        </div>

        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5">
           <div className="flex items-center gap-3 mb-2">
             <Mic className="h-4 w-4 text-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-primary">Input Calibration</span>
           </div>
           <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
             Input is currently processed via <strong className="text-foreground">Faster-Whisper (Local)</strong>. Accents and speed are automatically handled by the local neural engine.
           </p>
        </div>
      </div>
    </div>
  );
}
