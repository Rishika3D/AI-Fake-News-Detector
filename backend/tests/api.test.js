// Integration tests for the Express API.
// DB and ML service are mocked so tests are fast and self-contained.

import { jest, describe, test, expect, beforeAll, beforeEach } from "@jest/globals";
import express from "express";
import request from "supertest";

// ── mocks ────────────────────────────────────────────────────────────────────
// jest.unstable_mockModule must be called before any dynamic import()

jest.unstable_mockModule("../db/db.js", () => ({
  default: {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
  },
}));

jest.unstable_mockModule("../workers/analyzeWorker.js", () => ({
  startWorker: jest.fn(),
}));

// ── helpers ───────────────────────────────────────────────────────────────────
let app;
let db;

beforeAll(async () => {
  // Dynamic imports happen after mocks are registered
  const dbMod       = await import("../db/db.js");
  const routesMod   = await import("../routes/analyzeRoutes.js");
  const authMod     = await import("../routes/userRoutes.js");

  db = dbMod.default;

  app = express();
  app.use(express.json());
  app.use("/api/analyze", routesMod.default);
  app.use("/api/auth",    authMod.default);
});

beforeEach(() => jest.clearAllMocks());

// ── POST /api/analyze/url ─────────────────────────────────────────────────────
describe("POST /api/analyze/url", () => {
  test("returns 400 for missing URL", async () => {
    const res = await request(app).post("/api/analyze/url").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("returns 400 for invalid URL", async () => {
    const res = await request(app)
      .post("/api/analyze/url")
      .send({ url: "not-a-url" });
    expect(res.status).toBe(400);
  });

  test("returns 400 for ftp:// URL", async () => {
    const res = await request(app)
      .post("/api/analyze/url")
      .send({ url: "ftp://example.com" });
    expect(res.status).toBe(400);
  });

  test("queues job and returns 202 + jobId for valid URL", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: "test-uuid-1234" }] });

    const res = await request(app)
      .post("/api/analyze/url")
      .send({ url: "https://bbc.com/article/123" });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBe("test-uuid-1234");
  });

  test("returns 500 when DB insert fails", async () => {
    db.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app)
      .post("/api/analyze/url")
      .send({ url: "https://bbc.com/article/123" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/queue/i);
  });
});

// ── GET /api/analyze/jobs/:jobId ──────────────────────────────────────────────
describe("GET /api/analyze/jobs/:jobId", () => {
  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

  test("returns 400 for malformed job ID", async () => {
    const res = await request(app).get("/api/analyze/jobs/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test("returns 404 when job not found", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get(`/api/analyze/jobs/${VALID_UUID}`);
    expect(res.status).toBe(404);
  });

  test("returns pending status correctly", async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: VALID_UUID, status: "pending", result: null, error_message: null, created_at: new Date() }],
    });

    const res = await request(app).get(`/api/analyze/jobs/${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
  });

  test("returns done status with result", async () => {
    const fakeResult = { label: "TRUSTED", confidence: "88.0%" };
    db.query.mockResolvedValueOnce({
      rows: [{
        id: VALID_UUID,
        status: "done",
        result: fakeResult,
        error_message: null,
        created_at: new Date(),
      }],
    });

    const res = await request(app).get(`/api/analyze/jobs/${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("done");
    expect(res.body.data).toEqual(fakeResult);
  });
});

// ── GET /api/analyze/history ──────────────────────────────────────────────────
describe("GET /api/analyze/history", () => {
  test("returns history rows", async () => {
    const fakeRows = [
      { id: 1, url: "https://bbc.com", label: "TRUSTED", confidence: 88, created_at: new Date() },
    ];
    db.query.mockResolvedValueOnce({ rows: fakeRows });

    const res = await request(app).get("/api/analyze/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].label).toBe("TRUSTED");
  });

  test("returns 500 on DB error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app).get("/api/analyze/history");
    expect(res.status).toBe(500);
  });
});
