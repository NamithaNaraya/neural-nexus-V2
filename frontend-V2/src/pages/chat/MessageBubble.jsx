import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Bot, Globe, ExternalLink, Loader2, User, Sprout, Leaf, Sparkles, BrainCircuit, Database, AlertTriangle, ChevronDown, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { getAlgorithmDetails } from './chatAlgorithmDetails';
import { AlgorithmInsight } from './components/AlgorithmInsight';

const MD_INLINE_REGEX = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*\n]+)\*)/g;

const splitTableRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const looksLikeTableRow = (line) => /\|/.test(line);

const isTableDivider = (line) => {
  const trimmed = line.trim();
  if (trimmed.length < 3 || !trimmed.includes('-')) return false;
  // A table divider must only contain | , : and - characters, and must have at least one --- sequence
  return /^[:|\-\s]+$/.test(trimmed) && trimmed.split('|').some(part => part.includes('-'));
};

const isInternalPatternLabel = (line) =>
  /^\s*(?:\*\*)?\s*pattern\s+[a-z0-9]+(?:\s*[:\-])?/i.test(String(line || '').trim());

const stripInlineAnalyticsScores = (text) =>
  String(text || '')
    .replace(/\s*\(score:\s*-?\d+(?:\.\d+)?\)/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+,/g, ',')
    .trim();

