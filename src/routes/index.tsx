import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Terminal } from "../components/Terminal";
import { GitGraph } from "../components/GitGraph";
import { INITIAL_STATE, processCommand, GitState } from "../lib/gitSimulator";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [gitState, setGitState] = useState<GitState>(INITIAL_STATE);

  const handleCommand = (command: string) => {
    const result = processCommand(gitState, command);
    
    // Create new history entry
    const newHistoryEntry = {
      command,
      output: result.output,
      success: result.success
    };

    setGitState({
      ...result.newState,
      history: [...result.newState.history, newHistoryEntry]
    });
  };

  return (
    <div className="h-screen w-screen bg-[#0a0f18] overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <header className="h-14 border-b border-[#1f2937] bg-[#111827] flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#7aa2f7] flex items-center justify-center text-[#0a0f18] font-bold text-xl">
            GL
          </div>
          <h1 className="text-[#a9b1d6] font-semibold text-lg tracking-tight">Git Learner</h1>
        </div>
        <div className="text-[#565f89] text-sm hidden sm:block">
          Interactive Git Visualization Environment
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Terminal Pane */}
        <div className="w-1/3 min-w-[300px] border-r border-[#1f2937]">
          <Terminal state={gitState} onCommand={handleCommand} />
        </div>
        
        {/* Graph Pane */}
        <div className="flex-1 min-w-[400px] flex flex-col h-full">
          <GitGraph state={gitState} />
        </div>
      </div>

      {/* Footer */}
      <footer className="h-10 border-t border-[#1f2937] bg-[#111827] flex items-center justify-center shrink-0">
        <p className="text-[#565f89] text-xs">
          © {new Date().getFullYear()} All rights reserved. Built by{' '}
          <a 
            href="https://github.com/iamgh" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#7aa2f7] hover:text-[#9ece6a] transition-colors font-semibold"
          >
            iamgh
          </a>
        </p>
      </footer>
    </div>
  );
}
