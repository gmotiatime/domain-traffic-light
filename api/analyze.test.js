import { describe, expect, test, vi } from "vitest";

import handler from "./analyze.mjs";

function createMockResponse() {
  const response = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader: vi.fn((key, value) => {
      response.headers[key] = value;
    }),
    status: vi.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: vi.fn((body) => {
      response.body = body;
      return response;
    }),
    end: vi.fn(),
  };

  return response;
}

describe("api/analyze", () => {
  test("returns zod issues when the request payload is invalid", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { input: "example.com", skipCache: "yes" },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({
      error: "Ошибка валидации входных данных",
    });
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["skipCache"],
        }),
      ]),
    );
  });
});
