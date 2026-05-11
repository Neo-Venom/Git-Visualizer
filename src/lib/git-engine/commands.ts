import type { CommandResult, Commit, OutputLine, RepoState } from "./types";
import { initialState } from "./types";

let _id = 0;
const sid = () => `${Date.now().toString(36)}${(_id++).toString(36)}`;
const shortId = () => Math.random().toString(36).slice(2, 9);

const line = (kind: OutputLine["kind"], text?: string, helpRows?: OutputLine["helpRows"]): OutputLine => ({
  id: sid(),
  kind,
  text,
  helpRows,
});

export const HELP_ROWS = [
  { command: "git init", description: "Initialize a new repository" },
  { command: "git clone <url>", description: "Clone a seeded sample repository" },
  { command: "git status", description: "Show working tree and HEAD" },
  { command: "git add <file>", description: "Stage a file for commit" },
  { command: 'git commit -m "msg"', description: "Record staged changes as a commit" },
  { command: "git branch [name]", description: "List branches or create a new one" },
  { command: "git checkout <branch>", description: "Switch to an existing branch" },
  { command: "git checkout -b <name>", description: "Create and switch to a new branch" },
  { command: "git merge <branch>", description: "Merge a branch into the current branch" },
  { command: "git log", description: "Show commit history" },
  { command: "help", description: "Show this help message" },
  { command: "clear", description: "Clear the terminal" },
];

// --- tokenizer that respects double-quoted strings ---
function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) out.push(m[1] ?? m[2]);
  return out;
}

function err(text: string, hint?: string): OutputLine[] {
  const lines = [line("stderr", text)];
  if (hint) lines.push(line("stderr", `hint: ${hint}`));
  return lines;
}

function headCommitId(state: RepoState): string | null {
  if (!state.head) return null;
  if (state.head.type === "branch") return state.branches[state.head.ref] ?? null;
  if (state.head.type === "detached") return state.head.ref;
  return null;
}

function currentBranch(state: RepoState): string | null {
  return state.head?.type === "branch" || state.head?.type === "unborn" ? state.head.ref : null;
}

// ancestors set (inclusive)
function ancestors(state: RepoState, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    const cm = state.commits[c];
    if (cm) stack.push(...cm.parents);
  }
  return seen;
}

function makeCommit(state: RepoState, message: string, parents: string[], branch: string): RepoState {
  const id = shortId();
  const commit: Commit = { id, message, parents, branch, timestamp: Date.now() };
  const branches = { ...state.branches };
  if (currentBranch(state)) branches[currentBranch(state)!] = id;
  return {
    ...state,
    commits: { ...state.commits, [id]: commit },
    order: [...state.order, id],
    branches,
    head: state.head?.type === "unborn" ? { type: "branch", ref: state.head.ref } : state.head,
    staged: [],
  };
}

// --- command handlers ---

function cmdInit(state: RepoState): CommandResult {
  if (state.initialized) {
    return { next: state, output: [line("stdout", "Reinitialized existing Git repository.")] };
  }
  return {
    next: {
      ...initialState,
      initialized: true,
      branches: { main: null },
      head: { type: "unborn", ref: "main" },
    },
    output: [line("success", "Initialized empty Git repository on branch 'main'.")],
  };
}

function cmdClone(state: RepoState, args: string[]): CommandResult {
  if (args.length === 0) return { next: state, output: err("fatal: You must specify a repository to clone.", "use 'git clone <url>' to clone a sample repository") };
  // Seed a small repo with 3 commits on main
  let next: RepoState = {
    ...initialState,
    initialized: true,
    branches: { main: null },
    head: { type: "unborn", ref: "main" },
  };
  next = makeCommit(next, "Initial commit", [], "main");
  const c1 = next.order[next.order.length - 1];
  next = makeCommit(next, "Add README", [c1], "main");
  const c2 = next.order[next.order.length - 1];
  next = makeCommit(next, "Set up project", [c2], "main");
  return { next, output: [line("success", `Cloning into '${args[0].split("/").pop()?.replace(/\.git$/, "") || "repo"}'...`), line("stdout", "Receiving objects: 100% (3/3), done.")] };
}

