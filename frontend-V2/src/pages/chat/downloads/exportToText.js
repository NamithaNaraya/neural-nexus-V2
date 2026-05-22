/**
 * Export chat messages to a neatly formatted plain text file (.txt).
 * Designed for readability and a premium "research log" feel.
 */
import { toast } from 'react-hot-toast';
import { triggerHrefDownload } from './triggerFileDownload';

export const exportToText = ({ messages, folderName, chatMode = 'research' }) => {
  if (!messages || messages.length === 0) {
    toast.error('No messages to export');
    return false;
  }

  const dateStr = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let output = '';
  const separator = '═'.repeat(70);
  const subSeparator = '─'.repeat(40);
  const dotLine = '· '.repeat(35);

  output += `${separator}\n`;
  output += `  NEURAL NEXUS - RESEARCH LOG\n`;
  output += `  Generated: ${dateStr}\n`;
  output += `  Context: ${folderName || 'Global Search'}\n`;
  output += `${separator}\n\n`;

  messages.forEach((msg, index) => {
    // Skip welcome message if it's the solo message
    if (msg.isWelcome && index === 0 && messages.length > 1) return;

    const isUser = msg.role === 'user';
    const roleLabel = isUser ? 'USER QUESTION' : 'ASSISTANT RESPONSE';
    const ts = msg.timestamp 
      ? new Date(msg.timestamp).toLocaleTimeString() 
      : '(Time unavailable)';

    output += `● ${roleLabel} [ ${ts} ]\n`;
    output += `${subSeparator}\n\n`;
    
    // Clean markdown bold/headers for text file
    const content = (msg.content || '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '');
      
    output += `${content}\n\n`;

    // WEB INSIGHTS section
    if (msg.webSearchAnswer) {
      output += `  ┌ SEARCH INSIGHT\n`;
      output += `  │ ${msg.webSearchAnswer.split('\n').join('\n  │ ')}\n`;
      if (msg.webSearchSources && msg.webSearchSources.length > 0) {
        output += `  │\n`;
        output += `  │ Sources:\n`;
        msg.webSearchSources.forEach((src, idx) => {
          output += `  │ [${idx + 1}] ${src.title || src.hostname || 'Web Source'}\n`;
        });
      }
      output += `  └────────────────\n\n`;
    }

    // INTERNAL CITATIONS section
    if (msg.results && msg.results.length > 0) {
      output += `  [ KNOWLEDGE NODES ]\n`;
      msg.results.forEach((res, i) => {
        output += `  • ${res.node_name || res.name || 'Unknown Entity'}\n`;
      });
      output += `\n`;
    }

    output += `${dotLine}\n\n`;
  });

  output += `${separator}\n`;
  output += `  END OF SESSION LOG\n`;
  output += `${separator}\n`;

  try {
    const safeFolder = folderName ? `_${folderName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const href = `data:text/plain;charset=utf-8,${encodeURIComponent(output)}`;
    triggerHrefDownload(href, `neural-nexus-chat${safeFolder}_${timestamp}.txt`);
    toast.success('Chat exported as plain text');
    return true;
  } catch (err) {
    console.error('Text export error:', err);
    toast.error('Failed to export text file');
    return false;
  }
};
