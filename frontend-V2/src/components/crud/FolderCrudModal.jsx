import React, { useEffect, useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Input';
import { folderService } from '../../services/folderService';

const EMPTY_FORM = {
  name: '',
  description: '',
};

export function FolderCrudModal({
  open,
  mode = 'edit',
  initialFolder = null,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setForm(
      initialFolder
        ? {
            name: initialFolder.name || '',
            description: initialFolder.description || '',
          }
        : EMPTY_FORM
    );
    setError('');
  }, [open, initialFolder]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Folder name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let savedFolder = null;
      if (mode === 'create') {
        savedFolder = await folderService.create(form.name.trim(), form.description.trim() || null);
      } else if (initialFolder?.id) {
        savedFolder = await folderService.update(initialFolder.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
        });
      }

      onSuccess?.(savedFolder);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not save folder.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl overflow-hidden border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{mode === 'create' ? 'Create Folder' : 'Edit Folder'}</h2>
            <p className="text-xs text-muted-foreground">Keep folder names clean and easy to scan.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>Folder Name</Label>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Folder name" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Folder description"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/40 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Folder
          </Button>
        </div>
      </Card>
    </div>
  );
}
