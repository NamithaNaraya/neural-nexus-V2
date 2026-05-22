import React from 'react';
import { ArrowDownAZ, Blocks, LayoutGrid, Rows3, Search, Table2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Input, Label } from '../../../components/ui/Input';
import { cn } from '../../../utils/cn';
import { SORT_OPTIONS, VIEW_OPTIONS } from '../constants';

const viewIcons = {
  gallery: LayoutGrid,
  stream: Rows3,
  table: Table2,
  groups: Blocks,
};

function Field({ label, children }) {
  const fieldId = `browse-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Select({ id, value, onChange, className = '', children, ...props }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className={cn(
        'h-11 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm outline-none backdrop-blur-sm transition focus:border-accent/40 focus:ring-2 focus:ring-accent/20',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function BrowseFilters({
  query,
  setQuery,
  activeType,
  setActiveType,
  sortMode,
  setSortMode,
  nodeTypes,
  viewMode,
  setViewMode,
}) {
  return (
    <Card variant="branded" className="overflow-hidden border-border/60 bg-card/70 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/6 via-secondary/10 to-transparent px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Global Filters</p>
            <p className="text-xs text-muted-foreground font-medium">Coordinate exploration across all visualization modes.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Browse view modes">
            {VIEW_OPTIONS.map((view) => {
              const Icon = viewIcons[view.id];
              const active = viewMode === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setViewMode(view.id)}
                  role="tab"
                  aria-selected={active}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold tracking-wide transition-all duration-300',
                    active
                      ? 'border-accent bg-accent text-accent-foreground shadow-lg shadow-accent/25'
                      : 'border-border/60 bg-background/70 text-muted-foreground hover:border-accent/40 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <CardContent className="grid gap-6 p-6 lg:grid-cols-3">
        <div>
          <Field label="Semantic Search">
            <div className="relative group">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
              <Input
                id="browse-field-semantic-search"
                aria-label="Search graph entities"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find entities by any property..."
                className="h-11 rounded-xl border-border/60 bg-background/50 pl-11 focus:bg-background transition-colors"
              />
            </div>
          </Field>
        </div>

        <Field label="Filter by Type">
          <Select id="browse-field-filter-by-type" aria-label="Filter by entity type" value={activeType} onChange={(event) => setActiveType(event.target.value)}>
            <option value="all">All Graph Entities</option>
            {nodeTypes.map((item) => (
              <option key={item.type} value={item.type}>
                {item.type} ({item.count})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Logical Sort">
          <div className="relative group">
            <ArrowDownAZ className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Select id="browse-field-logical-sort" aria-label="Sort browse results" value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="pl-11">
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}
