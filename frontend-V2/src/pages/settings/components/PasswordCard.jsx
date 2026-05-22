import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Lock, Fingerprint } from 'lucide-react';
import { Input, Label } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { authService } from '../../../services/authService';
import { cn } from '../../../utils/cn';

function PasswordField({ label, value, onChange, minLength, hint }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">{label}</Label>
        {hint ? <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">{hint}</span> : null}
      </div>
      <div className="relative group">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          minLength={minLength}
          className="h-12 rounded-[20px] bg-secondary/10 border-border/15 pr-12 font-bold focus:ring-4 focus:ring-primary/10 transition-all duration-300"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[14px] text-muted-foreground/30 transition-all hover:bg-primary/10 hover:text-primary group-focus-within:text-primary/60"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    if (newPassword !== confirmPassword) {
      setStatus('Verification failed: passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      setStatus(response?.message || 'Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus(error.response?.data?.detail || 'Password update failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-border/20 bg-secondary/15 p-8 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] ring-1 ring-white/10">
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 border border-primary/20 text-primary shadow-inner">
          <Fingerprint className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Security</p>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Credentials</h2>
        </div>
      </div>

      <div className="mt-8 rounded-[24px] border border-primary/20 bg-primary/5 p-6 shadow-inner ring-1 ring-primary/5">
         <div className="flex items-start gap-4">
            <ShieldCheck className="h-5 w-5 text-primary/60 shrink-0 mt-1" />
            <p className="text-[13px] font-bold text-foreground/80 leading-relaxed tracking-tight">Use a strong password and keep your account credentials secure across the platform.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-[32px] border border-border/10 bg-white/40 p-8 shadow-xl">
        <PasswordField
          label="Current Password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <div className="h-px bg-border/5" />
        <PasswordField
          label="New Password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={3}
          hint="Strength: High"
        />
        <PasswordField
          label="Confirm Password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={3}
        />
        <Button 
            type="submit" 
            className="mt-4 h-14 w-full gap-3 rounded-[22px] bg-primary text-white font-black uppercase tracking-[0.15em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-[12px]" 
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
          Re-Cipher Roots
        </Button>
      </form>

      {status && (
        <div role="status" aria-live="polite" className="mt-6 rounded-[20px] border border-border/10 bg-secondary/10 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-muted-foreground/60 text-center animate-fade-in shadow-inner">
          {status}
        </div>
      )}
    </section>
  );
}
