import { toast } from 'react-hot-toast';
import { triggerHrefDownload } from './triggerFileDownload';

/**
 * Export chat messages to a professional PDF report.
 * Uses a fixed-width, grid-aligned layout for a "Premium" feel.
 */
function _parseHslTriplet(value) {
  const raw = String(value || '').trim();
  // Tailwind-style CSS var format: "96 25% 33%"
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(String(parts[1]).replace('%', ''));
  const l = Number(String(parts[2]).replace('%', ''));
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  return { h, s: s / 100, l: l / 100 };
}

function _hslToRgb({ h, s, l }) {
  // h in degrees, s/l in [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return [r, g, b];
}

function _getThemeRgbVars() {
  try {
    const style = getComputedStyle(document.documentElement);
    const primary = _parseHslTriplet(style.getPropertyValue('--primary'));
    const foreground = _parseHslTriplet(style.getPropertyValue('--foreground'));
    const mutedForeground = _parseHslTriplet(style.getPropertyValue('--muted-foreground'));
    const background = _parseHslTriplet(style.getPropertyValue('--background'));
    const border = _parseHslTriplet(style.getPropertyValue('--border'));

    return {
      primary: primary ? _hslToRgb(primary) : [46, 125, 75],
      text: foreground ? _hslToRgb(foreground) : [30, 41, 59],
      muted: mutedForeground ? _hslToRgb(mutedForeground) : [100, 116, 139],
      bg: background ? _hslToRgb(background) : [248, 250, 252],
      line: border ? _hslToRgb(border) : [226, 232, 240],
    };
  } catch {
    return {
      primary: [46, 125, 75],
      text: [30, 41, 59],
      muted: [100, 116, 139],
      bg: [248, 250, 252],
      line: [226, 232, 240],
    };
  }
}

export const exportToPdf = async ({ messages, folderName, sessionTitle }) => {
  if (!messages || messages.length === 0) {
    toast.error('No messages to export');
    return false;
  }

  try {
    const jspdfMod = await import('jspdf');
    const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
    if (!jsPDF) {
      toast.error('PDF export is unavailable right now');
      return false;
    }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Define colors
    const colors = _getThemeRgbVars();

    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Helper: Add page break if needed
    const ensureSpace = (needed) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // ── Document Header ──
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('NEURAL NEXUS', margin, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('RESEARCH SESSION REPORT', margin, 22);
    
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr}`, pageWidth - margin - 40, 22);
    
    if (folderName || sessionTitle) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${folderName || 'Global Search'} • ${sessionTitle || 'Active Chat'}`, margin, 29);
    }
    
    y = 45;

    messages.forEach((msg, index) => {
      if (msg.isWelcome && index === 0 && messages.length > 1) return;

      const isUser = msg.role === 'user';
      const roleName = isUser ? 'USER QUERY' : 'NEURAL NEXUS RESPONSE';
      const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      ensureSpace(20);

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isUser ? colors.muted[0] : colors.primary[0], isUser ? colors.muted[1] : colors.primary[1], isUser ? colors.muted[2] : colors.primary[2]);
      doc.text(`${roleName} ${ts ? ' • ' + ts : ''}`, margin, y);
      y += 6;

      // Message Content
      const cleanText = (msg.content || '')
        .replace(/\*\*/g, '')
        .replace(/#{1,6}\s+/g, '')
        .trim();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...colors.text);
      
      const lines = doc.splitTextToSize(cleanText, contentWidth - 4);
      const lineHeight = 5;
      const blockHeight = (lines.length * lineHeight) + 4;

      ensureSpace(blockHeight + 10);

      // Bubble Background (Subtle)
      doc.setFillColor(isUser ? 245 : 240, isUser ? 247 : 253, isUser ? 250 : 244);
      doc.roundedRect(margin - 2, y - 4, contentWidth + 4, blockHeight, 2, 2, 'F');

      lines.forEach((line) => {
        if (ensureSpace(lineHeight)) {
          y += 4; // recovery margin after page break
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      y += 4;

      // Web Insights
      if (msg.webSearchAnswer) {
        ensureSpace(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...colors.primary);
        doc.text('WEB INSIGHT:', margin + 4, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const webLines = doc.splitTextToSize(msg.webSearchAnswer, contentWidth - 12);
        webLines.forEach(line => {
          if (ensureSpace(4)) y += 2;
          doc.text(line, margin + 6, y);
          y += 4.5;
        });
        y += 2;
      }

      // Graph Citations
      const citations = msg.results || msg.sources || [];
      if (citations.length > 0) {
        ensureSpace(12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...colors.muted);
        doc.text('KNOWLEDGE NODES:', margin + 4, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        
        // Two-column layout for citations to save space and look neat
        let col = 0;
        citations.forEach((res) => {
          const name = res.node_name || res.name || 'Unknown Node';
          const xPos = margin + 6 + (col * (contentWidth / 2));
          doc.text(`• ${name}`, xPos, y);
          
          if (col === 1) {
            y += 4;
            col = 0;
            ensureSpace(5);
          } else {
            col = 1;
          }
        });
        if (col === 1) y += 4;
        y += 2;
      }

      y += 8; // Spacer between interactions
      doc.setDrawColor(...colors.line);
      doc.line(margin, y - 4, pageWidth - margin, y - 4);
    });

    // Final Footer
    ensureSpace(20);
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text('Generated by Neural Nexus V1 • Confidential Research Tool', margin, y + 10);
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margin - 15, y + 10);

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const filename = `NN_Export_${now.toISOString().slice(0, 10).replace(/-/g, '')}_${hours}${minutes}.pdf`;
    const pdfHref = doc.output('datauristring');
    triggerHrefDownload(pdfHref, filename);
    toast.success('Professional PDF report generated');
    return true;

  } catch (err) {
    console.error('PDF export failed:', err);
    toast.error('Failed to generate PDF');
    return false;
  }
};
