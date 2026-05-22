/**
 * Export chat messages to a machine-readable JSON file (.json).
 * Includes full session metadata for portability.
 */
import { toast } from 'react-hot-toast';
import { triggerHrefDownload } from './triggerFileDownload';

export const exportToJson = ({ messages, folderName, sessionId, activeSessionTitle }) => {
  if (!messages || messages.length === 0) {
    toast.error('No messages to export');
    return false;
  }

  const exportData = {
    metadata: {
      application: 'Neural Nexus',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      folder: folderName || 'Global',
      sessionId: sessionId || 'unknown',
      sessionTitle: activeSessionTitle || 'New Chat',
      messageCount: messages.length
    },
    conversation: messages.map((m) => ({
      role: m.role,
      content: m.content || '',
      timestamp: m.timestamp || null,
      webSearch: m.isWebSearch ? {
        query: m.webSearchQuery || '',
        answer: m.webSearchAnswer || '',
        sources: m.webSearchSources || []
      } : null,
      graphCitations: (m.results || m.sources || []).map(src => ({
        name: src.node_name || src.name || '',
        type: src.node_type || src.type || ''
      }))
    })),
  };

  try {
    const json = JSON.stringify(exportData, null, 2);
    const safeFolder = folderName ? `_${folderName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const href = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
    triggerHrefDownload(href, `neural-nexus-chat${safeFolder}_${timestamp}.json`);
    toast.success('Chat exported as JSON data');
    return true;
  } catch (err) {
    console.error('JSON export error:', err);
    toast.error('Failed to export JSON file');
    return false;
  }
};
