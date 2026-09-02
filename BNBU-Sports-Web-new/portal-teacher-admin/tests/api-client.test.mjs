import assert from "node:assert/strict";
import test from "node:test";

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  },
};

const api = await import("../app/api-client.ts");
const adminService = await import("../app/admin-service.ts");

const authSession = (suffix, role = "TEACHER") => ({
  sessionId: `session-${suffix}`,
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  tokenType: "Bearer",
  accessTokenExpiresAt: "2099-01-01T00:00:00Z",
  refreshTokenExpiresAt: "2099-02-01T00:00:00Z",
  user: {
    id: `user-${suffix}`,
    role,
    status: "ACTIVE",
    version: 3,
  },
});

async function withFetch(fetch, operation) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetch;
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
    api.clearApiSession();
    api.setApiRequestMode("real");
    storage.clear();
  }
}

test("authenticated API base ignores persisted cross-origin overrides", () => {
  storage.set("bnbu-portal-api-base", "https://attacker.example/api/v1");
  assert.equal(api.apiBaseUrl(), "/api/v1");
  storage.clear();
});

test("account recovery injects portal organization context outside the page form", async () => {
  const bodies = [];
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/account-recovery-requests")) {
      bodies.push(JSON.parse(init.body));
      return Response.json({
        data: {
          recoveryId: `recovery-${bodies.length}`,
          expiresAt: "2099-01-01T00:10:00Z",
        },
        meta: {},
      }, { status: 202 });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.requestAccountRecovery({
      account: "teacher@example.edu",
      requestedRole: "TEACHER",
      locale: "zh-CN",
    });
    await api.requestAccountRecovery({
      organizationCode: " current_org ",
      account: "admin@example.edu",
      requestedRole: "ADMIN",
      locale: "en",
    });
  });

  const configuredOrganizationCode = (
    process.env.NEXT_PUBLIC_BNBU_ORGANIZATION_CODE ?? "BNBU"
  ).trim().toUpperCase() || "BNBU";
  assert.deepEqual(bodies, [
    {
      account: "teacher@example.edu",
      requestedRole: "TEACHER",
      locale: "zh-CN",
      organizationCode: configuredOrganizationCode,
      channel: "EMAIL",
    },
    {
      account: "admin@example.edu",
      requestedRole: "ADMIN",
      locale: "en",
      organizationCode: "CURRENT_ORG",
      channel: "EMAIL",
    },
  ]);
});

test("portal persists the complete versioned refresh session", async () => {
  await withFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("persisted"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    const persisted = JSON.parse(storage.get("bnbu-portal-tokens-v1"));
    assert.equal(persisted.schemaVersion, 2);
    assert.equal(persisted.sessionId, "session-persisted");
    assert.equal(persisted.accessTokenExpiresAt, "2099-01-01T00:00:00Z");
    assert.equal(persisted.refreshTokenExpiresAt, "2099-02-01T00:00:00Z");
    assert.equal(persisted.role, "TEACHER");
    assert.equal(api.hasApiSession(), true);
  });
});

test("portal rejects malformed or refresh-expired persisted sessions", () => {
  storage.set("bnbu-portal-tokens-v1", "{not-json");
  assert.equal(api.hasApiSession(), false);
  assert.equal(storage.has("bnbu-portal-tokens-v1"), false);

  storage.set("bnbu-portal-tokens-v1", JSON.stringify({
    schemaVersion: 2,
    sessionId: "expired-session",
    accessToken: "expired-access",
    refreshToken: "expired-refresh",
    accessTokenExpiresAt: "2099-01-01T00:00:00Z",
    refreshTokenExpiresAt: "2000-01-01T00:00:00Z",
    userId: "expired-user",
    role: "TEACHER",
  }));
  assert.equal(api.hasApiSession(), false);
  assert.equal(storage.has("bnbu-portal-tokens-v1"), false);
});

