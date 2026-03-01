// Unit tests for the URL validation middleware.
// These are pure function tests — no DB or network required.

import { jest, describe, test, expect } from "@jest/globals";
import { validateUrl } from "../middleware/validate.js";

function makeReqRes(body = {}) {
  const req = { body };
  const res = {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data)   { this._json = data;  return this; },
  };
  return { req, res };
}

describe("validateUrl middleware", () => {
  test("passes a valid http URL", () => {
    const { req, res } = makeReqRes({ url: "http://bbc.com/article" });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("passes a valid https URL", () => {
    const { req, res } = makeReqRes({ url: "https://reuters.com/story" });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test("rejects missing URL", () => {
    const { req, res } = makeReqRes({});
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/required/i);
  });

  test("rejects empty string", () => {
    const { req, res } = makeReqRes({ url: "   " });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test("rejects non-string URL", () => {
    const { req, res } = makeReqRes({ url: 12345 });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test("rejects malformed URL", () => {
    const { req, res } = makeReqRes({ url: "not a url" });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/invalid url/i);
  });

  test("rejects ftp:// protocol", () => {
    const { req, res } = makeReqRes({ url: "ftp://files.example.com" });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/http/i);
  });

  test("rejects URLs longer than 2048 chars", () => {
    const { req, res } = makeReqRes({ url: "https://example.com/" + "a".repeat(2100) });
    const next = jest.fn();
    validateUrl(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/too long/i);
  });
});