function ensureInit(state: RepoState): OutputLine[] | null {
  if (!state.initialized) return err("fatal: not a git repository", "run 'git init' first to create a repository");
  return null;
}

function cmdStatus(state: RepoState): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  const br = currentBranch(state) ?? "(detached)";
  const out: OutputLine[] = [line("stdout", `On branch ${br}`)];
  if (state.head?.type === "unborn") out.push(line("stdout", "No commits yet"));
  if (state.staged.length) out.push(line("stdout", `Changes to be committed:\n  ${state.staged.map((f) => "new file:   " + f).join("\n  ")}`));
  else out.push(line("stdout", "nothing to commit, working tree clean"));
  return { next: state, output: out };
}

function cmdAdd(state: RepoState, args: string[]): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  if (args.length === 0) return { next: state, output: err("Nothing specified, nothing added.", "use 'git add <file>' to stage a file") };
  const staged = Array.from(new Set([...state.staged, ...args]));
  return { next: { ...state, staged }, output: [line("success", `Staged ${args.join(", ")}`)] };
}

function cmdCommit(state: RepoState, args: string[]): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  const mIdx = args.indexOf("-m");
  if (mIdx === -1 || !args[mIdx + 1]) {
    return { next: state, output: err("error: commit requires a message", 'use \'git commit -m "your message"\' to record changes') };
  }
  const message = args[mIdx + 1];
  if (state.head?.type === "unborn") {
    // First commit allowed even without staged files (initial commit convenience)
  } else if (state.staged.length === 0) {
    return { next: state, output: err("nothing to commit, working tree clean", "use 'git add <file>' before committing") };
  }
  const br = currentBranch(state);
  if (!br) return { next: state, output: err("fatal: detached HEAD", "checkout a branch before committing") };
  const parent = headCommitId(state);
  const parents = parent ? [parent] : [];
  const next = makeCommit(state, message, parents, br);
  const id = next.order[next.order.length - 1];
  return { next, output: [line("success", `[${br} ${id.slice(0, 7)}] ${message}`)] };
}

function cmdBranch(state: RepoState, args: string[]): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  if (args.length === 0) {
    const cur = currentBranch(state);
    const rows = Object.keys(state.branches).sort().map((b) => `${b === cur ? "* " : "  "}${b}`);
    return { next: state, output: [line("stdout", rows.join("\n") || "(no branches)")] };
  }
  const name = args[0];
  if (state.branches[name] !== undefined) {
    return { next: state, output: err(`fatal: A branch named '${name}' already exists.`) };
  }
  const tip = headCommitId(state);
  if (!tip) return { next: state, output: err("fatal: Not a valid object name: 'HEAD'.", "create at least one commit before branching") };
  return { next: { ...state, branches: { ...state.branches, [name]: tip } }, output: [line("success", `Created branch '${name}'`)] };
}

function cmdCheckout(state: RepoState, args: string[]): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  if (args.length === 0) return { next: state, output: err("error: checkout requires a branch name", "use 'git checkout <branch>' or 'git checkout -b <new-branch>'") };
  if (args[0] === "-b") {
    const name = args[1];
    if (!name) return { next: state, output: err("error: switch '-b' requires a value", "use 'git checkout -b <new-branch>'") };
    if (state.branches[name] !== undefined) return { next: state, output: err(`fatal: A branch named '${name}' already exists.`) };
    const tip = headCommitId(state);
    if (!tip && state.head?.type !== "unborn") return { next: state, output: err("fatal: Not a valid object name: 'HEAD'.") };
    const branches = { ...state.branches, [name]: tip };
    const head = state.head?.type === "unborn" ? { type: "unborn" as const, ref: name } : { type: "branch" as const, ref: name };
    return { next: { ...state, branches, head }, output: [line("success", `Switched to a new branch '${name}'`)] };
  }
  const name = args[0];
  if (state.branches[name] === undefined) return { next: state, output: err(`error: pathspec '${name}' did not match any branch known to git`, "use 'git branch' to list branches") };
  return { next: { ...state, head: { type: "branch", ref: name } }, output: [line("success", `Switched to branch '${name}'`)] };
}

