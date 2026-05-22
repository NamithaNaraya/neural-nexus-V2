import React from 'react';
import { Moon, Palette, Sun, Leaf, Sparkles, Wind } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

const themes = [
  {
    value: 'system',
    label: 'Auto Sync',
    icon: Wind,
    description: 'Adapts to your system theme.',
    preview: 'theme-preview-auto',
  },
  {
    value: 'light',
    label: 'Light Mode',
    icon: Sun,
    description: 'Clean, bright interface for daytime work.',
    preview: 'theme-preview-light',
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    icon: Moon,
    description: 'Low-light layout for focused work sessions.',
    preview: 'theme-preview-dark',
  },
];

export function AppearanceCard() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <Card className="flex h-full min-h-0 flex-col border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
      <CardContent className="p-8 flex flex-col h-full space-y-8">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Palette className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Interface Theme</p>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Display Mode</h2>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Applied Visual State</p>
            <Badge variant="outline" className="h-6 px-3 text-[10px] font-black border-primary/20 text-primary uppercase tracking-widest bg-primary/5">{resolvedTheme}</Badge>
          </div>
          
          <div className="grid gap-5 md:grid-cols-3" role="radiogroup" aria-label="Color theme">
          {themes.map(({ value, label, icon: Icon, description, preview }) => {
            const active = theme === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                role="radio"
                aria-checked={active}
                className={cn(
                  'group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-700',
                  active
                    ? 'border-primary/40 bg-white/60 shadow-[0_24px_48px_-12px_rgba(74,103,65,0.15)] ring-2 ring-primary/20 translate-y-[-4px]'
                    : 'border-border/10 bg-secondary/5 hover:border-primary/20 hover:bg-white/40 hover:translate-y-[-2px]'
                )}
              >
                <div className={cn(
                    'h-28 rounded-[20px] transition-all duration-1000 border border-border/5 group-hover:scale-[1.04] shadow-inner relative overflow-hidden bg-cover bg-center',
                    preview === 'theme-preview-auto' ? 'bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30' : 
                    preview === 'theme-preview-light' ? 'bg-[#F2F2F2]' : 'bg-[#1A1F18]'
                )}>
                    {active && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Leaf className="w-16 h-16 rotate-45" />
                    </div>
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <div className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition-all duration-700 border border-white/20',
                    active ? 'bg-primary text-white shadow-xl shadow-primary/30 rotate-6' : 'bg-secondary/40 text-muted-foreground/30'
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                        "text-[14px] font-black tracking-tight uppercase",
                        active ? "text-primary" : "text-foreground/80"
                    )}>{label}</p>
                    <p className="text-[11px] font-bold text-muted-foreground/40 line-clamp-1 tracking-tight">{description}</p>
                  </div>
                </div>
                {active && (
                   <div className="absolute top-3 right-3">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                   </div>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
