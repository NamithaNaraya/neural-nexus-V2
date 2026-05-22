/**
 * Voice Command Registry
 * 
 * Define your custom voice commands here.
 * Format: { keywords: ['word1', 'word2'], action: 'ACTION_NAME', path: '/route' }
 */

export const VOICE_COMMANDS = [
  {
    keywords: ['chat', 'message', 'ask', 'talk', 'conversation'],
    action: 'NAVIGATE',
    path: '/chat',
    label: 'Opening Chat'
  },
  {
    keywords: ['upload', 'import', 'add data', 'add files'],
    action: 'NAVIGATE',
    path: '/upload',
    label: 'Opening Upload'
  },
  {
    keywords: ['settings', 'configuration', 'options', 'setup'],
    action: 'NAVIGATE',
    path: '/settings',
    label: 'Opening Settings'
  },
  {
    keywords: ['graph', 'visualization', 'map', 'nodes'],
    action: 'NAVIGATE',
    path: '/graph',
    label: 'Opening Knowledge Graph'
  },
  {
    keywords: ['analytics', 'statistics', 'charts', 'workbench'],
    action: 'NAVIGATE',
    path: '/analytics',
    label: 'Opening Analytics'
  },
  {
    keywords: ['folders', 'files', 'library', 'vault'],
    action: 'NAVIGATE',
    path: '/folders',
    label: 'Opening Folders'
  },
  {
    keywords: ['home', 'dashboard', 'landing', 'start'],
    action: 'NAVIGATE',
    path: '/landing',
    label: 'Going Home'
  },
  {
    keywords: ['insights', 'discovery', 'patterns'],
    action: 'NAVIGATE',
    path: '/insights',
    label: 'Opening Insights'
  },
  {
    keywords: ['browse', 'explore', 'navigator', 'search results'],
    action: 'NAVIGATE',
    path: '/browse',
    label: 'Opening Browse'
  },
  {
    keywords: ['help', 'support', 'guide', 'documentation', 'tutorial'],
    action: 'NAVIGATE',
    path: '/help',
    label: 'Opening Help'
  },
  {
    keywords: ['visualize', 'data view', 'presentation'],
    action: 'NAVIGATE',
    path: '/visualize',
    label: 'Opening Visualization'
  },
  {
    keywords: ['dark mode', 'night mode', 'darken', 'black theme', 'dark', 'black', 'dark moral'],
    action: 'UI_ACTION',
    command: 'TOGGLE_THEME',
    label: 'Switching to Dark Mode'
  },
  {
    keywords: ['light mode', 'day mode', 'brighten', 'white theme', 'white', 'light', 'white moral', 'light moral'],
    action: 'UI_ACTION',
    command: 'TOGGLE_THEME',
    label: 'Switching to Light Mode'
  },
  {
    keywords: ['predict', 'machine learning', 'ml', 'intelligence'],
    action: 'NAVIGATE',
    path: '/ml-prediction',
    label: 'Opening ML Predictions'
  },
  {
    keywords: ['canvas', 'draw', 'sketch', 'sketchpad', 'whiteboard'],
    action: 'NAVIGATE',
    path: '/canvas',
    label: 'Opening Neural Canvas'
  },
  {
    keywords: ['clear', 'reset', 'wipe', 'empty'],
    action: 'UI_ACTION',
    command: 'CLEAR_CHAT',
    label: 'Clearing Chat'
  }
];

export const findCommand = (text) => {
  const normalizedText = text.toLowerCase().trim();
  
  // Wake words and their common misspellings
  const wakeWords = ['neural', 'nuural', 'nural', 'nero', 'neuron'];
  const prefixes = ['open', 'go to', 'show', 'take me to', 'click', 'press', 'switch to'];

  const hasWakeWord = wakeWords.some(w => normalizedText.includes(w));
  const hasPrefix = prefixes.some(p => normalizedText.startsWith(p));
  
  const isDirectCommand = hasWakeWord || hasPrefix;

  for (const cmd of VOICE_COMMANDS) {
    if (cmd.keywords.some(keyword => {
      // Matches if the keyword is present and we suspect it's a command intent
      if (normalizedText.includes(keyword)) {
        if (isDirectCommand) return true;
        
        // Also match if the text is ONLY the keyword (e.g., user just said "Settings")
        if (normalizedText === keyword) return true;
      }
      return false;
    })) {
      return cmd;
    }
  }
  
  return null;
};
