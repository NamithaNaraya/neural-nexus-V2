import React, { useEffect, useState } from 'react';
import { FolderLock, Loader2, ShieldCheck, UserPlus, X, Lock, Users, Fingerprint } from 'lucide-react';
import { useGlobalFolder } from '../../../contexts/GlobalFolderContext';
import { folderService } from '../../../services/folderService';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Input';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../utils/cn';

export function FolderPermissionsCard() {
  const { currentFolder, selectedFolderId } = useGlobalFolder();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  async function loadPermissions() {
    if (!selectedFolderId) {
      setPermissions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await folderService.getPermissions(selectedFolderId);
      setPermissions(Array.isArray(response?.permissions) ? response.permissions : []);
      setStatus('');
    } catch (error) {
      setPermissions([]);
      setStatus(error.response?.data?.detail || 'Permissions restricted for this folder.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPermissions();
  }, [selectedFolderId]);

  async function handleGrant(event) {
    event.preventDefault();
    if (!selectedFolderId || !userEmail.trim() || saving) return;

    setSaving(true);
    try {
      const response = await folderService.grantPermission(selectedFolderId, userEmail.trim(), permission);
      setStatus(response?.message || 'Access granted.');
      setUserEmail('');
      await loadPermissions();
    } catch (error) {
      setStatus(error.response?.data?.detail || 'Failed to sync permissions.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(userId) {
    if (!selectedFolderId || !userId) return;

    try {
      const response = await folderService.revokePermission(selectedFolderId, userId);
      setStatus(response?.message || 'Access revoked successfully.');
      await loadPermissions();
    } catch (error) {
      setStatus(error.response?.data?.detail || 'Failed to prune access.');
    }
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col border-border/20 bg-secondary/15 shadow-[0_32px_64px_-16px_rgba(45,58,40,0.1)] backdrop-blur-[40px] rounded-[32px] ring-1 ring-white/10 overflow-hidden">
      <CardContent className="p-8 flex flex-col h-full space-y-8">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Access Control</p>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight truncate max-w-[280px]">{currentFolder?.name || 'Secure Folder'}</h2>
          </div>
        </div>

        <form onSubmit={handleGrant} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-5 p-7 rounded-[32px] border border-border/10 bg-white/40 shadow-xl shadow-primary/5">
          <div className="space-y-3">
            <Label className="font-black text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] ml-1">Invite User</Label>
            <Input 
              value={userEmail} 
              onChange={(event) => setUserEmail(event.target.value)} 
              placeholder="user@example.com" 
              className="h-12 rounded-[20px] bg-secondary/10 border-border/15 focus:ring-4 focus:ring-primary/10 font-bold px-5" 
            />
          </div>

          <div className="space-y-3">
            <Label className="font-black text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] ml-1">Permission Level</Label>
            <select
              value={permission}
              onChange={(event) => setPermission(event.target.value)}
              className="h-12 w-full rounded-[20px] border border-border/15 bg-secondary/10 px-5 text-[13px] font-black uppercase tracking-widest text-primary/80 focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2rem' }}
            >
              <option value="read">OBSERVER</option>
              <option value="write">CURATOR</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="h-12 w-full md:w-auto px-8 gap-3 rounded-[20px] shadow-2xl shadow-primary/20 font-black uppercase tracking-[0.1em] transition-all hover:scale-105 active:scale-95" disabled={!selectedFolderId || saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
              Grant
            </Button>
          </div>
        </form>

        {status && (
          <div className="rounded-[20px] border border-primary/20 bg-primary/5 px-6 py-4 text-[12px] font-black uppercase tracking-widest text-primary animate-fade-in shadow-inner">
            {status}
          </div>
        )}

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Authorized Users</p>
            <Badge variant="outline" className="h-5 px-2 text-[9px] font-black border-border/10 text-muted-foreground/30">{permissions.length} USERS</Badge>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center gap-4 p-6 rounded-[24px] border border-border/10 bg-white/20 text-[13px] font-bold text-muted-foreground/40">
                <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
                Synchronizing authorized researchers...
              </div>
            ) : permissions.length > 0 ? (
              permissions.map((entry) => (
                <div key={`${entry.user_id}-${entry.permission}`} className="group flex items-center justify-between gap-5 rounded-[24px] border border-border/10 bg-white/40 px-6 py-4.5 hover:border-primary/30 hover:bg-white/60 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5">
                  <div className="min-w-0 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary/30 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
                        <Fingerprint className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-foreground tracking-tight uppercase text-[13px]">{entry.user_email || 'Masked Target'}</p>
                      <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                        <ShieldCheck className="h-3 w-3" />
                        {entry.permission === 'write' ? 'CURATOR' : 'OBSERVER'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(entry.user_id)}
                    className="rounded-xl p-3 text-muted-foreground/30 transition-all hover:bg-destructive/10 hover:text-destructive group/revoke"
                    title="Revoke access"
                  >
                    <X className="h-5 w-5 transition-transform group-hover/revoke:rotate-90 group-hover/revoke:scale-110" />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[32px] border border-dashed border-border/20 bg-secondary/5 px-6 py-12 text-center group">
                <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4 group-hover:scale-110 transition-transform duration-700" />
                <p className="text-[13px] font-black uppercase tracking-widest text-muted-foreground/40">No users with access yet.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