test("temporary portal startup failure preserves the persisted session", async () => {
  await withFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("temporary-failure"), meta: {} });
    }
    if (url.endsWith("/me")) throw new TypeError("synthetic offline");
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    await assert.rejects(
      api.getMe(),
      (error) => error instanceof api.ClientTransportError,
    );
    assert.equal(api.hasApiSession(), true);
    assert.equal(storage.has("bnbu-portal-tokens-v1"), true);
  });
});

test("disabled portal account clears the persisted session", async () => {
  await withFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("disabled-account"), meta: {} });
    }
    if (url.endsWith("/me")) {
      return Response.json(
        { code: "AUTH_ACCOUNT_DISABLED", message: "disabled" },
        { status: 403 },
      );
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    await assert.rejects(
      api.getMe(),
      (error) => error instanceof api.ApiError && error.code === "AUTH_ACCOUNT_DISABLED",
    );
    assert.equal(api.hasApiSession(), false);
    assert.equal(storage.has("bnbu-portal-tokens-v1"), false);
  });
});

test("401 refresh retries a portal mutation with one stable Idempotency-Key", async () => {
  const mutationCalls = [];
  let mutationAttempt = 0;
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("login"), meta: {} });
    }
    if (url.endsWith("/test-mutation")) {
      mutationAttempt += 1;
      mutationCalls.push({
        key: init.headers["Idempotency-Key"],
        authorization: init.headers.Authorization,
      });
      if (mutationAttempt === 1) {
        return Response.json(
          { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
          { status: 401 },
        );
      }
      return Response.json({ data: { ok: true }, meta: {} });
    }
    if (url.endsWith("/auth/refresh")) {
      return Response.json({ data: authSession("refresh"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    const epoch = api.currentApiSessionEpoch();
    assert.deepEqual(
      await api.request("/test-mutation", {
        method: "POST",
        body: { value: 1 },
      }),
      { ok: true },
    );
    assert.equal(api.currentApiSessionEpoch(), epoch);
    assert.equal(mutationCalls.length, 2);
    assert.ok(mutationCalls[0].key);
    assert.equal(mutationCalls[0].key, mutationCalls[1].key);
    assert.equal(mutationCalls[1].authorization, "Bearer access-refresh");
  });
});

test("admin audit queries send date filters to the Backend and collect every download page", async () => {
  const calls = [];
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("admin-audit", "ADMIN"), meta: {} });
    }
    if (url.includes("/audit-logs?")) {
      calls.push({ url, authorization: init.headers.Authorization });
      const cursor = new URL(url, "https://local.invalid").searchParams.get("cursor");
      return Response.json({
        data: [{ id: cursor ? "audit-2" : "audit-1" }],
        meta: {
          pagination: {
            nextCursor: cursor ? null : "next-audit-page",
            hasMore: !cursor,
            limit: 100,
          },
        },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("admin@example.edu", "password");
    const rows = await adminService.listAllAuditLogProjections({
      action: "CLIENT_ERROR_REPORTED",
      occurredAtFrom: "2026-08-25T00:00:00.000Z",
      occurredAtTo: "2026-08-25T23:59:59.999Z",
    });
    assert.deepEqual(rows.map(({ id }) => id), ["audit-1", "audit-2"]);
    assert.equal(calls.length, 2);
    const first = new URL(calls[0].url, "https://local.invalid").searchParams;
    assert.equal(first.get("action"), "CLIENT_ERROR_REPORTED");
    assert.equal(first.get("occurredAtFrom"), "2026-08-25T00:00:00.000Z");
    assert.equal(first.get("occurredAtTo"), "2026-08-25T23:59:59.999Z");
    assert.equal(first.get("limit"), "100");
    assert.equal(new URL(calls[1].url, "https://local.invalid").searchParams.get("cursor"), "next-audit-page");
    assert.equal(calls.every(({ authorization }) => authorization === "Bearer access-admin-audit"), true);
  });
});

