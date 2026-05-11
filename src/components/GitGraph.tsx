import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitState, Commit } from '../lib/gitSimulator';

interface GitGraphProps {
  state: GitState;
}

interface NodeInfo {
  commit: Commit;
  x: number;
  y: number;
  color: string;
}

const BRANCH_COLORS = [
  '#f7768e', // red
  '#9ece6a', // green
  '#e0af68', // yellow
  '#7aa2f7', // blue
  '#bb9af7', // purple
  '#0db9d7', // cyan
];

const NODE_SPACING_X = 120;
const NODE_SPACING_Y = 80;
const NODE_RADIUS = 16;
const PADDING_X = 60;

export const GitGraph: React.FC<GitGraphProps> = ({ state }) => {
  const { nodes, edges, maxX, maxY } = useMemo(() => {
    if (!state.commits.length) {
      return { nodes: [], edges: [], maxX: 0, maxY: 0 };
    }

    const localNodes: NodeInfo[] = [];
    const localEdges: { id: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    const localBranchTracks: Record<string, number> = {};
    
    // Always center the current branch
    localBranchTracks[state.currentBranch] = 0;
    let nextPos = 1;
    let nextNeg = -1;

    state.branches.forEach((b) => {
      if (b.name !== state.currentBranch && localBranchTracks[b.name] === undefined) {
        if (Math.abs(nextPos) <= Math.abs(nextNeg)) {
          localBranchTracks[b.name] = nextPos++;
        } else {
          localBranchTracks[b.name] = nextNeg--;
        }
      }
    });

    const commitDepths: Record<string, number> = {};
    const calculateDepth = (commitId: string): number => {
      if (commitDepths[commitId] !== undefined) return commitDepths[commitId];
      const commit = state.commits.find(c => c.id === commitId);
      if (!commit || commit.parentIds.length === 0) {
        commitDepths[commitId] = 0;
        return 0;
      }
      const maxParentDepth = Math.max(...commit.parentIds.map(calculateDepth));
      const depth = maxParentDepth + 1;
      commitDepths[commitId] = depth;
      return depth;
    };

    state.commits.forEach(c => calculateDepth(c.id));

    const sortedCommits = [...state.commits].sort((a, b) => {
        return calculateDepth(a.id) - calculateDepth(b.id) || a.timestamp - b.timestamp;
    });

    let maxDepth = 0;
    let minTrack = 0;
    let maxTrack = 0;

    Object.values(localBranchTracks).forEach(t => {
      minTrack = Math.min(minTrack, t);
      maxTrack = Math.max(maxTrack, t);
    });

    const totalTracks = maxTrack - minTrack + 1;
    // Ensure we have enough vertical space, at least 600px
    const graphHeight = Math.max(600, totalTracks * NODE_SPACING_Y + 200);
    const CENTER_Y = graphHeight / 2;

    sortedCommits.forEach((commit) => {
      const trackIndex = localBranchTracks[commit.branch] ?? 0;
      const depth = commitDepths[commit.id];
      maxDepth = Math.max(maxDepth, depth);

      const x = PADDING_X + depth * NODE_SPACING_X;
      const y = CENTER_Y + trackIndex * NODE_SPACING_Y;
      
      // We take positive modulo for colors
      const colorIndex = ((trackIndex % BRANCH_COLORS.length) + BRANCH_COLORS.length) % BRANCH_COLORS.length;
      const color = BRANCH_COLORS[colorIndex];

      localNodes.push({ commit, x, y, color });
    });

    localNodes.forEach((node) => {
      node.commit.parentIds.forEach((parentId) => {
        const parentNode = localNodes.find(n => n.commit.id === parentId);
        if (parentNode) {
          localEdges.push({
            id: `${parentId}-${node.commit.id}`,
            x1: parentNode.x,
            y1: parentNode.y,
            x2: node.x,
            y2: node.y,
            color: node.commit.parentIds.length > 1 && parentId !== node.commit.parentIds[0] ? parentNode.color : node.color,
          });
        }
      });
    });

    return { 
      nodes: localNodes, 
      edges: localEdges, 
      maxX: PADDING_X * 2 + maxDepth * NODE_SPACING_X,
      maxY: graphHeight
    };
  }, [state.commits, state.branches, state.currentBranch]);

  if (!state.isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1a1b26] text-[#565f89]">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <p>Repository not initialized.</p>
          <p className="text-sm">Run <code className="text-[#9ece6a]">git init</code> or <code className="text-[#9ece6a]">git clone</code> to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#1a1b26] relative overflow-auto custom-scrollbar">
      {/* Background SVG for edges */}
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ minWidth: Math.max(maxX, 800), minHeight: Math.max(maxY, 600) }}
      >
        {edges.map(edge => {
            // Draw smooth bezier curves
            const dx = Math.abs(edge.x2 - edge.x1);
            const pathData = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx / 2} ${edge.y1}, ${edge.x2 - dx / 2} ${edge.y2}, ${edge.x2} ${edge.y2}`;
            
            return (
              <motion.path
                key={edge.id}
                d={pathData}
                fill="none"
                stroke={edge.color}
                strokeWidth={3}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            );
        })}
      </svg>

      {/* Nodes and Labels */}
      <div className="absolute inset-0" style={{ minWidth: Math.max(maxX, 800), minHeight: Math.max(maxY, 600) }}>
        {nodes.map((node) => {
          const isHead = state.head === node.commit.id || 
                         state.branches.find(b => b.name === state.head)?.targetCommitId === node.commit.id;

          // Find branch names that point to this commit
          const branchLabels = state.branches.filter(b => b.targetCommitId === node.commit.id).map(b => b.name);

          return (
            <motion.div
              key={node.commit.id}
              className="absolute group"
              style={{ 
                left: node.x - NODE_RADIUS, 
                top: node.y - NODE_RADIUS,
                width: NODE_RADIUS * 2,
                height: NODE_RADIUS * 2
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Node Circle */}
              <div 
                className={`w-full h-full rounded-full border-4 shadow-lg transition-transform hover:scale-125 z-10 relative flex items-center justify-center`}
                style={{ 
                  backgroundColor: '#1a1b26', 
                  borderColor: node.color,
                  boxShadow: `0 0 10px ${node.color}40`
                }}
              >
                  {/* Glow effect if HEAD */}
                  {isHead && (
                      <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: node.color }} />
                  )}
              </div>

              {/* Branch Tags */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-1 items-center pointer-events-none">
                 {branchLabels.map(label => (
                     <div key={label} className="px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border bg-[#24283b]" style={{ borderColor: node.color, color: node.color }}>
                         {label}
                     </div>
                 ))}
                 {isHead && (
                     <div className="px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap bg-[#c0caf5] text-[#1a1b26] font-bold">
                         HEAD
                     </div>
                 )}
              </div>

              {/* Tooltip on hover */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#24283b] border border-[#414868] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-48">
                <div className="text-[#7aa2f7] font-mono text-xs mb-1">{node.commit.id.substring(0, 7)}</div>
                <div className="text-[#a9b1d6] text-sm break-words">{node.commit.message}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
