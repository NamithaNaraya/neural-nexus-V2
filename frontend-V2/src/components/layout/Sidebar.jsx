import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Network,
  MessageSquare,
  Upload,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Folder,
  Search,
  Palette,
  Terminal,
  Activity,
  Cpu,
  HelpCircle,
  Sparkles,
  Leaf,
  Layout,
} from 'lucide-react';
import nessoLogo from '../../assets/logo.png';

const navSections = [
  {
    label: 'Workspace',
    items: [
      { icon: Folder, label: 'Folders', path: '/folders' },
      { icon: Network, label: 'Knowledge Graph', path: '/graph' },
      { icon: Palette, label: 'Visualization', path: '/visualize' },
      { icon: MessageSquare, label: 'Chat', path: '/chat', badge: 'RAG' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: Upload, label: 'Ingest Data', path: '/upload' },
      { icon: Search, label: 'Browse Graph', path: '/browse' },
    ],
  },
  {
    label: 'Creative Lab',
    items: [
      { icon: Layout, label: 'Neural Canvas', path: '/canvas', badge: 'NEW' },
    ],
  },
  {
    label: 'Machine Learning',
    items: [
      { icon: Leaf, label: 'ML Predictions', path: '/ml-prediction' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    ],
  },
  {
    label: 'Core',
    items: [
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: HelpCircle, label: 'Help', path: '/help' },
    ],
  },
];

export function Sidebar() {
  const { expanded, toggle } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'h-screen flex flex-col border-r border-white/5 transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] relative z-[130]',
        'bg-white/10 dark:bg-black/30 backdrop-blur-[60px] shadow-[4px_0_24px_rgba(45,58,40,0.05)]',
        expanded ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Branding Header */}
      <div className={cn(
        'h-20 flex items-center border-b border-border/20 px-6 overflow-hidden transition-all duration-300',
        !expanded && 'px-0 justify-center'
      )}>
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/30 ring-4 ring-primary/10 animate-float">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          {expanded && (
            <div className="flex flex-col animate-scale-in">
              <span className="text-[14px] font-black tracking-tighter text-foreground leading-none">NESSO</span>
              <span className="text-[9px] font-black text-primary/70 tracking-[0.25em] uppercase mt-0.5">Nexus</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className="flex-1 overflow-hidden overflow-x-visible py-8 px-4 space-y-9">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-3">
            {/* Section label */}
            <div className={cn(
              'px-3 mb-2 transition-all duration-300',
              expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 h-0 overflow-hidden mb-0'
            )}>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                {section.label}
              </span>
            </div>

            {section.items.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={cn(
                    'flex items-center gap-4 px-3 py-3.5 rounded-2xl text-[13px] font-black transition-all duration-500 relative group',
                    isActive
                      ? 'bg-primary text-white shadow-[0_12px_24px_-8px_rgba(45,58,40,0.2)]'
                      : 'text-muted-foreground/40 hover:text-primary hover:bg-primary/5',
                    !expanded && 'px-0 mx-0 justify-center w-11 mx-auto'
                  )}
                >
                  <item.icon className={cn(
                    'w-5.5 h-5.5 shrink-0 transition-all duration-500',
                    isActive ? 'text-white scale-100' : 'text-muted-foreground/40 group-hover:text-primary group-hover:scale-110'
                  )} />

                  <span className={cn(
                    'transition-all duration-500 whitespace-nowrap tracking-tight',
                    expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden hidden'
                  )}>
                    {item.label}
                  </span>

                  {/* Badge */}
                  {item.badge && expanded && (
                    <span className="ml-[2px] text-[8px] font-black px-1.5 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm uppercase tracking-tighter">
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip when collapsed */}
                  {!expanded && (
                    <div className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 text-primary shadow-2xl text-[12px] font-black uppercase tracking-widest opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0 z-[200] pointer-events-none whitespace-nowrap">
                      {item.label}
                      <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-white/90 dark:bg-black/90 border-l border-b border-white/20" />
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border/20 p-5 shrink-0 bg-secondary/10">
        <div className={cn(
          'flex items-center gap-4 p-2.5 rounded-[20px] hover:bg-primary/5 transition-all duration-300 cursor-pointer group/profile',
          !expanded && 'justify-center p-1'
        )}>
          {/* Avatar */}
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-primary to-accent text-sm font-black text-white shadow-lg shrink-0 group-hover/profile:scale-110 transition-transform duration-500">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>

          <div className={cn(
            'flex-1 min-w-0 transition-all duration-300',
            expanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'
          )}>
            <p className="text-[12px] font-black truncate tracking-tight text-foreground">{user?.email || 'System Operator'}</p>
            <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">{user?.role || 'Botanist/Admin'}</p>
          </div>

          {expanded && (
            <button
              onClick={logout}
              type="button"
              aria-label="Secure exit"
              className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-all duration-300 group/exit"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 group-hover/exit:rotate-12 transition-transform" />
            </button>
          )}
        </div>
      </div>


      {/* Collapse/Expand Toggle */}
      <button
        onClick={toggle}
        type="button"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className={cn(
          'absolute -right-3 top-[68px] w-6.5 h-6.5 rounded-full border border-white/10 bg-white dark:bg-black/50 flex items-center justify-center',
          'text-primary hover:scale-110 active:scale-95 transition-all duration-500',
          'shadow-xl shadow-primary/5 z-[150] backdrop-blur-xl'
        )}
      >
        {expanded ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
