export interface Commit {
  id: string;
  message: string;
  parentIds: string[];
  branch: string;
  timestamp: number;
}

export interface Branch {
  name: string;
  targetCommitId: string | null;
}

export interface CommandResult {
  output: string;
  success: boolean;
  newState: GitState;
}

export interface GitState {
  isInitialized: boolean;
  commits: Commit[];
  branches: Branch[];
  head: string; // Branch name or commit ID (detached head)
  history: { command: string; output: string; success: boolean }[];
  currentBranch: string;
}

export const INITIAL_STATE: GitState = {
  isInitialized: false,
  commits: [],
  branches: [{ name: "main", targetCommitId: null }],
  head: "main",
  history: [],
  currentBranch: "main",
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export function processCommand(state: GitState, commandLine: string): CommandResult {
  const args = commandLine.trim().split(/\s+/);
  const command = args[0];

  if (!command) {
    return { output: "", success: true, newState: state };
  }

  if (command !== "git" && command !== "help" && command !== "clear") {
    return {
      output: `Command not found: ${command}. Did you mean 'git'? Type 'help' for a list of commands.`,
      success: false,
      newState: state,
    };
  }

  if (command === "clear") {
      return {
          output: "",
          success: true,
          newState: { ...state, history: [] }
      }
  }

  if (command === "help") {
    return {
      output: `
Available commands:
  git init                  - Initialize a new repository
  git clone <url>           - Clone a repository (simulated as init)
  git commit -m "<message>" - Create a new commit
  git branch                - List branches
  git branch <name>         - Create a new branch
  git checkout <name>       - Switch to a branch
  git checkout -b <name>    - Create and switch to a new branch
  git merge <branch>        - Merge a branch into the current branch
  git log                   - Show commit logs
  git status                - Show the working tree status
  git rebase <branch>       - Rebase current branch onto another branch
  git cherry-pick <commit>  - Apply the changes introduced by some existing commits
  clear                     - Clear the terminal screen
  help                      - Show this help message
      `.trim(),
      success: true,
      newState: state,
    };
  }

  // Git commands
  const gitCommand = args[1];

  if (!gitCommand) {
    return {
      output: "Usage: git <command> [<args>]\nType 'help' for more information.",
      success: false,
      newState: state,
    };
  }

  if (!state.isInitialized && gitCommand !== "init" && gitCommand !== "clone") {
    return {
      output: "fatal: not a git repository (or any of the parent directories): .git\nHint: Try 'git init' first.",
      success: false,
      newState: state,
    };
  }

  let newState = { ...state };
  let output = "";
  let success = true;

  switch (gitCommand) {
    case "init":
      if (state.isInitialized) {
        output = "Reinitialized existing Git repository in /project/.git/";
      } else {
        newState.isInitialized = true;
        output = "Initialized empty Git repository in /project/.git/";
      }
      break;

    case "clone":
        if (state.isInitialized) {
            output = "fatal: destination path already exists and is not an empty directory.";
            success = false;
        } else {
            newState.isInitialized = true;
            // Create a fake initial commit from the "remote"
            const commitId = generateId();
            newState.commits = [{
                id: commitId,
                message: "Initial commit",
                parentIds: [],
                branch: "main",
                timestamp: Date.now()
            }];
            newState.branches = [{ name: "main", targetCommitId: commitId }];
            newState.head = "main";
            newState.currentBranch = "main";
            output = `Cloning into '${args[2] || "repo"}'...\ndone.`;
        }
        break;

    case "status":
      output = `On branch ${newState.currentBranch}\nnothing to commit, working tree clean`;
      break;

    case "commit": {
      const messageIndex = args.indexOf("-m");
      if (messageIndex === -1 || !args[messageIndex + 1]) {
        output = "error: switch `m' requires a value\nHint: git commit -m \"your message\"";
        success = false;
        break;
      }

      // Extract message handling quotes
      const messageArgs = args.slice(messageIndex + 1);
      const fullMessage = messageArgs.join(" ").replace(/^["']|["']$/g, '');

      const currentBranchObj = newState.branches.find((b) => b.name === newState.currentBranch);
      const parentId = currentBranchObj ? currentBranchObj.targetCommitId : null;

      const newCommit: Commit = {
        id: generateId(),
        message: fullMessage,
        parentIds: parentId ? [parentId] : [],
        branch: newState.currentBranch,
        timestamp: Date.now(),
      };

      newState.commits = [...newState.commits, newCommit];

      // Update branch target
      newState.branches = newState.branches.map((b) =>
        b.name === newState.currentBranch ? { ...b, targetCommitId: newCommit.id } : b
      );

      output = `[${newState.currentBranch} ${newCommit.id.substring(0, 7)}] ${newCommit.message}`;
      break;
    }

    case "branch": {
      const branchName = args[2];
      if (!branchName) {
        // List branches
        output = newState.branches
          .map((b) => (b.name === newState.currentBranch ? `* ${b.name}` : `  ${b.name}`))
          .join("\n");
      } else {
        // Create branch
        if (newState.branches.some((b) => b.name === branchName)) {
          output = `fatal: A branch named '${branchName}' already exists.`;
          success = false;
        } else {
          const currentCommitId = newState.branches.find((b) => b.name === newState.currentBranch)?.targetCommitId || null;
          newState.branches = [...newState.branches, { name: branchName, targetCommitId: currentCommitId }];
          output = ""; // git branch <name> has no output on success
        }
      }
      break;
    }

    case "checkout": {
      const isCreateAndCheckout = args[2] === "-b";
      const branchName = isCreateAndCheckout ? args[3] : args[2];

      if (!branchName) {
        output = "fatal: missing branch name";
        success = false;
        break;
      }

      const branchExists = newState.branches.some((b) => b.name === branchName);

      if (isCreateAndCheckout) {
        if (branchExists) {
          output = `fatal: A branch named '${branchName}' already exists.`;
          success = false;
        } else {
          const currentCommitId = newState.branches.find((b) => b.name === newState.currentBranch)?.targetCommitId || null;
          newState.branches = [...newState.branches, { name: branchName, targetCommitId: currentCommitId }];
          newState.head = branchName;
          newState.currentBranch = branchName;
          output = `Switched to a new branch '${branchName}'`;
        }
      } else {
        if (!branchExists) {
          // Check if it's a commit ID
          const commitExists = newState.commits.some(c => c.id.startsWith(branchName));
          if (commitExists) {
               const targetCommit = newState.commits.find(c => c.id.startsWith(branchName));
               newState.head = targetCommit!.id;
               newState.currentBranch = `(detached from ${targetCommit!.id.substring(0,7)})`;
               output = `Note: switching to '${branchName}'.\n\nYou are in 'detached HEAD' state.`;
          } else {
              output = `error: pathspec '${branchName}' did not match any file(s) known to git`;
              success = false;
          }
        } else {
          newState.head = branchName;
          newState.currentBranch = branchName;
          output = `Switched to branch '${branchName}'`;
        }
      }
      break;
    }

    case "log": {
        const currentCommitId = newState.head === newState.currentBranch ? 
            newState.branches.find(b => b.name === newState.currentBranch)?.targetCommitId :
            newState.head;
            
        if (!currentCommitId) {
            output = `fatal: your current branch '${newState.currentBranch}' does not have any commits yet`;
            success = false;
            break;
        }

        const logs = [];
        let currId: string | null = currentCommitId;
        
        while (currId) {
            const commit = newState.commits.find(c => c.id === currId);
            if (!commit) break;
            logs.push(`commit ${commit.id}\nDate:   ${new Date(commit.timestamp).toUTCString()}\n\n    ${commit.message}\n`);
            currId = commit.parentIds[0] || null; // Simplified log follows first parent
        }

        output = logs.join('\n');
        break;
    }

    case "merge": {
      const sourceBranchName = args[2];
      if (!sourceBranchName) {
        output = "merge: missing branch name";
        success = false;
        break;
      }

      if (sourceBranchName === newState.currentBranch) {
        output = "Already up to date.";
        break;
      }

      const sourceBranch = newState.branches.find((b) => b.name === sourceBranchName);
      if (!sourceBranch) {
        output = `merge: ${sourceBranchName} - not something we can merge`;
        success = false;
        break;
      }

      const targetBranch = newState.branches.find((b) => b.name === newState.currentBranch);
      
      if (!targetBranch || !targetBranch.targetCommitId) {
           output = `fatal: No commit on ${newState.currentBranch} to merge into.`;
           success = false;
           break;
      }

      if (!sourceBranch.targetCommitId) {
          output = "Already up to date.";
          break;
      }

      // Simplified merge: creates a new merge commit
      const mergeCommit: Commit = {
        id: generateId(),
        message: `Merge branch '${sourceBranchName}' into ${newState.currentBranch}`,
        parentIds: [targetBranch.targetCommitId, sourceBranch.targetCommitId],
        branch: newState.currentBranch,
        timestamp: Date.now(),
      };

      newState.commits = [...newState.commits, mergeCommit];
      
      newState.branches = newState.branches.map((b) =>
        b.name === newState.currentBranch ? { ...b, targetCommitId: mergeCommit.id } : b
      );

      output = `Merge made by the 'recursive' strategy.\n1 file changed, 1 insertion(+)`;
      break;
    }

    case "rebase": {
        const targetBranchName = args[2];
        if (!targetBranchName) {
            output = "fatal: missing target branch";
            success = false;
            break;
        }

        const targetBranch = newState.branches.find(b => b.name === targetBranchName);
        if (!targetBranch) {
            output = `fatal: invalid upstream '${targetBranchName}'`;
            success = false;
            break;
        }
        
        const currentBranchObj = newState.branches.find(b => b.name === newState.currentBranch);
        
        if (!currentBranchObj || !currentBranchObj.targetCommitId) {
            output = "fatal: No commit on current branch to rebase.";
            success = false;
            break;
        }
        if (!targetBranch.targetCommitId) {
             output = "fatal: No commit on target branch.";
             success = false;
             break;
        }

        // Extremely simplified rebase: finding commits unique to current branch and moving them onto target
        // For visualizer purposes, we will just move the commits' parentIds.
        
        let currId: string | null = currentBranchObj.targetCommitId;
        const commitsToRebase: string[] = [];
        // Walk back until we hit the target branch's commit (simplified logic)
        while (currId && currId !== targetBranch.targetCommitId) {
            const commit = newState.commits.find(c => c.id === currId);
            if (!commit) break;
            // Stop if we reach a common ancestor or root. Real logic is much more complex
            if (commit.parentIds.length === 0) break;
            commitsToRebase.unshift(commit.id);
            currId = commit.parentIds[0] || null;
        }

        if (commitsToRebase.length === 0) {
             output = `Current branch ${newState.currentBranch} is up to date.`;
             break;
        }

        let newParentId = targetBranch.targetCommitId;
        const newCommitsList = [...newState.commits];

        for (const commitId of commitsToRebase) {
            const index = newCommitsList.findIndex(c => c.id === commitId);
            if (index !== -1) {
                // Duplicate commit with new ID for rebase
                const rebasedCommit = {
                    ...newCommitsList[index],
                    id: generateId(),
                    parentIds: [newParentId]
                };
                newCommitsList.push(rebasedCommit);
                newParentId = rebasedCommit.id;
            }
        }
        
        newState.commits = newCommitsList;
        newState.branches = newState.branches.map(b => 
            b.name === newState.currentBranch ? { ...b, targetCommitId: newParentId } : b
        );

        output = `Successfully rebased and updated ${newState.currentBranch}.`;
        break;
    }
    
    case "cherry-pick": {
        const targetCommitIdArg = args[2];
        if (!targetCommitIdArg) {
            output = "fatal: missing commit-ish";
            success = false;
            break;
        }

        const targetCommit = newState.commits.find(c => c.id.startsWith(targetCommitIdArg));
        if (!targetCommit) {
             output = `fatal: bad object ${targetCommitIdArg}`;
             success = false;
             break;
        }

        const currentBranchObj = newState.branches.find(b => b.name === newState.currentBranch);
        const parentId = currentBranchObj ? currentBranchObj.targetCommitId : null;

        const newCommit: Commit = {
            id: generateId(),
            message: targetCommit.message,
            parentIds: parentId ? [parentId] : [],
            branch: newState.currentBranch,
            timestamp: Date.now()
        };

        newState.commits = [...newState.commits, newCommit];
        newState.branches = newState.branches.map(b => 
            b.name === newState.currentBranch ? { ...b, targetCommitId: newCommit.id } : b
        );
        
        output = `[${newState.currentBranch} ${newCommit.id.substring(0, 7)}] ${newCommit.message}`;
        break;
    }

    default:
      output = `git: '${gitCommand}' is not a git command. See 'git --help'.\n\nDid you mean one of these?\n    init\n    commit\n    branch\n    checkout\n    merge`;
      success = false;
  }

  return { output, success, newState };
}
