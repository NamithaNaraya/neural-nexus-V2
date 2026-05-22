import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  BrainCircuit,
  Orbit,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';

export default function LoginPage() {
  const { login, register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isRegister
      ? await register(email, password)
      : await login(email, password);
    if (success) navigate('/folders');
  };

  const features = [
    { icon: Sparkles, title: 'AI-powered RAG', desc: 'Grounded answers across folders, graph context, and saved history.' },
    { icon: Zap, title: 'Live analytics', desc: 'Move from ingestion to graph algorithms and insight flows without friction.' },
    { icon: Shield, title: 'Enterprise-ready', desc: 'Built for structured workspaces, team usage, and connected knowledge systems.' },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[-6%] h-[26rem] w-[26rem] rounded-full bg-primary/16 blur-3xl" />
          <div className="absolute right-[-6%] top-[10%] h-[22rem] w-[22rem] rounded-full bg-accent/16 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[35%] h-[20rem] w-[20rem] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="mx-auto grid min-h-screen w-full max-w-[1380px] items-center gap-16 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
          <div className="hidden lg:flex lg:flex-col lg:justify-between h-[85vh]">
            <div className="mb-10 flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-[20px] bg-primary shadow-2xl shadow-primary/40 ring-4 ring-primary/10">
                <BrainCircuit className="h-7 w-7 text-white" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-2xl font-black tracking-tight text-foreground leading-none">Neural Nexus</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Authentication Core</p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary backdrop-blur-xl">
                  <Orbit className="h-4 w-4" />
                  SECURE ACCESS GATEWAY
                </div>
                <h2 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-foreground xl:text-6xl">
                  Pulse into your <span className="text-primary text-glow-primary">neural</span> workspace.
                </h2>
                <p className="max-w-xl text-xl leading-relaxed text-muted-foreground/70 font-medium">
                  Experience the next generation of professional knowledge management with graph-native AI and high-precision analytics.
                </p>
              </div>

              <div className="grid gap-5">
                {features.map((feat, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-5 rounded-[32px] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-xl group hover:border-primary/30 transition-all duration-500"
                  >
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-secondary text-primary shadow-sm border border-border/20 group-hover:scale-110 transition-transform">
                      <feat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-black tracking-tight text-foreground uppercase tracking-widest">{feat.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground/80 font-medium">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-12 text-xs font-bold text-muted-foreground/50 tracking-widest uppercase">
              Neural Nexus v2.0 Indigo Core · Secure AI Infrastructure
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md space-y-8">
              <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary shadow-2xl shadow-primary/40">
                  <BrainCircuit className="w-9 h-9 text-white" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Neural Nexus</h1>
              </div>

              <section aria-labelledby="login-title" className="space-y-8 rounded-[40px] border border-border/50 bg-card/60 p-10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/20">
                <div className="space-y-3 text-center">
                  <h2 id="login-title" className="text-3xl font-black tracking-tight text-foreground leading-tight">
                    {isRegister ? 'Begin your journey' : 'Systems Check'}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {isRegister
                      ? 'Create your decentralized neural identity'
                      : 'Authenticate to access your workspace'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Email Protocol</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="operator@nexus.io"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      required
                      autoFocus
                      autoComplete="email"
                      className="h-13 px-5 text-base font-bold bg-secondary/50 border-border/40 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 ml-1">Secure Key</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearError();
                        }}
                        required
                        minLength={3}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        className="h-13 px-5 pr-12 text-base font-bold bg-secondary/50 border-border/40 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-all duration-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" aria-live="polite" className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive text-center animate-fade-in shadow-sm shadow-destructive/5">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="default"
                    className="w-full h-14 gap-3 text-base font-black tracking-tight shadow-xl shadow-primary/30 active:scale-[0.98] group"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        {isRegister ? 'CREATE ACCOUNT' : 'AUTHENTICATE'}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="relative p-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                    <span className="bg-transparent px-4 text-muted-foreground/40 backdrop-blur-none">ACCESS OPTIONS</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    clearError();
                  }}
                  className="w-full text-center text-sm font-black tracking-tight text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-500 py-3 rounded-2xl border border-primary/20 bg-primary/5 active:scale-95"
                >
                  {isRegister
                    ? 'ALREADY REGISTERED? LOG IN'
                    : "NO IDENTITY FOUND? JOIN NEXUS"}
                </button>
              </section>

              <p className="text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest px-8">
                By pulsating, you agree to Neural Nexus Neural Privacy Protocols and Terms of Intelligence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
