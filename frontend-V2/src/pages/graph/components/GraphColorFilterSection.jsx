import React from 'react';
import { cn } from '../../../utils/cn';
import { withAlpha } from '../colorSystem';

export function GraphColorFilterSection({
  title,
  icon: Icon,
  items,
  activeItems,
  setActiveItems,
  colorMap,
  setColorMap,
  getColor,
}) {
  const toHex = (value) => {
    const v = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    const hslMatch = v.match(/hsl\(\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%\s*\)/i);
    if (!hslMatch) return '#6b7280';
    const h = Number(hslMatch[1]);
    const s = Number(hslMatch[2]) / 100;
    const l = Number(hslMatch[3]) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (h % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0; let g = 0; let b = 0;
    if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    const to255 = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${to255(r)}${to255(g)}${to255(b)}`;
  };

  const hasNone = activeItems.has('__none__');
  const allSelected = items.length > 0 && !hasNone && (activeItems.size === 0 || activeItems.size === items.length);
  const activeCount = hasNone ? 0 : (activeItems.size === 0 ? items.length : activeItems.size);

  const toggleItem = (value) => {
    setActiveItems((current) => {
      const next = current.size === 0 ? new Set(items) : new Set(current);
      next.delete('__none__');

      if (next.has(value)) next.delete(value);
      else next.add(value);

      if (next.size === items.length) {
        return new Set();
      }
      if (next.size === 0) {
        return new Set(['__none__']);
      }
      return next;
    });
  };

  const selectAll = () => {
    setActiveItems(new Set());
  };

  const clearAll = () => {
    setActiveItems(new Set(['__none__']));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/35 bg-background/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</span>
        </div>
        <div className="inline-flex items-center overflow-hidden rounded-full border border-border/40 bg-card/75 text-[10px] font-semibold shadow-sm">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1.5 text-muted-foreground transition hover:bg-primary/8 hover:text-foreground"
          >
            Select all
          </button>
          <span className="h-4 w-px bg-border/55" />
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-muted-foreground transition hover:bg-primary/8 hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const color = getColor(item, colorMap);
          const active = !hasNone && (activeItems.size === 0 || activeItems.has(item));
          const bg = active
            ? `linear-gradient(180deg, ${withAlpha(color, 'F2')}, ${withAlpha(color, 'E6')})`
            : `linear-gradient(180deg, ${withAlpha(color, '14')}, rgba(255,255,255,0.96))`;
          const border = active ? withAlpha(color, '66') : withAlpha(color, '3F');

          return (
            <div
              key={item}
              className={cn('group flex items-center justify-between gap-2 rounded-xl border transition')}
              style={{ background: bg, borderColor: border }}
            >
              <button
                type="button"
                onClick={() => toggleItem(item)}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border shadow-sm',
                    active ? 'border-white/75 bg-white/90' : 'border-white/50'
                  )}
                  style={!active ? { backgroundColor: color } : undefined}
                />
                <span className={cn('truncate text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {item}
                </span>
              </button>

              <label
                className={cn(
                  'mr-2 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition',
                  active ? 'border-white/50 bg-white/15' : 'border-border/45 bg-card/85'
                )}
                title={`Set ${item} color`}
              >
                <span className="h-4 w-4 rounded-full border border-white/70 shadow-sm" style={{ backgroundColor: toHex(color) }} />
                <input
                  type="color"
                  value={toHex(color)}
                  onChange={(event) =>
                    setColorMap?.((current) => ({
                      ...(current || {}),
                      [item]: event.target.value,
                    }))
                  }
                  className="absolute h-0 w-0 opacity-0"
                  aria-label={`Set ${item} color`}
                />
              </label>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] font-medium text-muted-foreground">
        {allSelected ? 'All items are active.' : `${activeCount} of ${items.length} active.`}
      </p>
    </div>
  );
}
