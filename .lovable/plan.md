## Git Learner — Interactive Web App

A split-screen dark-themed dashboard where users type Git commands in a left-side terminal and watch a live SVG commit/branch graph update on the right.

### Design system (src/styles.css)
- Background: deep charcoal `oklch(0.16 0.015 250)`; surface `oklch(0.20 0.018 250)`
- Accents: neon blue `oklch(0.75 0.18 230)`, neon green `oklch(0.82 0.20 155)`
- Error: soft coral `oklch(0.72 0.17 30)`; muted text `oklch(0.65 0.02 250)`
- Fonts: JetBrains Mono (terminal + graph labels), Inter (UI chrome) — loaded via Google Fonts in `__root.tsx`
- Tokens: `--terminal-bg`, `--terminal-prompt`, `--graph-node`, `--graph-branch`, `--graph-head` plus existing semantic tokens

### Routes
- `src/routes/index.tsx` — replaces placeholder; renders the dashboard

### Component structure
```text
src/components/git-learner/
  Dashboard.tsx          50/50 split layout, header with app title + branch chip
  Terminal.tsx           input, history, blinking cursor, scroll, focus management
  TerminalLine.tsx       renders prompt/command/output/error/help-table rows
  GitGraph.tsx           SVG canvas with Framer Motion nodes/edges/HEAD pointer
  CommandHelp.tsx        tabular help output component
src/lib/git-engine/
  types.ts               Commit, Branch, RepoState, CommandResult
  state.ts               initial state + pure reducers (init, add, commit, branch, checkout, merge, clone)
  commands.ts            parser: tokenizes input, dispatches to reducers, returns { state, output, error }
  layout.ts              computes node x/y positions from commit DAG for the SVG
src/hooks/
  useGitEngine.ts        useReducer wrapper exposing run(command), state, history
```

### Terminal behavior
- Maintains `history: TerminalLine[]` and `inputBuffer`
- Up/Down arrows cycle prior commands; Enter dispatches through `useGitEngine`
- Blinking caret via CSS keyframe animation on a `<span>` after the input
- Auto-scrolls to bottom on new output; click anywhere refocuses the hidden input

### Git engine (state machine)
- `RepoState`: `{ initialized, commits: Record<id, Commit>, branches: Record<name, commitId>, head: { type: 'branch'|'detached', ref: string }, staged: string[], workdir: string[] }`
- Supported commands: `git init`, `git clone <url>` (creates a seeded repo), `git status`, `git add <file>`, `git commit -m "msg"`, `git branch [name]`, `git checkout <branch>`, `git checkout -b <name>`, `git merge <branch>` (fast-forward + simple 3-way that creates a merge commit with two parents), `git log`, `clear`, `help`
- Each reducer returns `{ next, output | error }`; pure so it's easy to unit-test later
- Unknown / malformed commands return Unix-style error + helpful hint, e.g. `error: merge requires a branch name\nhint: use 'git merge <branch-name>' to combine changes.`

### Graph visualization
- `layout.ts` walks commits in topo order assigning columns per branch and rows per commit depth
- `GitGraph.tsx` renders an SVG; commits are `motion.circle` with `initial={{scale:0, opacity:0}} animate={{scale:1, opacity:1}}`, branch lines are `motion.path` with animated `pathLength`
- HEAD pointer is a labeled pill (`motion.g`) that slides between commits with `layout` prop
- Branch labels float beside their tip commits in neon green; HEAD in neon blue
- Empty-state message before `git init`

### Help output
`CommandHelp.tsx` renders a two-column grid (command / description) styled like a man page; invoked when engine returns `{ type: 'help' }`.

### Animations
- Terminal lines: `fade-in` + slight `translateY` stagger
- Graph nodes: scale-in spring; edges: animated `pathLength` 0→1; HEAD: shared-layout slide
- Respect `prefers-reduced-motion` by shortening durations

### SEO / head
Update `__root.tsx` defaults and add route-level `head()` in `index.tsx`: title "Git Learner — Interactive Git Playground", description, og tags.

### Out of scope (can be added later)
- Remote tracking / push / pull semantics
- Rebase, cherry-pick, stash
- Persistence across reloads
- Authentication / Lovable Cloud (not needed for this offline simulator)

### Dependencies
- `framer-motion` and `lucide-react` — install via `bun add` before importing
- No backend, no Lovable Cloud (purely client-side simulator)
