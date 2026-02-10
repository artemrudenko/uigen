import { test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock "server-only" before importing auth module
vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockCookieStore = { set: mockSet, get: mockGet, delete: mockDelete };

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const mockSign = vi.fn();
const mockSetProtectedHeader = vi.fn(() => ({ setExpirationTime: mockSetExpirationTime }));
const mockSetExpirationTime = vi.fn(() => ({ setIssuedAt: mockSetIssuedAt }));
const mockSetIssuedAt = vi.fn(() => ({ sign: mockSign }));

vi.mock("jose", () => ({
  SignJWT: vi.fn(() => ({
    setProtectedHeader: mockSetProtectedHeader,
  })),
  jwtVerify: vi.fn(),
}));

import { createSession, getSession, deleteSession, verifySession } from "../auth";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const EXPECTED_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- createSession ---

test("createSession signs JWT with correct payload and algorithm", async () => {
  mockSign.mockResolvedValue("mock-token");

  await createSession("user-123", "test@example.com");

  expect(SignJWT).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-123",
      email: "test@example.com",
      expiresAt: expect.any(Date),
    })
  );
  expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
  expect(mockSetIssuedAt).toHaveBeenCalled();
});

test("createSession sets httpOnly cookie with correct options", async () => {
  mockSign.mockResolvedValue("signed-token");

  await createSession("user-123", "test@example.com");

  expect(mockSet).toHaveBeenCalledWith(
    "auth-token",
    "signed-token",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: expect.any(Date),
    })
  );
});

test("createSession sets cookie expiration to 7 days from now", async () => {
  mockSign.mockResolvedValue("token");
  const before = Date.now();

  await createSession("user-123", "test@example.com");

  const cookieOptions = mockSet.mock.calls[0][2];
  const expiresMs = cookieOptions.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Expiration should be ~7 days from now (within 1 second tolerance)
  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(Date.now() + sevenDaysMs + 1000);
});

test("createSession sets secure flag based on NODE_ENV", async () => {
  mockSign.mockResolvedValue("token");

  await createSession("user-123", "test@example.com");

  const cookieOptions = mockSet.mock.calls[0][2];
  // In test environment, NODE_ENV is "test", not "production"
  expect(cookieOptions.secure).toBe(false);
});

// --- getSession ---

test("getSession returns null when no cookie exists", async () => {
  mockGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
  expect(mockGet).toHaveBeenCalledWith("auth-token");
});

test("getSession returns session payload for valid token", async () => {
  const mockPayload = {
    userId: "user-123",
    email: "test@example.com",
    expiresAt: new Date().toISOString(),
  };
  mockGet.mockReturnValue({ value: "valid-token" });
  vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as never);

  const session = await getSession();

  expect(session).toEqual(mockPayload);
  expect(jwtVerify).toHaveBeenCalledWith(
    "valid-token",
    EXPECTED_SECRET
  );
});

test("getSession returns null for invalid/expired token", async () => {
  mockGet.mockReturnValue({ value: "expired-token" });
  vi.mocked(jwtVerify).mockRejectedValue(new Error("token expired"));

  const session = await getSession();

  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth cookie", async () => {
  await deleteSession();

  expect(mockDelete).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns null when request has no auth cookie", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue(undefined) },
  } as unknown as NextRequest;

  const session = await verifySession(request);

  expect(session).toBeNull();
  expect(request.cookies.get).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns session payload for valid request token", async () => {
  const mockPayload = {
    userId: "user-456",
    email: "user@example.com",
    expiresAt: new Date().toISOString(),
  };
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: "request-token" }) },
  } as unknown as NextRequest;
  vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as never);

  const session = await verifySession(request);

  expect(session).toEqual(mockPayload);
  expect(jwtVerify).toHaveBeenCalledWith(
    "request-token",
    EXPECTED_SECRET
  );
});

test("verifySession returns null for invalid request token", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: "bad-token" }) },
  } as unknown as NextRequest;
  vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid signature"));

  const session = await verifySession(request);

  expect(session).toBeNull();
});