test("portal errors post only the closed redacted audit envelope", async () => {
  let report = null;
  const originalConsoleError = globalThis.console.error;
  globalThis.console.error = () => {};
  try {
    await withFetch(async (input, init = {}) => {
      const url = String(input);
      if (url.endsWith("/auth/password-login")) {
        return Response.json({ data: authSession("teacher-error"), meta: {} });
      }
      if (url.endsWith("/audit-logs/client-errors")) {
        report = JSON.parse(init.body);
        return Response.json({ data: { auditLogId: "audit-error", receivedAt: new Date().toISOString() }, meta: {} });
      }
      throw new Error(`Unexpected request: ${url}`);
    }, async () => {
      await api.passwordLogin("teacher@example.edu", "password");
      const error = new api.ApiError(
        503,
        { code: "SYSTEM_DEPENDENCY_UNAVAILABLE", requestId: "request-safe" },
        { method: "GET", route: "/students/secret-id?token=secret" },
      );
      const model = api.toUserFacingError(error, "zh", { log: false });
      api.logSafeClientError(error, model);
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      assert.deepEqual(report, {
        platform: "WEB_TEACHER",
        level: "ERROR",
        errorCode: "SYSTEM_DEPENDENCY_UNAVAILABLE",
        category: "SERVER",
        httpStatus: 503,
        method: "GET",
        route: "/students/:id",
        retryable: true,
        relatedRequestId: "request-safe",
        clientOccurredAt: report.clientOccurredAt,
      });
      assert.equal(Object.hasOwn(report, "message"), false);
      assert.equal(Object.hasOwn(report, "stack"), false);
    });
  } finally {
    globalThis.console.error = originalConsoleError;
  }
});

test("password-free review mode blocks every API request before fetch", async () => {
  let fetchCalls = 0;
  await withFetch(async () => {
    fetchCalls += 1;
    return Response.json({ data: { ok: true }, meta: {} });
  }, async () => {
    api.setApiRequestMode("demo");
    await assert.rejects(
      api.request("/teacher/courses"),
      (error) =>
        error instanceof api.LocalReviewApiBlockedError &&
        error.method === "GET" &&
        error.route === "/teacher/courses",
    );
    assert.equal(fetchCalls, 0);
    assert.equal(api.currentApiRequestMode(), "demo");
  });
});

test("switching to review mode wins an in-flight password login race", async () => {
  let resolveLogin;
  let markLoginStarted;
  const loginStarted = new Promise((resolve) => {
    markLoginStarted = resolve;
  });

  await withFetch(async (input) => {
    const url = String(input);
    if (!url.endsWith("/auth/password-login"))
      throw new Error(`Unexpected request: ${url}`);
    markLoginStarted();
    return new Promise((resolve) => {
      resolveLogin = resolve;
    });
  }, async () => {
    const pendingLogin = api.passwordLogin("teacher@example.edu", "password");
    await loginStarted;
    api.clearApiSession();
    api.setApiRequestMode("demo");
    resolveLogin(Response.json({ data: authSession("late-login"), meta: {} }));
    await assert.rejects(
      pendingLogin,
      (error) => error instanceof api.AuthSessionSupersededError,
    );
    assert.equal(api.hasApiSession(), false);
  });
});

test("a stale terminal response cannot clear a later real login", async () => {
  let resolveStaleRequest;
  let markStaleRequestStarted;
  let currentAuthorization = null;
  const staleRequestStarted = new Promise((resolve) => {
    markStaleRequestStarted = resolve;
  });

  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      const suffix = init.body.includes("second@example.edu")
        ? "second-login"
        : "first-login";
      return Response.json({ data: authSession(suffix), meta: {} });
    }
    if (url.endsWith("/stale-terminal")) {
      markStaleRequestStarted();
      return new Promise((resolve) => {
        resolveStaleRequest = resolve;
      });
    }
    if (url.endsWith("/current-session")) {
      currentAuthorization = init.headers.Authorization;
      return Response.json({ data: { ok: true }, meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("first@example.edu", "password");
    const staleRequest = api.request("/stale-terminal");
    await staleRequestStarted;

    await api.passwordLogin("second@example.edu", "password");
    resolveStaleRequest(Response.json(
      { code: "AUTH_TOKEN_INVALID", message: "stale token" },
      { status: 401 },
    ));

    await assert.rejects(
      staleRequest,
      (error) => error instanceof api.ApiError && error.code === "AUTH_TOKEN_INVALID",
    );
    assert.equal(api.hasApiSession(), true);
    assert.deepEqual(await api.request("/current-session"), { ok: true });
    assert.equal(currentAuthorization, "Bearer access-second-login");
  });
});

