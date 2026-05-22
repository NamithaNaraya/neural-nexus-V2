import React from 'react';
import { NavLink } from 'react-router-dom';

export function GraphViewsNavigation({ sections, basePath = '/graph', toolsButton = null }) {
  return (
    <div className="space-y-2">
      {sections.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <div className="pl-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{group.label}</div>
          <div className="flex flex-wrap items-center gap-2">
            {toolsButton}
            {group.items.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={`${basePath}/${path}`}
                className={({ isActive }) =>
                  `inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition ${isActive ? 'border-primary/25 bg-primary/16 text-foreground shadow-sm shadow-primary/10' : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20'}`
                }
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