function cmdMerge(state: RepoState, args: string[]): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  if (args.length === 0) return { next: state, output: err("fatal: No commit specified and merge.defaultToUpstream not set.", "use 'git merge <branch-name>' to combine changes") };
  const other = args[0];
  if (state.branches[other] === undefined) return { next: state, output: err(`merge: ${other} - not something we can merge`, "use 'git branch' to list available branches") };
  const cur = currentBranch(state);
  if (!cur) return { next: state, output: err("fatal: not on any branch") };
  if (cur === other) return { next: state, output: err(`Already on '${cur}'`) };
  const curTip = state.branches[cur];
  const otherTip = state.branches[other];
  if (!otherTip) return { next: state, output: err(`fatal: branch '${other}' has no commits`) };
  if (!curTip) {
    // FF current to other
    return { next: { ...state, branches: { ...state.branches, [cur]: otherTip }, head: { type: "branch", ref: cur } }, output: [line("success", `Fast-forward to ${otherTip.slice(0,7)}`)] };
  }
  // already up-to-date?
  const curAnc = ancestors(state, curTip);
  if (curAnc.has(otherTip)) return { next: state, output: [line("stdout", "Already up to date.")] };
  const otherAnc = ancestors(state, otherTip);
  if (otherAnc.has(curTip)) {
    // fast-forward
    return { next: { ...state, branches: { ...state.branches, [cur]: otherTip } }, output: [line("success", `Fast-forward ${curTip.slice(0,7)}..${otherTip.slice(0,7)}`)] };
  }
  // 3-way merge commit
  const next = makeCommit(state, `Merge branch '${other}' into ${cur}`, [curTip, otherTip], cur);
  const id = next.order[next.order.length - 1];
  return { next, output: [line("success", `Merge made by the 'recursive' strategy. [${cur} ${id.slice(0,7)}]`)] };
}

function cmdLog(state: RepoState): CommandResult {
  const e = ensureInit(state); if (e) return { next: state, output: e };
  const tip = headCommitId(state);
  if (!tip) return { next: state, output: [line("stdout", "(no commits yet)")] };
  const visited = new Set<string>();
  const stack = [tip];
  const ordered: string[] = [];
  while (stack.length) {
    const c = stack.pop()!;
    if (visited.has(c)) continue;
    visited.add(c);
    ordered.push(c);
    const cm = state.commits[c];
    if (cm) stack.push(...cm.parents);
  }
  ordered.sort((a, b) => (state.commits[b].timestamp - state.commits[a].timestamp));
  const out = ordered.map((id) => {
    const c = state.commits[id];
    return `commit ${id}\n  ${c.message}`;
  }).join("\n");
  return { next: state, output: [line("stdout", out)] };
}

export function runCommand(state: RepoState, input: string): CommandResult & { echoLines?: OutputLine[] } {
  const trimmed = input.trim();
  if (!trimmed) return { next: state, output: [] };
  const tokens = tokenize(trimmed);

  if (tokens[0] === "help") return { next: state, output: [line("help", undefined, HELP_ROWS)] };
  if (tokens[0] === "clear") return { next: state, output: [{ id: "__clear__", kind: "system", text: "__clear__" }] };

  if (tokens[0] !== "git") {
    return { next: state, output: err(`command not found: ${tokens[0]}`, "type 'help' to see available commands") };
  }
  const sub = tokens[1];
  const args = tokens.slice(2);
  switch (sub) {
    case "init": return cmdInit(state);
    case "clone": return cmdClone(state, args);
    case "status": return cmdStatus(state);
    case "add": return cmdAdd(state, args);
    case "commit": return cmdCommit(state, args);
    case "branch": return cmdBranch(state, args);
    case "checkout": return cmdCheckout(state, args);
    case "merge": return cmdMerge(state, args);
    case "log": return cmdLog(state);
    case undefined: return { next: state, output: err("usage: git <command> [<args>]", "type 'help' to see available commands") };
    default: return { next: state, output: err(`git: '${sub}' is not a git command.`, "type 'help' to see available commands") };
  }
}

export { line as makeOutputLine };