test("invalid portal access token is terminal, does not refresh, and clears local auth", async () => {
  let protectedCalls = 0;
  let refreshCalls = 0;
  await withFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("invalid-access-login"), meta: {} });
    }
    if (url.endsWith("/invalid-access")) {
      protectedCalls += 1;
      return Response.json(
        { code: "AUTH_TOKEN_INVALID", message: "invalid", requestId: "req-invalid-access" },
        { status: 401 },
      );
    }
    if (url.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return Response.json({ data: authSession("unexpected-refresh"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    assert.equal(api.hasApiSession(), true);
    await assert.rejects(
      api.request("/invalid-access"),
      (error) => error instanceof api.ApiError &&
        error.code === "AUTH_TOKEN_INVALID" &&
        error.requestId === "req-invalid-access",
    );
    assert.equal(protectedCalls, 1);
    assert.equal(refreshCalls, 0);
    assert.equal(api.hasApiSession(), false);
  });
});

test("ambiguous portal refresh failure keeps the session and reuses its intent key", async () => {
  const refreshKeys = [];
  let refreshCount = 0;
  let protectedCount = 0;
  let finalAuthorization = null;
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("retry-login"), meta: {} });
    }
    if (url.endsWith("/refresh-retry")) {
      protectedCount += 1;
      if (protectedCount <= 2) {
        return Response.json(
          { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
          { status: 401 },
        );
      }
      finalAuthorization = init.headers.Authorization;
      return Response.json({ data: { ok: true }, meta: {} });
    }
    if (url.endsWith("/auth/refresh")) {
      refreshKeys.push(init.headers["Idempotency-Key"]);
      refreshCount += 1;
      if (refreshCount === 1) throw new TypeError("synthetic response loss");
      return Response.json({ data: authSession("retry-success"), meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    await assert.rejects(
      api.request("/refresh-retry"),
      (error) => error instanceof api.ClientTransportError && error.message === "Network request failed",
    );
    assert.equal(api.hasApiSession(), true);
    assert.deepEqual(await api.request("/refresh-retry"), { ok: true });
    assert.equal(refreshKeys.length, 2);
    assert.ok(refreshKeys[0]);
    assert.equal(refreshKeys[0], refreshKeys[1]);
    assert.equal(finalAuthorization, "Bearer access-retry-success");
  });
});

test("terminal portal refresh rejection clears the local session", async () => {
  await withFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      return Response.json({ data: authSession("terminal-login"), meta: {} });
    }
    if (url.endsWith("/terminal-refresh")) {
      return Response.json(
        { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
        { status: 401 },
      );
    }
    if (url.endsWith("/auth/refresh")) {
      return Response.json(
        { code: "AUTH_SESSION_REVOKED", message: "revoked" },
        { status: 401 },
      );
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    await assert.rejects(
      api.request("/terminal-refresh"),
      (error) => error instanceof api.ApiError && error.code === "AUTH_SESSION_REVOKED",
    );
    assert.equal(api.hasApiSession(), false);
  });
});

