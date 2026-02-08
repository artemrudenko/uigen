import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallDisplay } from "../ToolCallDisplay";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- str_replace_editor: completed states ---

test("shows 'Created' with path for completed create command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/components/Card.jsx" },
    state: "result",
    result: "File created",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Created/)).toBeDefined();
  expect(screen.getByText(/\/components\/Card\.jsx/)).toBeDefined();
});

test("shows 'Edited' with path for completed str_replace command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-2",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx", old_str: "a", new_str: "b" },
    state: "result",
    result: "Replacement done",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Edited/)).toBeDefined();
  expect(screen.getByText(/\/App\.jsx/)).toBeDefined();
});

test("shows 'Edited' with path for completed insert command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-3",
    toolName: "str_replace_editor",
    args: { command: "insert", path: "/utils/helpers.jsx", insert_line: 5, new_str: "code" },
    state: "result",
    result: "Insert done",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Edited/)).toBeDefined();
  expect(screen.getByText(/\/utils\/helpers\.jsx/)).toBeDefined();
});

test("shows 'Read' with path for completed view command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-4",
    toolName: "str_replace_editor",
    args: { command: "view", path: "/App.jsx" },
    state: "result",
    result: "file content...",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Read/)).toBeDefined();
  expect(screen.getByText(/\/App\.jsx/)).toBeDefined();
});

// --- str_replace_editor: in-progress states ---

test("shows 'Creating' with path for in-progress create command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-5",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/components/Button.jsx" },
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Creating/)).toBeDefined();
  expect(screen.getByText(/\/components\/Button\.jsx/)).toBeDefined();
});

test("shows 'Editing' with path for in-progress str_replace command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-6",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Editing/)).toBeDefined();
  expect(screen.getByText(/\/App\.jsx/)).toBeDefined();
});

test("shows 'Reading' with path for in-progress view command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-7",
    toolName: "str_replace_editor",
    args: { command: "view", path: "/App.jsx" },
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Reading/)).toBeDefined();
  expect(screen.getByText(/\/App\.jsx/)).toBeDefined();
});

// --- file_manager: completed states ---

test("shows 'Renamed' with old and new path for completed rename command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-8",
    toolName: "file_manager",
    args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
    state: "result",
    result: { success: true, message: "Renamed" },
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Renamed/)).toBeDefined();
  expect(screen.getByText(/\/old\.jsx/)).toBeDefined();
  expect(screen.getByText(/\/new\.jsx/)).toBeDefined();
});

test("shows 'Deleted' with path for completed delete command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-9",
    toolName: "file_manager",
    args: { command: "delete", path: "/components/Old.jsx" },
    state: "result",
    result: { success: true, message: "Deleted" },
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Deleted/)).toBeDefined();
  expect(screen.getByText(/\/components\/Old\.jsx/)).toBeDefined();
});

// --- file_manager: in-progress states ---

test("shows 'Renaming' for in-progress rename command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-10",
    toolName: "file_manager",
    args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Renaming/)).toBeDefined();
  expect(screen.getByText(/\/old\.jsx/)).toBeDefined();
});

test("shows 'Deleting' for in-progress delete command", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-11",
    toolName: "file_manager",
    args: { command: "delete", path: "/components/Old.jsx" },
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText(/Deleting/)).toBeDefined();
  expect(screen.getByText(/\/components\/Old\.jsx/)).toBeDefined();
});

// --- Edge cases ---

test("falls back to raw toolName for unknown tool", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-12",
    toolName: "unknown_tool",
    args: { foo: "bar" },
    state: "result",
    result: "ok",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("falls back to raw toolName when args is missing", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-13",
    toolName: "str_replace_editor",
    args: {},
    state: "call",
  };

  render(<ToolCallDisplay toolInvocation={invocation} />);

  expect(screen.getByText("str_replace_editor")).toBeDefined();
});

// --- Visual indicators ---

test("shows green dot for completed invocations", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-14",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "ok",
  };

  const { container } = render(<ToolCallDisplay toolInvocation={invocation} />);

  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).not.toBeNull();
});

test("shows spinner for in-progress invocations", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-15",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };

  const { container } = render(<ToolCallDisplay toolInvocation={invocation} />);

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
});

test("handles partial-call state as in-progress", () => {
  const invocation: ToolInvocation = {
    toolCallId: "tc-16",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "partial-call",
  };

  const { container } = render(<ToolCallDisplay toolInvocation={invocation} />);

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).not.toBeNull();
  expect(screen.getByText(/Creating/)).toBeDefined();
});