const sanitizeAssistantAnswer = (text) => {
  let safeText = String(text || '').replace(/\r\n/g, '\n');
  // Strip technical node IDs / folder-prefixed labels
  // e.g. "TherapeuticUse_F_a92d748e_d903_4b29_ac91_fb0e0e59ba72" → "TherapeuticUse"
  safeText = safeText.replace(/(\w+?)_F_[0-9a-f]{8}(?:_[0-9a-f]{4,12}){1,5}/gi, '$1');
  // Strip standalone UUIDs and hex IDs
  safeText = safeText.replace(/\b[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}\b/gi, '');
  // Strip F_xxxxx folder labels
  safeText = safeText.replace(/\bF_[0-9a-f_]{20,}\b/gi, '');
  // Strip trailing _F from labels like "TherapeuticUse_F" → "TherapeuticUse"
  safeText = safeText.replace(/(\w+?)_F\b/g, '$1');
  // Strip robotic persona/disclaimers (robust regex)
  safeText = safeText.replace(/\(?Remember that I.*?Neural Nexus.*?assistant.*?\)?/gi, '');
  safeText = safeText.replace(/\(?I have analyzed only the current conversation history.*?\)?/gi, '');
  safeText = safeText.replace(/\bNeural Nexus\b/gi, '');

  // Clean up leftover artifacts (double spaces, empty bold markers, orphaned commas)
  safeText = safeText.replace(/\*\*\s*\*\*/g, '').replace(/  +/g, ' ').replace(/, ,/g, ',');
  const lines = safeText.split('\n');
  const cleanedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index];
    const trimmedLine = currentLine.trim();
    const nextLine = lines[index + 1]?.trim() || '';

    // Skip "source/search" tables (metadata tables the user doesn't need)
    if (looksLikeTableRow(trimmedLine) && isTableDivider(nextLine) && /\b(source|search)\b/i.test(trimmedLine)) {
      index += 1;
      while (index + 1 < lines.length && looksLikeTableRow(lines[index + 1].trim())) {
        index += 1;
      }
      continue;
    }

    // Skip lines referencing search methods
    if (/\b(semantic search|structural search)\b/i.test(trimmedLine)) continue;
    if (isInternalPatternLabel(trimmedLine)) continue;

    cleanedLines.push(currentLine);
  }

  // Reassemble: preserve table blocks as-is, normalize plain text paragraphs
  const result = [];
  let i = 0;
  while (i < cleanedLines.length) {
    const trimmed = cleanedLines[i].trim();

    // Detect table block: a row with | followed by a divider row
    if (looksLikeTableRow(trimmed) && i + 1 < cleanedLines.length && isTableDivider(cleanedLines[i + 1].trim())) {
      // Collect entire table block (header + divider + data rows)
      while (i < cleanedLines.length && (looksLikeTableRow(cleanedLines[i].trim()) || isTableDivider(cleanedLines[i].trim()))) {
        result.push(cleanedLines[i].trim());
        i++;
      }
      continue;
    }

    // Detect orphan table rows (data without explicit divider — still a table)
    if (looksLikeTableRow(trimmed) && trimmed.split('|').length >= 3) {
      result.push(trimmed);
      i++;
      continue;
    }

    // Empty line → preserve as paragraph break
    if (!trimmed) {
      result.push('');
      i++;
      continue;
    }

    // Regular text paragraph — collect contiguous non-table, non-empty lines
    const paragraphLines = [];
    while (i < cleanedLines.length) {
      const line = cleanedLines[i].trim();
      if (!line || looksLikeTableRow(line) || isTableDivider(line) || /^```/.test(line) || /^#{1,6}\s/.test(line) || /^[-*+]\s/.test(line) || /^\d+\.\s/.test(line) || /^>\s/.test(line)) break;
      paragraphLines.push(line);
      i++;
    }
    if (paragraphLines.length > 0) {
      result.push(paragraphLines.join(' '));
    } else if (i < cleanedLines.length) {
      // Fallback for lines that match no pattern (e.g. malformed table rows)
      result.push(cleanedLines[i].trim());
      i++;
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const renderInlineMarkdown = (text, keyPrefix = 'inline') => {
  const pieces = [];
  let lastIndex = 0;
  let match;

  const safeText = String(text ?? '');
  MD_INLINE_REGEX.lastIndex = 0;
  while ((match = MD_INLINE_REGEX.exec(safeText)) !== null) {
    if (match.index > lastIndex) {
      pieces.push(safeText.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      pieces.push(
        <a
          key={`${keyPrefix}-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-black hover:underline text-primary/90 transition-all hover:text-primary decoration-primary/30"
        >
          {match[2]}
          <ExternalLink className="ml-1 inline-block h-3 w-3 opacity-60" />
        </a>
      );
    } else if (match[5]) {
      pieces.push(
        <strong key={`${keyPrefix}-${match.index}`} className="font-black text-foreground">
          {match[5]}
        </strong>
      );
    } else if (match[7]) {
      pieces.push(
        <code
          key={`${keyPrefix}-${match.index}`}
          className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[0.88em] text-primary"
        >
          {match[7]}
        </code>
      );
    } else if (match[9]) {
      pieces.push(
        <em key={`${keyPrefix}-${match.index}`} className="italic text-foreground/80">
          {match[9]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < safeText.length) {
    pieces.push(safeText.slice(lastIndex));
  }

  return pieces.length ? pieces : safeText;
};

const renderMarkdownContent = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines = [];
      const language = trimmed.slice(3).trim();
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={`code-${index}`} className="my-6 overflow-x-auto rounded-[24px] border border-border/30 bg-secondary/20 p-6 text-[13px] font-medium text-foreground/90 backdrop-blur-md shadow-inner">
          {language && (
            <div className="mb-4 flex items-center justify-between border-b border-border/20 pb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/60">{language}</span>
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-primary/20" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/20" />
              </div>
            </div>
          )}
          <code className="block whitespace-pre font-mono leading-[1.8]">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${Math.min(level, 6)}`;
      blocks.push(
        <Tag
          key={`heading-${index}`}
          className={cn(
            'mt-8 mb-4 font-black tracking-tighter uppercase',
            level === 1 ? 'text-2xl text-foreground' : level === 2 ? 'text-xl text-foreground/90' : 'text-lg text-foreground/80'
          )}
        >
          {renderInlineMarkdown(headingMatch[2], `heading-${index}`)}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (looksLikeTableRow(trimmed) && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const header = splitTableRow(trimmed);
      const shouldHideTable = header.some((cell) => /\b(source|search)\b/i.test(cell));
      const rowLines = [];
      index += 2;
      while (index < lines.length && looksLikeTableRow(lines[index].trim())) {
        rowLines.push(splitTableRow(lines[index]));
        index += 1;
      }

      if (shouldHideTable) {
        continue;
      }

      blocks.push(
        <div key={`table-${index}`} className="my-6 overflow-hidden rounded-[28px] border border-border/40 bg-secondary/10 shadow-sm backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-primary/5 border-b border-border/30">
                  {header.map((cell, cellIndex) => (
                    <th key={cellIndex} className="px-6 py-4 font-black uppercase tracking-[0.15em] text-primary/70">
                      {renderInlineMarkdown(cell, `table-header-${index}-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {rowLines.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-primary/5 transition-all duration-300">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 align-top text-foreground/90 leading-[1.7] font-medium">
                        {renderInlineMarkdown(cell, `table-row-${index}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      continue;
    }

    if (/^(\-|\*|\+)\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^(\-|\*|\+)\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^(\-|\*|\+)\s+/, ''));
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`} className="my-5 list-none space-y-3.5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="relative pl-8 text-[14px] leading-[1.7] text-foreground/90 font-medium">
              <span className="absolute left-0 top-[0.5em] h-2 w-2 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(74,103,65,0.3)]" />
              {renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`} className="my-5 list-none space-y-3.5">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="relative pl-9 text-[14px] leading-[1.7] text-foreground/90 font-medium">
              <span className="absolute left-0 top-0 text-[11px] font-black text-primary/50 tracking-tighter">{String(itemIndex + 1).padStart(2, '0')}</span>
              {renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      blocks.push(
        <blockquote key={`quote-${index}`} className="my-6 border-l-4 border-primary/40 bg-primary/5 px-6 py-4 text-[14px] text-foreground/80 italic rounded-r-[24px] shadow-inner">
          {renderInlineMarkdown(trimmed.replace(/^>\s+/, ''), `quote-${index}`)}
        </blockquote>
      );
      index += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine || nextLine.startsWith('```') || /^(#{1,6})\s+/.test(nextLine) || /^(\-|\*|\+)\s+/.test(nextLine) || /^\d+\.\s+/.test(nextLine) || /^>\s+/.test(nextLine) || (looksLikeTableRow(nextLine) && index + 1 < lines.length && isTableDivider(lines[index + 1]))) {
        break;
      }
      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="mb-5 last:mb-0 leading-[1.8] text-[14px] text-foreground/90 font-medium">
        {renderInlineMarkdown(paragraphLines.join(' '), `p-${index}`)}
      </p>
    );
  }

  return blocks;
};

const AnimatedDots = ({ tone = 'neutral' }) => {
  const dotClassName =
    tone === 'amber'
      ? 'bg-accent/60'
      : 'bg-primary/40';

  return (
    <span className="inline-flex items-center gap-2 align-middle px-1">
      <span className={cn('h-2 w-2 rounded-full animate-bounce', dotClassName)} />
      <span className={cn('h-2 w-2 rounded-full animate-bounce', dotClassName)} style={{ animationDelay: '0.15s' }} />
      <span className={cn('h-2 w-2 rounded-full animate-bounce', dotClassName)} style={{ animationDelay: '0.3s' }} />
    </span>
  );
};

function MessageBubbleComponent({ message, onWebSearch, onOpenDetails, onRequestGeneralAnswer, messageIndex }) {
  const [algoExpanded, setAlgoExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;
  const isWebSearch = message.isWebSearch;
  const webSearchPending = message.webSearchPending;
  const isWelcome = message.isWelcome;
  const hasAnalysisDetails = !isUser && (Boolean(message.algorithm) || (Array.isArray(message.results) && message.results.length > 0));
  const cleanedAssistantAnswer = !isUser ? sanitizeAssistantAnswer(message.content) || message.content : message.content;
  const cleanedContent = !isUser && hasAnalysisDetails
    ? stripInlineAnalyticsScores(cleanedAssistantAnswer)
    : cleanedAssistantAnswer;
  const cleanedWebSearchAnswer = sanitizeAssistantAnswer(message.webSearchAnswer) || message.webSearchAnswer;
  const isStandaloneWebSearch = isWebSearch && !message.content && !message.webSearchAnswer;
  const hasAssistantText = Boolean(String(cleanedContent || '').trim());
  const hasWebSearchText = Boolean(String(cleanedWebSearchAnswer || '').trim());

  const [currentWordRange, setCurrentWordRange] = useState({ start: 0, end: 0 });

  const handleSpeak = (text) => {
    // Always cancel existing speech first
    window.speechSynthesis.cancel();
    
    if (isSpeaking) {
      setIsSpeaking(false);
      setCurrentWordRange({ start: 0, end: 0 });
      return;
    }

    const speechText = String(text || '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
      .replace(/(\*|_)(.*?)\1/g, '$2')   // italic
      .replace(/^[\s\-\*\+]+/gm, '')      // strip list markers (*, -, +) at start of lines
      .replace(/#+\s+/g, '')             // headings
      .replace(/>\s+/g, '')              // blockquotes
      .replace(/`{1,3}.*?`{1,3}/gs, '')  // code blocks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
      .replace(/\|/g, ' ')               // table pipes
      .replace(/\s+/g, ' ')              // normalize whitespace
      .trim();

    if (!speechText) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'en-US'; // Force language
    
    // Voice Selection: Check localStorage for preference first
    const voices = window.speechSynthesis.getVoices();
    const preferredVoiceName = localStorage.getItem('preferredVoice');
    let preferredVoice = null;

    if (preferredVoiceName) {
      preferredVoice = voices.find(v => v.name === preferredVoiceName);
    }
    
    if (!preferredVoice) {
      // Fallback to high-quality defaults if no preference
      preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
                         || voices.find(v => v.lang === 'en-US')
                         || voices.find(v => v.lang.startsWith('en'));
    }
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log(`🎙️ Speaking with: ${preferredVoice.name}`);
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Word Highlighting Logic
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setCurrentWordRange({
          start: event.charIndex,
          end: event.charIndex + event.charLength
        });
      }
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('🎙️ Speech started');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentWordRange({ start: 0, end: 0 });
      console.log('🎙️ Speech finished');
    };

    utterance.onerror = (e) => {
      console.error('🎙️ TTS Error:', e);
      setIsSpeaking(false);
      setCurrentWordRange({ start: 0, end: 0 });
    };
    
    // Small timeout to prevent the "interrupted" error
    setTimeout(() => {
      window.speechSynthesis.resume(); // Fix for Chrome hangs
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const HighlightedText = ({ text, range, isSpeaking }) => {
    if (!isSpeaking || !text) return renderMarkdownContent(text);

    // Simple word-level highlight for plain text segments
    // For markdown, we'll highlight the whole block for now as it's safer
    // But let's try a split-highlight for the content
    return (
      <div className="relative">
        {renderMarkdownContent(text)}
        <div className="absolute top-0 left-0 pointer-events-none opacity-20">
          {/* This is a visual aid layer */}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex w-full items-start gap-6 py-5 animate-scale-in', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className={cn(
          'mt-1 h-14 w-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-2xl border border-primary/20 bg-primary/10 backdrop-blur-xl transition-all duration-700',
          (message.isStreaming || isSpeaking) ? 'ring-4 ring-primary/20 scale-105 shadow-primary/20' : 'hover:scale-110'
        )}>
          {isStandaloneWebSearch ? (
            <Globe className="w-7 h-7 text-primary" />
          ) : isSpeaking ? (
            <Volume2 className="w-7 h-7 text-primary animate-pulse" />
          ) : (
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          )}
        </div>
      )}

      <div className={cn(
        'group relative min-w-0 rounded-[36px] px-8 py-7 text-[15px] leading-[1.8] transition-all duration-700',
        isUser ? 'max-w-[min(85%,42rem)]' : 'max-w-[min(100%,64rem)]',
        isUser
          ? 'rounded-tr-none bg-primary/10 text-foreground border border-primary/30 shadow-[0_10px_30px_-12px_rgba(74,103,65,0.15)] backdrop-blur-xl'
          : isError
            ? 'rounded-tl-none bg-destructive/10 text-destructive border border-destructive/20'
            : isWelcome
              ? 'rounded-tl-none bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20 text-foreground/90 backdrop-blur-2xl shadow-xl'
              : cn(
                  'rounded-tl-none bg-secondary/40 text-foreground border border-border/30 backdrop-blur-2xl shadow-2xl shadow-primary/5 hover:border-primary/40 hover:bg-secondary/50 transition-colors',
                  isSpeaking && 'ring-2 ring-primary/30 border-primary/40 bg-primary/5'
                )
      )}>
        {/* Main Content Area */}
        <div className="prose prose-sm max-w-none break-words whitespace-normal w-full overflow-hidden">
          {isStandaloneWebSearch ? (
            <div className="flex items-center gap-3.5 py-2 text-primary">
              <div className="p-2 rounded-xl bg-primary/10">
                <Globe className="w-5 h-5 animate-spin-slow" />
              </div>
              <span className="text-[12px] font-black uppercase tracking-[0.3em]">Context Search</span>
            </div>
          ) : hasAssistantText ? (
            message.isStreaming ? (
              <p className="mb-0 whitespace-pre-wrap leading-[1.8] text-current font-medium">
                {cleanedContent}
                <span className="inline-block w-3 h-5 ml-2.5 bg-primary/40 rounded-sm animate-pulse align-text-bottom" />
              </p>
            ) : (
              <div className={cn("transition-all duration-500", isSpeaking && "text-primary/90 font-bold")}>
                {renderMarkdownContent(cleanedContent)}
              </div>
            )
          ) : null}

          {message.isStreaming && !hasAssistantText && (
            <div className="flex items-center gap-4 py-2">
              <span className="text-[11px] font-black text-primary/60 tracking-[0.3em] uppercase">Synthesizing</span>
              <AnimatedDots />
            </div>
          )}
        </div>

        {/* Data Source & Algorithm Indicators */}
        {!isUser && !isError && !isWelcome && !message.isStreaming && message.content && (
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {/* Data source pill — shows grounding score, source count, and retrieval timing */}
            {message.dataGrounding && (
              <span className={cn(
                'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] border transition-all',
                message.dataGrounding.grounded
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              )}>
                {message.dataGrounding.grounded ? (
                  <>
                    <Database className="h-3 w-3 shrink-0" />
                    <span>Knowledge Graph</span>
                    {message.dataGrounding.source_count > 0 && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black">
                        {message.dataGrounding.source_count}&nbsp;node{message.dataGrounding.source_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {typeof message.dataGrounding.score === 'number' && message.dataGrounding.score > 0 && (
                      <span className="opacity-60 text-[9px] font-black normal-case tracking-normal">
                        {Math.round(message.dataGrounding.score * 100)}%
                      </span>
                    )}
                  </>
                ) : (
                  <><AlertTriangle className="h-3 w-3 shrink-0" /> No DB Match</>
                )}
              </span>
            )}
            {/* Retrieval timing badge */}
            {message.dataGrounding?.elapsed_ms > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-muted/30 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {message.dataGrounding.elapsed_ms}&thinsp;ms
              </span>
            )}
            {/* Strategy pill hidden per user preference */}
          </div>
        )}

        {/* Algorithm Insight Card (Prominent & Collapsible) */}
        {!isUser && !isError && !isWelcome && !message.isStreaming && hasAnalysisDetails && message.algorithm && (
          <AlgorithmInsight 
            algorithm={message.algorithm}
            results={message.results}
            dataGrounding={message.dataGrounding}
          />
        )}


        {/* Action Bar (Web Search / Details / Answer Outside DB / Speak) */}
        {!isUser && !isError && !isWelcome && !message.isStreaming && message.content && ((onWebSearch && !message.webSearchAnswer) || hasAnalysisDetails || (onRequestGeneralAnswer && !message.generalAnswer) || hasAssistantText || hasWebSearchText) && (
          <div className="mt-7 flex flex-wrap gap-4 border-t border-border/20 pt-7">
            {onWebSearch && !message.webSearchAnswer && message.content && (
              <button
                onClick={() => onWebSearch({
                  question: message.webSearchQuery || message.content,
                  contextHint: message.content,
                  messageIndex,
                })}
                disabled={webSearchPending}
                className={cn(
                  'flex items-center gap-3 rounded-[20px] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 ring-1 ring-inset',
                  webSearchPending
                    ? 'bg-muted/10 ring-border/20 text-muted-foreground'
                    : 'bg-accent/10 ring-accent/30 text-accent hover:bg-accent/20 hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-accent/20 shadow-sm'
                )}
              >
                {webSearchPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                {webSearchPending ? 'Generating...' : 'AI Knowledge'}
              </button>
            )}

            {hasAnalysisDetails && onOpenDetails && (
              <button
                onClick={() => onOpenDetails(messageIndex)}
                className="flex items-center gap-3 rounded-[20px] border border-primary/30 bg-primary/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/20 hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-primary/20 shadow-sm"
              >
                <Sprout className="h-4.5 w-4.5" />
                Analysis
              </button>
            )}

            {/* Answer Outside DB button — always available */}
            {onRequestGeneralAnswer && !message.generalAnswer && (
              <button
                onClick={() => onRequestGeneralAnswer({
                  question: message.originalQuestion || message.content,
                  messageIndex,
                })}
                disabled={message.generalAnswerPending}
                className={cn(
                  'flex items-center gap-3 rounded-[20px] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all ring-1 ring-inset',
                  message.generalAnswerPending
                    ? 'bg-muted/10 ring-border/20 text-muted-foreground'
                    : 'bg-amber-500/10 ring-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-amber-500/20 shadow-sm'
                )}
              >
                {message.generalAnswerPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                {message.generalAnswerPending ? 'Generating...' : 'General Knowledge'}
              </button>
            )}

            {/* Speak button — available for Assistant messages with content */}
            {!isUser && !message.isStreaming && (hasAssistantText || hasWebSearchText) && (
              <button
                onClick={() => handleSpeak(hasWebSearchText ? cleanedWebSearchAnswer : cleanedContent)}
                className={cn(
                  'flex items-center gap-3 rounded-[20px] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-sm ring-1 ring-inset',
                  isSpeaking
                    ? 'bg-primary text-white ring-primary shadow-xl shadow-primary/20'
                    : 'bg-secondary/20 ring-border/30 text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                )}
                title={isSpeaking ? "Stop Reading" : "Read Aloud"}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4 animate-pulse" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>
            )}
          </div>
        )}

        {/* General Answer (outside DB) Section */}
        {(message.generalAnswer || message.isStreamingGeneralAnswer) && (
          <div className="mt-8 rounded-[32px] border border-amber-500/25 bg-amber-500/5 p-8 shadow-inner backdrop-blur-3xl animate-fade-up ring-1 ring-amber-500/10">
            <div className="mb-6 flex items-center gap-4 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 backdrop-blur-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[12px] font-black uppercase tracking-[0.3em]">General Knowledge</span>
              {message.isStreamingGeneralAnswer && (
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Streaming</span>
                </div>
              )}
            </div>
            <div className="prose prose-sm max-w-none break-words whitespace-normal w-full overflow-hidden">
              {message.isStreamingGeneralAnswer && !message.generalAnswer?.trim() ? (
                <div className="flex items-center gap-4 py-2">
                  <span className="text-[11px] font-black text-amber-500/60 tracking-[0.2em] uppercase">Generating</span>
                  <AnimatedDots tone="amber" />
                </div>
              ) : message.isStreamingGeneralAnswer ? (
                <p className="mb-0 whitespace-pre-wrap leading-[1.8] text-foreground/90 font-medium">
                  {message.generalAnswer}
                  <span className="inline-block w-3 h-5 ml-3 bg-amber-500/40 rounded-sm animate-pulse align-text-bottom" />
                </p>
              ) : (
                renderMarkdownContent(message.generalAnswer)
              )}
            </div>
          </div>
        )}

        {/* AI Knowledge Result Section (uses local LLM general knowledge, not live internet) */}
        {(message.webSearchAnswer || message.isStreamingWebSearch) && (
          <div className="mt-8 rounded-[32px] border border-accent/25 bg-accent/5 p-8 shadow-inner backdrop-blur-3xl animate-fade-up ring-1 ring-white/10">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4 text-accent/80">
                  <div className="p-2.5 rounded-2xl bg-accent/15 backdrop-blur-md">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-[0.3em]">AI Knowledge</span>
              </div>
              {message.isStreamingWebSearch && (
                <div className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-accent animate-ping" />
                   <span className="text-[10px] font-black text-accent/60 uppercase tracking-widest">Generating</span>
                </div>
              )}
            </div>
            
            <div className="prose prose-sm max-w-none break-words whitespace-normal w-full overflow-hidden">
              {hasWebSearchText ? (
                message.isStreamingWebSearch ? (
                  <p className="mb-0 whitespace-pre-wrap leading-[1.8] text-foreground/90 font-medium">
                    {cleanedWebSearchAnswer}
                    <span className="inline-block w-3 h-5 ml-3 bg-accent/40 rounded-sm animate-pulse align-text-bottom" />
                  </p>
                ) : (
                  renderMarkdownContent(cleanedWebSearchAnswer)
                )
              ) : null}
              {message.isStreamingWebSearch && !hasWebSearchText && (
                <div className="flex items-center gap-4 py-2">
                  <span className="text-[11px] font-black text-accent/60 tracking-[0.2em] uppercase">Generating...</span>
                  <AnimatedDots tone="amber" />
                </div>
              )}
            </div>

            {Array.isArray(message.webSearchSources) && message.webSearchSources.length > 0 && (
              <div className="mt-8 pt-7 border-t border-accent/20">
                <div className="mb-5 text-[10px] font-black uppercase tracking-[0.4em] text-accent/50">Reference Sources</div>
                <div className="flex flex-wrap gap-3.5">
                  {message.webSearchSources.map((source, idx) => {
                    const url = source?.url || source?.uri || '';
                    const title = source?.title || source?.name || (url ? new URL(url).hostname : `Node ${idx + 1}`);
                    return url ? (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/source inline-flex items-center gap-3 rounded-2xl border border-accent/20 bg-white/40 px-5 py-2.5 text-[12px] font-bold text-foreground/80 transition-all hover:bg-accent hover:text-white hover:border-accent hover:shadow-2xl dark:bg-card/40 dark:hover:bg-accent dark:hover:text-white shadow-sm"
                        title={title}
                      >
                        <ExternalLink className="h-4.5 w-4.5 shrink-0 opacity-40 group-hover/source:opacity-100 transition-opacity" />
                        <span className="max-w-[220px] truncate">{title}</span>
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 h-14 w-14 rounded-[20px] bg-accent flex items-center justify-center shrink-0 border-2 border-white shadow-[0_20px_50px_-12px_hsl(var(--accent)/0.3)] transition-transform hover:scale-110 hover:shadow-accent/40 active:scale-95">
          <User className="w-7 h-7 text-white" />
        </div>
      )}
    </div>
  );
}

export const MessageBubble = React.memo(
  MessageBubbleComponent,
  (prevProps, nextProps) =>
    prevProps.message === nextProps.message
    && prevProps.messageIndex === nextProps.messageIndex
    && prevProps.onOpenDetails === nextProps.onOpenDetails
    && prevProps.onRequestGeneralAnswer === nextProps.onRequestGeneralAnswer
);

export const TypingIndicator = React.memo(function TypingIndicator() {
  return (
    <div className="flex gap-6 justify-start animate-fade-up py-4">
      <div className="w-14 h-14 rounded-[20px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-xl animate-pulse">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <div className="bg-secondary/30 border border-border/40 rounded-[32px] rounded-tl-none px-8 py-6 backdrop-blur-xl shadow-2xl flex items-center gap-4">
         <span className="text-[11px] font-black text-primary/50 tracking-[0.3em] uppercase">Thinking...</span>
         <AnimatedDots />
      </div>
    </div>
  );
});