test("logout wins a portal refresh race without clearing a later session", async () => {
  let resolveRefresh;
  let resolveLogout;
  let markRefreshStarted;
  let markLogoutStarted;
  let loginCount = 0;
  let laterAuthorization = null;
  const refreshStarted = new Promise((resolve) => {
    markRefreshStarted = resolve;
  });
  const logoutStarted = new Promise((resolve) => {
    markLogoutStarted = resolve;
  });
  await withFetch(async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/password-login")) {
      loginCount += 1;
      return Response.json({ data: authSession(loginCount === 1 ? "race-old" : "race-later"), meta: {} });
    }
    if (url.endsWith("/race-read")) {
      return Response.json(
        { code: "AUTH_TOKEN_EXPIRED", message: "expired" },
        { status: 401 },
      );
    }
    if (url.endsWith("/auth/refresh")) {
      markRefreshStarted();
      return new Promise((resolve) => {
        resolveRefresh = () =>
          resolve(Response.json({ data: authSession("race-refresh"), meta: {} }));
      });
    }
    if (url.endsWith("/auth/logout")) {
      markLogoutStarted();
      return new Promise((resolve) => {
        resolveLogout = () => resolve(Response.json({ data: null, meta: {} }));
      });
    }
    if (url.endsWith("/race-after")) {
      laterAuthorization = init.headers.Authorization;
      return Response.json({ data: { ok: true }, meta: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async () => {
    await api.passwordLogin("teacher@example.edu", "password");
    const pendingRead = api.request("/race-read");
    await refreshStarted;
    const pendingLogout = api.logoutApi();
    await logoutStarted;
    assert.equal(api.hasApiSession(), false);
    await api.passwordLogin("later@example.edu", "password");
    resolveRefresh();
    await assert.rejects(pendingRead, /API_SESSION_EPOCH_CHANGED/);
    resolveLogout();
    await pendingLogout;
    assert.equal(api.hasApiSession(), true);
    await api.request("/race-after");
    assert.equal(laterAuthorization, "Bearer access-race-later");
  });
});


test("UserFacingError maps the required HTTP and transport families", () => {
  const cases = [
    [new TypeError("secret network implementation text"), "NETWORK", true],
    [Object.assign(new Error("secret timeout implementation text"), { name: "AbortError" }), "TIMEOUT", true],
    [new api.ApiError(401, { code: "AUTH_REQUIRED", message: "raw 401" }), "AUTHENTICATION", false],
    [new api.ApiError(403, { code: "PERMISSION_DENIED", message: "raw 403" }), "AUTHORIZATION", false],
    [new api.ApiError(409, { code: "CONFLICT_VERSION_MISMATCH", message: "raw 409" }), "CONFLICT", true],
    [new api.ApiError(422, { code: "VALIDATION_FAILED", message: "raw 422" }), "VALIDATION", false],
    [new api.ApiError(429, { code: "AUTH_RATE_LIMITED", message: "raw 429" }), "RATE_LIMIT", true],
    [new api.ApiError(503, { code: "SYSTEM_SERVICE_UNAVAILABLE", message: "raw 503" }), "SERVER", true],
    [new api.ApiError(418, { code: "UNKNOWN", message: "raw unknown" }), "UNKNOWN", false],
  ];
  for (const [error, category, retryable] of cases) {
    const model = api.toUserFacingError(error, "zh", { log: false });
    assert.equal(model.category, category);
    assert.equal(model.retryable, retryable);
    assert.ok(model.title);
    assert.ok(model.message);
    assert.ok(model.action);
  }
  const rawBackend = new api.ApiError(500, { code: "SYSTEM_INTERNAL_ERROR", message: "raw server credential" });
  const rawTransport = new api.ClientTransportError(new TypeError("raw transport credential"));
  assert.equal(rawBackend.message, "Backend request failed");
  assert.equal(rawTransport.message, "Network request failed");
});

test("UserFacingError never exposes raw backend or transport text", () => {
  const secrets = ["stack-secret", "sql-secret", "token-secret", "raw-server-secret"];
  const error = new api.ApiError(500, {
    code: "SYSTEM_INTERNAL_ERROR",
    message: secrets[3],
    details: {
      internalMessage: secrets[0],
      sql: secrets[1],
      accessToken: secrets[2],
    },
    requestId: "req-safe-001",
  });
  const model = api.toUserFacingError(error, "zh", { log: false });
  const rendered = JSON.stringify(model);
  for (const secret of secrets) assert.equal(rendered.includes(secret), false);
  assert.equal(model.requestId, "req-safe-001");
});

test("UserFacingError allowlists field names and replaces backend field messages", () => {
  const error = new api.ApiError(422, {
    code: "VALIDATION_FAILED",
    message: "raw validation detail",
    requestId: "req-fields-001",
    details: {
      fieldErrors: [
        { field: "course.code", message: "database constraint secret" },
        { field: "email@example.edu", message: "email secret" },
      ],
    },
  });
  const model = api.toUserFacingError(error, "en", { log: false });
  assert.deepEqual(model.fieldErrors, [
    { field: "course.code", message: "Check this field and try again." },
    { field: "Related field", message: "Check this field and try again." },
  ]);
  assert.equal(
    api.userFacingFieldError(model, "code", "course.code"),
    "Check this field and try again.",
  );
  assert.equal(JSON.stringify(model).includes("database constraint secret"), false);
});

test("UserFacingError gives review, media and exemption codes safe domain copy", () => {
  const cases = [
    ["REVIEW_INVALID_REASON_REQUIRED", "判定无效时必须选择原因"],
    ["MEDIA_NOT_AVAILABLE", "凭证仍在处理中"],
    ["EXEMPTION_APPLICATION_MEDIA_INVALID", "免测材料不符合"],
    ["PERMISSION_EXEMPTION_REVIEW_SCOPE_DENIED", "无权审核"],
  ];
  for (const [code, expected] of cases) {
    const model = api.toUserFacingError(
      new api.ApiError(422, { code, message: "raw domain secret" }),
      "zh",
      { log: false },
    );
    assert.match(model.message, new RegExp(expected));
    assert.equal(JSON.stringify(model).includes("raw domain secret"), false);
  }
});

test("safe client diagnostics redact dynamic routes and query data", () => {
  const rawRoute = "/class-sections/550e8400-e29b-41d4-a716-446655440000/course-invites/secret@example.edu?account=private@example.edu";
  assert.equal(
    api.safeLogRoute(rawRoute),
    "/class-sections/:id/course-invites/:id",
  );
  assert.equal(
    api.safeLogRoute("/exercise-records/550e8400-e29b-41d4-a716-446655440000/evidence-context?student=secret@example.edu"),
    "/exercise-records/:id/evidence-context",
  );

  const captured = [];
  const originalError = console.error;
  console.error = (...args) => captured.push(args);
  try {
    const error = new api.ApiError(
      409,
      {
        code: "CONFLICT_VERSION_MISMATCH",
        message: "raw backend secret",
        details: { refreshToken: "refresh-secret" },
        requestId: "req-log-001",
      },
      { method: "POST", route: rawRoute },
    );
    api.toUserFacingError(error, "zh");
  } finally {
    console.error = originalError;
  }
  assert.equal(captured.length, 1);
  const logText = JSON.stringify(captured[0]);
  assert.match(logText, /req-log-001/);
  assert.match(logText, /\/class-sections\/:id\/course-invites\/:id/);
  for (const secret of ["550e8400", "private@example.edu", "raw backend secret", "refresh-secret"])
    assert.equal(logText.includes(secret), false);
});

test("transport diagnostics retain only a sanitized request route", () => {
  const captured = [];
  const originalError = console.error;
  console.error = (...args) => captured.push(args);
  try {
    api.toUserFacingError(new api.ClientTransportError(
      new TypeError("private transport implementation text"),
      {
        method: "POST",
        route: "/users/teacher@example.edu?accessToken=secret",
      },
    ), "zh");
  } finally {
    console.error = originalError;
  }
  assert.equal(captured.length, 1);
  const logText = JSON.stringify(captured[0]);
  assert.match(logText, /"method":"POST"/);
  assert.match(logText, /"route":"\/users\/:id"/);
  assert.equal(logText.includes("teacher@example.edu"), false);
  assert.equal(logText.includes("private transport implementation text"), false);
  assert.equal(logText.includes("accessToken"), false);
});
