import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Label } from '../ui/Input';
import { graphService } from '../../services/graphService';

const EMPTY_FORM = {
  name: '',
  type: '',
  description: '',
  propertiesText: '',
};

const INTERNAL_FIELDS = [
  'embedding', 'embeddings', 'vector', 'fastrp_embedding',
  'chunk_id', 'node_id', 'id', 'uuid', 
  'created_at', 'updated_at', 'created_by', 
  'file_id', 'file_ids', 'folder_id', 'folderId',
  'is_manual', 'properties_cleared', 'conflicts',
  'elementId', 'identity', '_nc_type_id'
];

function filterInternalProperties(properties) {
  if (!properties) return {};
  const filtered = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (!INTERNAL_FIELDS.includes(key)) {
      filtered[key] = value;
    }
  });
  return filtered;
}

function safeParseProperties(text) {
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    const entries = {};
    text.split('\n').forEach((line) => {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) return;
      entries[key.trim()] = rest.join(':').trim();
    });
    return entries;
  }
}

export function GraphNodeCrudModal({
  open,
  mode = 'create',
  folderId,
  initialNode = null,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const displayProperties = initialNode ? filterInternalProperties(initialNode.properties) : {};
    const nextForm = initialNode
      ? {
          name: initialNode.name || '',
          type: initialNode.type || '',
          description: initialNode.description || '',
          propertiesText: JSON.stringify(displayProperties, null, 2),
        }
      : EMPTY_FORM;

    setForm(nextForm);
    setError('');

    let ignore = false;
    graphService.getNodeTypes().then((data) => {
      if (ignore) return;
      const nextTypes = Array.isArray(data?.types) ? data.types : [];
      setTypes(nextTypes);
      if (!nextForm.type && nextTypes[0]) {
        setForm((current) => ({ ...current, type: nextTypes[0] }));
      }
    }).catch(() => {});

    return () => {
      ignore = true;
    };
  }, [open, initialNode]);

  const title = useMemo(() => (mode === 'create' ? 'Create Node' : 'Edit Node'), [mode]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.type.trim()) {
      setError('Name and type are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description.trim(),
        properties: safeParseProperties(form.propertiesText),
        folder_id: folderId || undefined,
      };

      const result = mode === 'create'
        ? await graphService.createNode(payload)
        : await graphService.updateNode(initialNode.id, payload);

      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not save node.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialNode?.id) return;
    if (!window.confirm('Delete this node? This cannot be undone.')) return;

    setSaving(true);
    setError('');
    try {
      await graphService.deleteNode(initialNode.id, folderId);
      onSuccess?.({ deleted: true, id: initialNode.id });
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not delete node.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-2xl overflow-hidden border-border/60 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">Add or update a node without leaving the page.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Node name" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                placeholder={types[0] || 'Entity type'}
                list="graph-node-types"
              />
              <datalist id="graph-node-types">
                {types.map((type) => <option key={type} value={type} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              placeholder="Short description"
            />
          </div>

          <div className="space-y-2">
            <Label>Properties</Label>
            <textarea
              value={form.propertiesText}
              onChange={(e) => setForm((prev) => ({ ...prev, propertiesText: e.target.value }))}
              rows={6}
              className="flex w-full rounded-lg border border-input bg-background/50 px-3 py-2 font-mono text-xs backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              placeholder='{"key":"value"} or key: value per line'
            />
            <p className="text-xs text-muted-foreground">Use JSON, or one `key: value` pair per line.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/40 px-5 py-4">
          <div>
            {mode === 'edit' && (
              <Button variant="outline" onClick={handleDelete} disabled={saving} className="gap-2 border-red-500/20 text-red-500 hover:bg-red-500/5">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {mode === 'create' ? 'Create Node' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
