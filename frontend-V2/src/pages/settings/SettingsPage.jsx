import React from 'react';
import { ProfileCard } from './components/ProfileCard';
import { AppearanceCard } from './components/AppearanceCard';
import { VoiceSettingsCard } from './components/VoiceSettingsCard';
import { FolderPermissionsCard } from './components/FolderPermissionsCard';
import { PasswordCard } from './components/PasswordCard';
import { Settings2, Sliders, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export default function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-hidden pt-4 bg-transparent">
      {/* Settings Header */}
      <div className="flex flex-col gap-4 px-2">
        <div className="flex items-center gap-3">
           <div className="p-2.5 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/20">
             <Settings2 className="h-6 w-6 text-primary animate-spin-slow" />
           </div>
           <Badge variant="secondary" className="px-5 py-2 text-[10px] bg-primary/5 text-primary border border-primary/20 uppercase tracking-[0.3em] font-black rounded-xl">
             System Calibration
           </Badge>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">Settings</h1>
          <p className="max-w-3xl text-[14px] text-muted-foreground/60 font-bold leading-relaxed tracking-tight group-hover:text-muted-foreground/80 transition-colors">
            Configure your workspace. Manage profile settings, security options, and data access permissions across the platform.
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-2 pb-10 custom-scrollbar xl:grid-cols-[1.1fr_0.9fr] animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex min-h-0 flex-col gap-6">
          <div className="animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
            <ProfileCard />
          </div>
          <div className="animate-in fade-in slide-in-from-left-8 duration-700 delay-300">
            <FolderPermissionsCard />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-6 text-foreground">
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
            <PasswordCard />
          </div>
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-400">
            <AppearanceCard />
          </div>
          <div className="animate-in fade-in slide-in-from-right-8 duration-700 delay-500">
            <VoiceSettingsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
