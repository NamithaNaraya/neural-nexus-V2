import React, { useRef, useEffect } from 'react';
import { MessageBubble, TypingIndicator } from '../MessageBubble';

export function VirtualMessageList({
  messages = [],
  onWebSearch,
  onOpenDetails,
}) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto px-6 py-8 space-y-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
    >
      <div className="flex flex-col gap-2 min-h-full">
        {messages.map((item) => {
          if (item.type === 'message') {
            return (
              <MessageBubble
                key={item.key}
                message={item.message}
                messageIndex={item.index}
                onWebSearch={onWebSearch}
                onOpenDetails={onOpenDetails}
              />
            );
          }
          if (item.type === 'typing') {
            return <TypingIndicator key={item.key} />;
          }
          return null;
        })}
        <div className="h-20 shrink-0" /> {/* Bottom spacing for input area */}
      </div>
    </div>
  );
}
