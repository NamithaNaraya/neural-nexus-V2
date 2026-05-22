import React from 'react';
import { Shield, User, Leaf } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../utils/cn';

export function ProfileCard() {
  const { user } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <Card className="border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-6 rounded-[28px] border border-border/10 bg-white/40 p-5 shadow-xl transition-all duration-500 hover:shadow-primary/5">
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-primary text-2xl font-black text-white shadow-2xl shadow-primary/30 border-4 border-white/20 animate-float">
              {initial}
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                 <Leaf className="h-3 w-3 text-primary/60" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Researcher Identity</p>
              </div>
              <p className="truncate text-xl font-black text-foreground tracking-tighter uppercase">{user?.email?.split('@')[0] || 'Unknown Species'}</p>
              <p className="truncate text-[12px] font-bold text-muted-foreground/40 lowercase tracking-tight">{user?.email || 'user@research.nexus'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className="h-8 gap-2 rounded-[12px] border border-primary/20 bg-primary/5 px-4 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm group">
              <Shield className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              {user?.role || 'authorized'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
