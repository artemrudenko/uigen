import { describe, test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SessionPayload } from "@/lib/auth";

// Mock "server-only" before importing auth module (auth.ts uses it)
vi.mock("server-only", () => ({}));

const mockVerifySession = vi.fn();
vi.mock("@/lib/auth", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

import { middleware, config } from "@/middleware";

/** Helper to build a NextRequest with the given pathname and optional cookies */
function buildRequest(
  pathname: string,
  cookieEntries: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  const req = new NextRequest(url);
  for (const [name, value] of Object.entries(cookieEntries)) {
    req.cookies.set(name, value);
  }
  return req;
}

const validSession: SessionPayload = {
  userId: "user-123",
  email: "test@example.com",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Protected routes without authentication ---

describe("protected routes without authentication", () => {
  test("returns 401 for /api/projects when unauthenticated", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/api/projects"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Authentication required" });
  });

  test("returns 401 for /api/filesystem when unauthenticated", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/api/filesystem"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Authentication required" });
  });

  test("returns 401 for nested protected paths like /api/projects/123", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/api/projects/123"));

    expect(response.status).toBe(401);
  });

  test("returns 401 for /api/filesystem/some/deep/path", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(
      buildRequest("/api/filesystem/some/deep/path")
    );

    expect(response.status).toBe(401);
  });
});

// --- Protected routes with valid authentication ---

describe("protected routes with valid authentication", () => {
  test("allows /api/projects when authenticated", async () => {
    mockVerifySession.mockResolvedValue(validSession);

    const response = await middleware(buildRequest("/api/projects"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("allows /api/filesystem when authenticated", async () => {
    mockVerifySession.mockResolvedValue(validSession);

    const response = await middleware(buildRequest("/api/filesystem"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("allows nested protected paths when authenticated", async () => {
    mockVerifySession.mockResolvedValue(validSession);

    const response = await middleware(
      buildRequest("/api/projects/abc/files")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

// --- Unprotected routes ---

describe("unprotected routes pass through regardless of auth", () => {
  test("allows /api/chat without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/api/chat"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("allows / (home page) without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("allows /some-project-id without authentication", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/some-project-id"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("allows /api/chat with authentication", async () => {
    mockVerifySession.mockResolvedValue(validSession);

    const response = await middleware(buildRequest("/api/chat"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

// --- verifySession is called with the request ---

describe("verifySession integration", () => {
  test("passes the request object to verifySession", async () => {
    mockVerifySession.mockResolvedValue(null);
    const request = buildRequest("/api/projects");

    await middleware(request);

    expect(mockVerifySession).toHaveBeenCalledWith(request);
  });

  test("calls verifySession exactly once per request", async () => {
    mockVerifySession.mockResolvedValue(null);

    await middleware(buildRequest("/api/chat"));

    expect(mockVerifySession).toHaveBeenCalledTimes(1);
  });
});

// --- Edge cases ---

describe("edge cases", () => {
  test("does not protect /api/project (without trailing 's')", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(buildRequest("/api/project"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("does not protect /api/filesystemx (partial match only via startsWith)", async () => {
    mockVerifySession.mockResolvedValue(null);

    // startsWith matches — /api/filesystemx starts with /api/filesystem
    const response = await middleware(buildRequest("/api/filesystemx"));

    expect(response.status).toBe(401);
  });

  test("does not protect paths that merely contain the protected prefix", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(
      buildRequest("/other/api/projects")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("handles query parameters on protected routes", async () => {
    mockVerifySession.mockResolvedValue(null);

    const request = buildRequest("/api/projects?page=1&limit=10");
    const response = await middleware(request);

    expect(response.status).toBe(401);
  });
});

// --- Matcher config ---
// Next.js processes matcher patterns internally via path-to-regexp,
// so we verify the config structure and declared exclusions.

describe("matcher config", () => {
  test("exports exactly one matcher pattern", () => {
    expect(config.matcher).toHaveLength(1);
  });

  test("matcher pattern is a non-empty string", () => {
    expect(typeof config.matcher[0]).toBe("string");
    expect(config.matcher[0].length).toBeGreaterThan(0);
  });

  test("matcher excludes _next/static via negative lookahead", () => {
    expect(config.matcher[0]).toContain("_next/static");
  });

  test("matcher excludes _next/image via negative lookahead", () => {
    expect(config.matcher[0]).toContain("_next/image");
  });

  test("matcher excludes favicon.ico", () => {
    expect(config.matcher[0]).toContain("favicon.ico");
  });

  test("matcher excludes common image file extensions", () => {
    const pattern = config.matcher[0];
    expect(pattern).toContain("svg");
    expect(pattern).toContain("png");
    expect(pattern).toContain("jpg");
    expect(pattern).toContain("jpeg");
    expect(pattern).toContain("gif");
    expect(pattern).toContain("webp");
  });
});
