export const VIEW_OPTIONS = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'stream', label: 'Stream' },
  { id: 'table', label: 'Table' },
  { id: 'groups', label: 'Type Deck' },
];

export const SORT_OPTIONS = [
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'type-asc', label: 'Type A-Z' },
  { id: 'degree-desc', label: 'Highest degree' },
  { id: 'properties-desc', label: 'Most details' },
];

export const TYPE_STYLES = {
  Herb: {
    chip: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
    icon: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    glow: 'from-emerald-500/16 via-emerald-400/8 to-transparent',
  },
  PlantPart: {
    chip: 'border-teal-500/30 bg-teal-500/12 text-teal-700 dark:text-teal-300',
    icon: 'border-teal-500/25 bg-teal-500/15 text-teal-700 dark:text-teal-300',
    glow: 'from-teal-500/14 via-teal-400/7 to-transparent',
  },
  Phytochemical: {
    chip: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300',
    icon: 'border-cyan-500/25 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    glow: 'from-cyan-500/16 via-cyan-400/8 to-transparent',
  },
  TherapeuticUse: {
    chip: 'border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300',
    icon: 'border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300',
    glow: 'from-amber-500/16 via-amber-400/8 to-transparent',
  },
  default: {
    chip: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    icon: 'border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    glow: 'from-slate-500/12 via-slate-400/5 to-transparent',
  },
};

export const PAGE_SIZE = 24;
