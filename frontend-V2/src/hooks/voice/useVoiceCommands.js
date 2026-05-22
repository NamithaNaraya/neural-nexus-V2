import { useNavigate } from 'react-router-dom';
import { findCommand } from './commandRegistry';

/**
 * Custom Hook: useVoiceCommands
 * 
 * Intercepts transcribed text and executes matching commands.
 */
export function useVoiceCommands() {
  const navigate = useNavigate();

  const executeClick = (text) => {
    const normalizedText = text.toLowerCase().trim();
    
    // List of words to ignore when looking for button labels
    const stopWords = ['click', 'press', 'button', 'open', 'go to', 'neural'];
    let targetLabel = normalizedText;
    stopWords.forEach(word => {
      targetLabel = targetLabel.replace(word, '').trim();
    });

    if (!targetLabel) return false;

    // Find all clickable elements
    const clickables = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
    
    const target = clickables.find(el => {
      const textContent = (el.textContent || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      
      return textContent.includes(targetLabel) || 
             ariaLabel.includes(targetLabel) || 
             title.includes(targetLabel);
    });

    if (target) {
      const name = target.textContent?.trim() || target.getAttribute('aria-label') || target.getAttribute('title') || targetLabel;
      console.log(`🎙️ Voice Action: Clicking "${name}"`);
      target.click();
      return true;
    }
    return false;
  };

  const processText = (text) => {
    if (!text) return { matched: false };
    console.log(`🎙️ Voice Engine: Processing "${text}"`);

    const command = findCommand(text);
    
    if (command) {
      console.log(`🎙️ Voice Engine: Command Match -> "${command.label}"`);
      
      if (command.action === 'NAVIGATE') {
        console.log(`🎙️ Redirecting to path: ${command.path}`);
        navigate(command.path);
        return { matched: true, label: command.label };
      }
      
      if (command.action === 'UI_ACTION') {
        console.log(`🎙️ Triggering UI Action: ${command.command}`);
        
        if (command.command === 'TOGGLE_THEME') {
          const btn = document.getElementById('theme-toggle-btn');
          if (btn) {
            btn.click();
          } else {
            executeClick('Mode'); // Fallback
          }
        }
        
        if (command.command === 'CLEAR_CHAT') {
          // This can be handled by the component listening to this command
        }

        return { matched: true, label: command.label, command: command.command };
      }
    }

    // If no hard-coded command matches, try to find a button on the page to click
    if (text.toLowerCase().includes('click') || text.toLowerCase().includes('open') || text.toLowerCase().includes('press')) {
      console.log(`🎙️ Attempting dynamic click for: "${text}"`);
      const clicked = executeClick(text);
      if (clicked) {
        return { matched: true, label: `Executing click...` };
      }
    }

    return { matched: false };
  };

  return { processText };
}
