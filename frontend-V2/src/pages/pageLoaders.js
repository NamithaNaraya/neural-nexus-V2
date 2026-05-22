export const pageLoaders = {
  landing: () => import('./LandingPage'),
  login: () => import('./LoginPage'),
  folders: () => import('./FoldersPage'),
  graph: () => import('./GraphPage'),
  chat: () => import('./chat/ChatPage'),
  upload: () => import('./UploadPage'),
  visualize: () => import('./visualize/VisualizeDataPage'),
  browse: () => import('./BrowsePage'),
  mlPrediction: () => import('./InsightsPage'),
  analytics: () => import('./AnalyticsPage'),
  settings: () => import('./SettingsPage'),
  help: () => import('./HelpPage'),
};

export function preloadPageForPath(pathname = '') {
  const path = String(pathname || '').toLowerCase();

  if (path === '/') return pageLoaders.landing();
  if (path.startsWith('/folders')) return pageLoaders.folders();
  if (path.startsWith('/graph')) return pageLoaders.graph();
  if (path.startsWith('/visualize')) return pageLoaders.visualize();
  if (path.startsWith('/chat')) return pageLoaders.chat();
  if (path.startsWith('/upload')) return pageLoaders.upload();
  if (path.startsWith('/browse')) return pageLoaders.browse();
  if (path.startsWith('/ml-prediction')) return pageLoaders.mlPrediction();
  if (path.startsWith('/analytics')) return pageLoaders.analytics();
  if (path.startsWith('/settings')) return pageLoaders.settings();
  if (path.startsWith('/help')) return pageLoaders.help();
  if (path.startsWith('/login')) return pageLoaders.login();

  return Promise.resolve();
}
