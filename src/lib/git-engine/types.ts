export type CommitId = string;

export interface Commit {
  id: CommitId;
  message: string;
  parents: CommitId[];
  branch: string; // branch this commit was created on (for layout coloring)
  timestamp: number;
}

export type Head =
  | { type: "branch"; ref: string }
  | { type: "detached"; ref: CommitId }
  | { type: "unborn"; ref: string }; // initialized but no commit yet

export interface RepoState {
  initialized: boolean;
  commits: Record<CommitId, Commit>;
  order: CommitId[]; // creation order
  branches: Record<string, CommitId | null>;
  head: Head | null;
  staged: string[];
  workdir: string[];
}

export type OutputLineKind = "prompt" | "stdout" | "stderr" | "success" | "help" | "system";

export interface OutputLine {
  id: string;
  kind: OutputLineKind;
  text?: string;
  // For help output we render a structured table
  helpRows?: { command: string; description: string }[];
}

export interface CommandResult {
  next: RepoState;
  output: OutputLine[];
}

export const initialState: RepoState = {
  initialized: false,
  commits: {},
  order: [],
  branches: {},
  head: null,
  staged: [],
  workdir: [],
};