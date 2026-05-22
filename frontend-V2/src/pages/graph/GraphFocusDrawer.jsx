import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitBranch, Link2, Plus, RefreshCw, Save, Sparkles, Target, Trash2, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input, Label } from '../../components/ui/Input';
import { graphService } from '../../services/graphService';
import { GraphFocusConnections } from './GraphFocusConnections';

function resolveValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) {
    if (value.length > 5 && typeof value[0] === 'number') return `[Vector ${value.length}]`;
    return value.map(v => resolveValue(v)).join(', ');
  }
  if (typeof value === 'object') {
    return value.name || value.label || value.id || value.type || JSON.stringify(value);
  }
  return String(value);
}

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

function parseProperties(text) {
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    const result = {};
    text.split('\n').forEach((line) => {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) return;
      result[key.trim()] = rest.join(':').trim();
    });
    return result;
  }
}

function formatEntries(entries, limit = 12) {
  const filtered = filterInternalProperties(entries);
  return Object.entries(filtered)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, limit);
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{resolveValue(value)}</div>
    </div>
  );
}

function EditableTextarea({ label, value, onChange, rows = 4, placeholder }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="flex w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </div>
  );
}

export function GraphFocusDrawer({
  open,
  folderId,
  focusLabel,
  focusType,
  focusLoading,
  activeNode,
  activeRelationship,
  links = [],
  onClose,
  onEdit,
  onSelectNode,
  onSelectLink,
  relationshipTypeOptions = [],
  expandDepth = 1,
  setExpandDepth,
  expandRelationshipTypes = [],
  setExpandRelationshipTypes,
  onExpandNode,
  expandLoading = false,
  onSuccess,
  onAddRelated,
}) {
  const [nodeForm, setNodeForm] = useState({
    name: '',
    type: '',
    description: '',
    notes: '',
    color: '',
    size: '',
    propertiesText: '{}',
  });
  const [relationshipForm, setRelationshipForm] = useState({
    type: '',
    strength: '',
    propertiesText: '{}',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeNode) return;
    const displayProperties = filterInternalProperties(activeNode.properties);
    setNodeForm({
      name: activeNode.name || '',
      type: activeNode.type || '',
      description: activeNode.description || '',
      notes: activeNode.properties?.notes || activeNode.properties?.user_notes || '',
      color: activeNode.color || '',
      size: activeNode.size ?? '',
      propertiesText: JSON.stringify(displayProperties, null, 2),
    });
    setError('');
  }, [activeNode]);

  useEffect(() => {
    if (!activeRelationship) return;
    const displayProperties = filterInternalProperties(activeRelationship.properties);
    setRelationshipForm({
      type: activeRelationship.type || '',
      strength: activeRelationship.strength ?? '',
      propertiesText: JSON.stringify(displayProperties, null, 2),
    });
    setError('');
  }, [activeRelationship]);

  const relationSummary = activeRelationship
    ? `${resolveValue(activeRelationship.source)} -> ${resolveValue(activeRelationship.target)}`
    : '';

  const neighboringNodes = useMemo(() => {
    if (!activeNode?.id) return [];

    const seen = new Set();
    return links.reduce((collection, link) => {
      const source = typeof link.source === 'object' ? link.source : { id: link.source, name: link.source };
      const target = typeof link.target === 'object' ? link.target : { id: link.target, name: link.target };
      const currentId = String(activeNode.id);
      let neighbor = null;
      let direction = '';

      if (String(source.id) === currentId) {
        neighbor = target;
        direction = 'Outgoing';
      } else if (String(target.id) === currentId) {
        neighbor = source;
        direction = 'Incoming';
      }

      if (!neighbor?.id || seen.has(String(neighbor.id))) return collection;
      seen.add(String(neighbor.id));
      collection.push({
        id: neighbor.id,
        name: neighbor.name || neighbor.label || neighbor.id,
        type: neighbor.type || 'Unknown',
        direction,
      });
      return collection;
    }, []);
  }, [activeNode, links]);

  const handleSaveNode = async () => {
    const isNew = activeNode?.isPhantom;
    if (!isNew && !activeNode?.id) return;
    setSaving(true);
    setError('');
    try {
      const properties = parseProperties(nodeForm.propertiesText);
      const noteValue = nodeForm.notes.trim();
      if (noteValue) {
        properties.notes = noteValue;
      } else {
        delete properties.notes;
        delete properties.user_notes;
      }

      const payload = {
        name: nodeForm.name.trim(),
        type: nodeForm.type.trim() || 'Node',
        description: nodeForm.description.trim(),
        color: nodeForm.color.trim() || undefined,
        size: nodeForm.size === '' ? undefined : Number(nodeForm.size),
        properties,
        folder_id: folderId || undefined,
      };

      if (isNew) {
        // Add coordinates if phantom
        if (activeNode.x !== undefined) payload.x = activeNode.x;
        if (activeNode.y !== undefined) payload.y = activeNode.y;
        await graphService.createNode(payload);
      } else {
        await graphService.updateNode(activeNode.id, payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not save node.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRelationship = async () => {
    const isNew = activeRelationship?.isPhantom;
    if (!isNew && !activeRelationship?.id) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: relationshipForm.type.trim() || 'RELATIONSHIP',
        strength: relationshipForm.strength === '' ? undefined : Number(relationshipForm.strength),
        properties: parseProperties(relationshipForm.propertiesText),
        folder_id: folderId || undefined,
      };

      if (isNew) {
        payload.source_node_id = activeRelationship.source;
        payload.target_node_id = activeRelationship.target;
        await graphService.createRelationship(payload);
      } else {
        await graphService.updateRelationship(activeRelationship.id, payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not save relationship.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelationship = async () => {
    if (!activeRelationship?.id) return;
    setSaving(true);
    setError('');
    try {
      await graphService.deleteRelationship(activeRelationship.id, folderId);
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not delete relationship.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside
      className={[
        'absolute bottom-5 right-5 top-5 z-20 w-[360px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/96 shadow-[0_26px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-300 ease-out',
        open ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+24px)] opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/50 px-5 py-5 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-sm">
                <Target className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-900">Entity Intelligence</span>
            </div>
            <p className="mt-1.5 max-w-[240px] text-[11px] leading-relaxed text-slate-500 font-medium">
              Inspect semantic nodes, navigate relationships, and enrich your knowledge graph.
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-200/60 hover:bg-slate-50 hover:scale-105 transition-all" 
            type="button" 
            onClick={onClose} 
            aria-label="Close inspector"
          >
            <X className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!focusLabel ? (
            <Card className="border-dashed border-border/50 bg-background/40">
              <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Start exploring
                </div>
                <p>Click a node to inspect its neighbors and paths, or click a relationship to focus that directed link.</p>
              </CardContent>
            </Card>
          ) : null}

          {focusLoading ? (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
                Loading nearby graph details...
              </CardContent>
            </Card>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {activeNode ? (
            <Card className="border-border/50 bg-card/70 shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{activeNode.isPhantom ? 'Create Node' : 'Node Details'}</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{activeNode.id?.substring(0, 8) || 'Draft'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onAddRelated && !activeNode.isPhantom && (
                      <Button 
                        variant="gradient" 
                        size="sm" 
                        className="h-8 gap-1.5 rounded-full bg-accent text-white text-[11px] font-bold px-3 shadow-md hover:shadow-accent/20 transition-all" 
                        onClick={onAddRelated}
                      >
                        <Plus className="h-3 w-3" />
                        Build Relationship
                      </Button>
                    )}
                    {activeNode.isPhantom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-slate-100"
                        onClick={onClose}
                        title="Cancel creation"
                        type="button"
                      >
                        <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity Name</Label>
                    <Input 
                      value={nodeForm.name} 
                      className="h-10 border-slate-200/60 bg-slate-50/30 font-semibold focus:bg-white transition-colors"
                      onChange={(event) => setNodeForm((prev) => ({ ...prev, name: event.target.value }))} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class/Type</Label>
                      <Input 
                        value={nodeForm.type} 
                        className="h-9 border-slate-200/60 bg-slate-50/30 text-xs focus:bg-white transition-colors"
                        onChange={(event) => setNodeForm((prev) => ({ ...prev, type: event.target.value }))} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Connectivity</Label>
                      <div className="flex h-9 items-center rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-xs font-bold text-slate-600">
                        {activeNode.degree ?? 0} Neighbors
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl bg-slate-50/50 p-4 border border-slate-100/50">
                  <EditableTextarea
                    label="Description"
                    value={nodeForm.description}
                    onChange={(value) => setNodeForm((prev) => ({ ...prev, description: value }))}
                    rows={2}
                    placeholder="Describe this entity..."
                  />

                  <EditableTextarea
                    label="Analyst Notes"
                    value={nodeForm.notes}
                    onChange={(value) => setNodeForm((prev) => ({ ...prev, notes: value }))}
                    rows={3}
                    placeholder="Add findings or context..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Extended Properties</Label>
                    <span className="text-[10px] font-medium text-slate-300 italic">Technical fields hidden</span>
                  </div>
                  <textarea
                    value={nodeForm.propertiesText}
                    onChange={(event) => setNodeForm((prev) => ({ ...prev, propertiesText: event.target.value }))}
                    rows={4}
                    placeholder='{"key": "value"}'
                    className="flex w-full rounded-xl border border-slate-200/60 bg-slate-50/30 p-3 font-mono text-[11px] leading-relaxed text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                   <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">System Ready</span>
                   </div>
                  <div className="flex items-center gap-2">
                    {activeNode.isPhantom && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-full px-4 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
                        onClick={onClose}
                        type="button"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      variant="gradient" 
                      size="sm" 
                      className="h-9 gap-2 rounded-full px-5 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg" 
                      onClick={handleSaveNode} 
                      disabled={saving} 
                      type="button"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {activeNode.isPhantom ? 'Publish Node' : 'Update Node'}
                    </Button>
                  </div>
                </div>

                {neighboringNodes.length > 0 ? (
                  <div className="mt-4 space-y-3 rounded-[24px] border border-slate-200/60 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                        <Link2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semantic Neighbors</div>
                        <p className="text-[10px] text-slate-400">Directly connected knowledge nodes.</p>
                      </div>
                    </div>
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {neighboringNodes.map((neighbor) => (
                        <button
                          key={neighbor.id}
                          type="button"
                          onClick={() => onSelectNode?.(neighbor)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/40 bg-white px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{neighbor.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{neighbor.direction} • {neighbor.type}</div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Expansion controls</div>
                      <p className="mt-1 text-xs text-muted-foreground">Reload this node with deeper hops or narrower relationship types.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Depth</Label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3].map((depth) => (
                        <Button
                          key={depth}
                          variant={expandDepth === depth ? 'outline' : 'ghost'}
                          size="sm"
                          className="rounded-full"
                          onClick={() => setExpandDepth?.(depth)}
                        >
                          {depth} hop{depth === 1 ? '' : 's'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {relationshipTypeOptions.length ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Relationship types</Label>
                      <div className="flex flex-wrap gap-2">
                        {relationshipTypeOptions.slice(0, 12).map((type) => {
                          const active = expandRelationshipTypes.includes(type);
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                if (!setExpandRelationshipTypes) return;
                                setExpandRelationshipTypes((current) => (
                                  current.includes(type)
                                    ? current.filter((item) => item !== type)
                                    : [...current, type]
                                ));
                              }}
                              className={[
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                                active
                                  ? 'border-primary/40 bg-primary/10 text-primary'
                                  : 'border-border/40 bg-background/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                              ].join(' ')}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full"
                      onClick={onExpandNode}
                      disabled={expandLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${expandLoading ? 'animate-spin' : ''}`} />
                      Refresh neighborhood
                    </Button>
                  </div>
                </div>

                {/* Redundant properties list removed in favor of integrated editable area */}
              </CardContent>
            </Card>
          ) : null}

          {activeRelationship ? (
            <Card className="border-border/50 bg-card/70 shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{activeRelationship.isPhantom ? 'Build Relationship' : 'Relationship Details'}</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{activeRelationship.id?.substring(0, 8) || 'Draft'}</p>
                    </div>
                  </div>
                  {activeRelationship.isPhantom && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:bg-slate-100"
                      onClick={onClose}
                      title="Cancel building relationship"
                      type="button"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source Node</Label>
                      <div className="truncate flex h-9 items-center rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-[11px] font-semibold text-slate-500">
                        {resolveValue(activeRelationship.source)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Node</Label>
                      <div className="truncate flex h-9 items-center rounded-lg border border-slate-100 bg-slate-50/50 px-3 text-[11px] font-semibold text-slate-500">
                        {resolveValue(activeRelationship.target)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Relationship Type</Label>
                      <Input
                        value={relationshipForm.type}
                        className="h-9 border-slate-200/60 bg-slate-50/30 text-xs font-bold focus:bg-white transition-colors"
                        onChange={(event) => setRelationshipForm((prev) => ({ ...prev, type: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weight/Strength</Label>
                      <Input
                        value={relationshipForm.strength}
                        className="h-9 border-slate-200/60 bg-slate-50/30 text-xs focus:bg-white transition-colors"
                        onChange={(event) => setRelationshipForm((prev) => ({ ...prev, strength: event.target.value }))}
                        placeholder="1.0"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Relationship Properties</Label>
                    <span className="text-[10px] font-medium text-slate-300 italic">Metadata filtered</span>
                  </div>
                  <textarea
                    value={relationshipForm.propertiesText}
                    onChange={(value) => setRelationshipForm((prev) => ({ ...prev, propertiesText: value }))}
                    rows={5}
                    placeholder='{"key": "value"}'
                    className="flex w-full rounded-xl border border-slate-200/60 bg-slate-50/30 p-3 font-mono text-[11px] leading-relaxed text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div>
                    {!activeRelationship.isPhantom && activeRelationship.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 rounded-full border border-red-100 text-red-500 hover:bg-red-50"
                        onClick={handleDeleteRelationship}
                        disabled={saving}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeRelationship.isPhantom && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 rounded-full px-4 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
                        onClick={onClose}
                        type="button"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      variant="gradient" 
                      size="sm" 
                      className="h-9 gap-2 rounded-full px-5 bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg" 
                      onClick={handleSaveRelationship} 
                      disabled={saving} 
                      type="button"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {activeRelationship.isPhantom ? 'Build Relationship' : 'Update Relationship'}
                    </Button>
                  </div>
                </div>

                {/* Redundant properties list removed */}
              </CardContent>
            </Card>
          ) : null}

          {focusType === 'node' && links.length > 0 ? (
            <GraphFocusConnections activeNode={activeNode} links={links} onSelectLink={onSelectLink} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}
