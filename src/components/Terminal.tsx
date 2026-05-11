import React, { useState, useRef, useEffect } from 'react';
import { GitState } from '../lib/gitSimulator';

interface TerminalProps {
  state: GitState;
  onCommand: (command: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ state, onCommand }) => {
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.history]);

  // Focus input on mount and when clicking anywhere in terminal
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        setCommandHistory(prev => [...prev, input.trim()]);
        setHistoryIndex(-1);
        onCommand(input);
      } else {
        // Just print empty prompt
        onCommand('');
      }
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    }
  };

  const currentPath = state.isInitialized ? '~/project/.git' : '~/project';

  return (
    <div 
      className="flex flex-col h-full bg-[#0a0f18] text-[#a9b1d6] font-mono text-sm p-4 overflow-hidden border-r border-[#1f2937]"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1f2937]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
        <span className="text-xs text-[#565f89] uppercase tracking-widest font-bold">Terminal</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pb-4 scrollbar-thin scrollbar-thumb-[#1f2937] scrollbar-track-transparent"
      >
        <div className="text-[#9ece6a] mb-4">
          Welcome to Git Learner! Type 'help' to see available commands.
        </div>

        {state.history.map((entry, i) => (
          <div key={i} className="flex flex-col">
            {entry.command && (
              <div className="flex items-center gap-2">
                <span className="text-[#7aa2f7]">learner@{currentPath}</span>
                <span className="text-[#bb9af7]">$</span>
                <span className="text-[#c0caf5]">{entry.command}</span>
              </div>
            )}
            {entry.output && (
              <div className={`whitespace-pre-wrap mt-1 ${entry.success ? 'text-[#a9b1d6]' : 'text-[#f7768e]'}`}>
                {entry.output}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2">
          <span className="text-[#7aa2f7]">learner@{currentPath}</span>
          <span className="text-[#bb9af7]">$</span>
          <textarea
            ref={inputRef as any}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleKeyDown(e as any);
               } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                   handleKeyDown(e as any);
               }
            }}
            className="flex-1 bg-transparent outline-none text-[#c0caf5] caret-[#bb9af7] resize-none overflow-hidden"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            rows={1}
            style={{ minHeight: '20px' }}
          />
        </div>
      </div>
    </div>
  );
};
