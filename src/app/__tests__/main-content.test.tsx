import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock all the child components to isolate MainContent behavior
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div data-testid="fs-provider">{children}</div>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div data-testid="chat-provider">{children}</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizableHandle: () => <div data-testid="resizable-handle" />,
  ResizablePanel: ({ children }: any) => <div data-testid="resizable-panel">{children}</div>,
  ResizablePanelGroup: ({ children }: any) => <div data-testid="resizable-panel-group">{children}</div>,
}));

test("MainContent renders with Preview tab active by default", () => {
  render(<MainContent />);

  // Check that Preview tab exists
  const previewTab = screen.getByRole("tab", { name: /preview/i });
  expect(previewTab).toBeDefined();
  expect(previewTab.getAttribute("data-state")).toBe("active");

  // Check that Code tab exists but is not active
  const codeTab = screen.getByRole("tab", { name: /code/i });
  expect(codeTab).toBeDefined();
  expect(codeTab.getAttribute("data-state")).toBe("inactive");

  // Check that preview frame is rendered
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Check that code editor is NOT rendered (since preview is active)
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("Clicking Code tab switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Initially on preview
  expect(screen.getByRole("tab", { name: /preview/i }).getAttribute("data-state")).toBe("active");
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Click Code tab
  const codeTab = screen.getByRole("tab", { name: /code/i });
  await user.click(codeTab);

  // Verify Code tab is now active
  expect(codeTab.getAttribute("data-state")).toBe("active");
  expect(screen.getByRole("tab", { name: /preview/i }).getAttribute("data-state")).toBe("inactive");

  // Verify code editor is now rendered
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.getByTestId("file-tree")).toBeDefined();

  // Verify preview frame is NOT rendered
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("Clicking Preview tab after being on Code view switches back to preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  // Click Code tab first
  const codeTab = screen.getByRole("tab", { name: /code/i });
  await user.click(codeTab);

  // Verify we're on code view
  expect(codeTab.getAttribute("data-state")).toBe("active");
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Click Preview tab
  const previewTab = screen.getByRole("tab", { name: /preview/i });
  await user.click(previewTab);

  // Verify Preview tab is now active
  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");

  // Verify preview frame is rendered
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Verify code editor is NOT rendered
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("Multiple rapid clicks on tabs work correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: /preview/i });
  const codeTab = screen.getByRole("tab", { name: /code/i });

  // Rapidly click between tabs
  await user.click(codeTab);
  await user.click(previewTab);
  await user.click(codeTab);
  await user.click(previewTab);
  await user.click(codeTab);

  // Should end up on Code view
  expect(codeTab.getAttribute("data-state")).toBe("active");
  expect(previewTab.getAttribute("data-state")).toBe("inactive");
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("Active tab has visible styling differences from inactive tab", () => {
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: /preview/i });
  const codeTab = screen.getByRole("tab", { name: /code/i });

  // Check that data-state attributes are properly set for discoverability
  expect(previewTab.getAttribute("data-state")).toBe("active");
  expect(codeTab.getAttribute("data-state")).toBe("inactive");

  // Check that both tabs have the appropriate classes for visual distinction
  // Active tab should have white background classes
  expect(previewTab.className).toContain("data-[state=active]:bg-white");
  expect(previewTab.className).toContain("data-[state=active]:text-neutral-900");
  expect(previewTab.className).toContain("data-[state=active]:shadow-sm");

  // Inactive tab should have neutral text
  expect(codeTab.className).toContain("text-neutral-600");
});
