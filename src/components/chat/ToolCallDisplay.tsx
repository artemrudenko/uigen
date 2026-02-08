import type { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

interface ToolCallDisplayProps {
  toolInvocation: ToolInvocation;
}

interface ToolAction {
  inProgress: string;
  completed: string;
}

/** Maps tool name + command to user-friendly action labels */
const TOOL_ACTIONS: Record<string, Record<string, ToolAction>> = {
  str_replace_editor: {
    create: { inProgress: "Creating", completed: "Created" },
    str_replace: { inProgress: "Editing", completed: "Edited" },
    insert: { inProgress: "Editing", completed: "Edited" },
    view: { inProgress: "Reading", completed: "Read" },
  },
  file_manager: {
    rename: { inProgress: "Renaming", completed: "Renamed" },
    delete: { inProgress: "Deleting", completed: "Deleted" },
  },
};

/** Resolves a friendly label from tool invocation args */
function getDisplayInfo(toolInvocation: ToolInvocation): string | null {
  const { toolName, args } = toolInvocation;
  const command = args?.command as string | undefined;
  if (!command) return null;

  const action = TOOL_ACTIONS[toolName]?.[command];
  if (!action) return null;

  const isCompleted = toolInvocation.state === "result";
  const verb = isCompleted ? action.completed : action.inProgress;
  const path = args.path as string | undefined;

  if (!path) return verb;

  // For completed rename, show both paths
  if (isCompleted && toolName === "file_manager" && command === "rename") {
    const newPath = args.new_path as string | undefined;
    return newPath ? `${verb} ${path} → ${newPath}` : `${verb} ${path}`;
  }

  return `${verb} ${path}`;
}

export function ToolCallDisplay({ toolInvocation }: ToolCallDisplayProps) {
  const isCompleted = toolInvocation.state === "result";
  const displayText = getDisplayInfo(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">
        {displayText ?? toolInvocation.toolName}
      </span>
    </div>
  );
}
