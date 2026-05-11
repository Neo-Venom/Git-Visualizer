import type { RepoState } from "./types";

export interface NodePos {
  id: string;
  x: number;
  y: number;
  branch: string;
  message: string;
  parents: string[];
}

export interface BranchTip {
  name: string;
  commitId: string;
  isHead: boolean;
}

export interface GraphLayout {
  nodes: NodePos[];
  edges: { from: string; to: string }[];
  branches: BranchTip[];
  headCommitId: string | null;
  width: number;
  height: number;
}

const ROW_H = 70;
const COL_W = 90;
const PAD_X = 60;
const PAD_Y = 50;

export function computeLayout(state: RepoState): GraphLayout {
  // Assign columns per branch in insertion order
  const branchCols: Record<string, number> = {};
  let col = 0;
  for (const b of Object.keys(state.branches)) branchCols[b] = col++;

  // sort commits by timestamp ascending so older are at top
  const ordered = [...state.order];
  const rowOf: Record<string, number> = {};
  ordered.forEach((id, i) => { rowOf[id] = i; });

  const nodes: NodePos[] = ordered.map((id) => {
    const c = state.commits[id];
    const colIdx = branchCols[c.branch] ?? 0;
    return {
      id,
      x: PAD_X + colIdx * COL_W,
      y: PAD_Y + rowOf[id] * ROW_H,
      branch: c.branch,
      message: c.message,
      parents: c.parents,
    };
  });

  const edges: { from: string; to: string }[] = [];
  for (const n of nodes) for (const p of n.parents) edges.push({ from: p, to: n.id });

  const headCommitId =
    state.head?.type === "branch" ? state.branches[state.head.ref] ?? null :
    state.head?.type === "detached" ? state.head.ref : null;

  const branches: BranchTip[] = Object.entries(state.branches)
    .filter(([, id]) => !!id)
    .map(([name, id]) => ({
      name,
      commitId: id!,
      isHead: state.head?.type === "branch" && state.head.ref === name,
    }));

  const width = Math.max(360, PAD_X * 2 + (Object.keys(branchCols).length || 1) * COL_W);
  const height = Math.max(240, PAD_Y * 2 + ordered.length * ROW_H);

  return { nodes, edges, branches, headCommitId, width, height };
}