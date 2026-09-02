const fs = require("fs");
const http = require("http");
const path = require("path");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4174);
const apiHost = process.env.API_HOST || "127.0.0.1";
const apiPort = Number(process.env.API_PORT || 3000);
const minioHost = process.env.MINIO_HOST || "127.0.0.1";
const minioPort = Number(process.env.MINIO_PORT || 9000);
const minioPublicAuthority = process.env.MINIO_PUBLIC_AUTHORITY || `127.0.0.1:${minioPort}`;
const root = __dirname;
const publicAppEnvironments = new Set([
  "local",
  "test",
  "development",
  "staging",
  "production",
  "qa",
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mjs": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon",
};

const securityHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://127.0.0.1:8080 http://localhost:8080 https:; form-action 'self'; worker-src 'none'",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...securityHeaders, ...headers });
  response.end(body);
}

/**
 * The browser receives only this single-field allowlist. No other process
 * environment value can cross the HTTP boundary.
 */
function publicRuntimeConfig(environment = process.env) {
  const candidate = String(environment.APP_ENV || "").trim().toLowerCase();
  const appEnv = publicAppEnvironments.has(candidate) ? candidate : "unknown";
  return Object.freeze({ appEnv });
}

function runtimeConfigScript(environment = process.env) {
  const serialized = JSON.stringify(publicRuntimeConfig(environment));
  return `Object.defineProperty(globalThis,"__BNBU_PUBLIC_CONFIG__",{value:Object.freeze(${serialized}),writable:false,configurable:false,enumerable:false});\n`;
}

function handleRuntimeConfig(request, response, environment = process.env) {
  const url = new URL(request.url, `http://${host}:${port}`);
  if (url.pathname !== "/runtime-config.js") return false;
  if (!['GET', 'HEAD'].includes(request.method)) {
    send(response, 405, "Method Not Allowed", {
      Allow: "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    return true;
  }
  const body = runtimeConfigScript(environment);
  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(request.method === "HEAD" ? "" : body);
  return true;
}

function resolveFile(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  if (pathname.includes("\0")) return null;
  const relativePath = pathname === "/" ? "index.html" : `.${pathname}`;
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) return null;
  return filePath;
}

// Same-origin proxies so the preview page can reach the local unified backend
// (`/api/*` → NestJS :3000) and its private object storage (`/minio/*` →
// MinIO, preserving the public authority used to sign the object URL). This sidesteps
// browser sandboxes/CORS: the page only ever talks to its own origin.
const proxyTargets = [
  { prefix: "/api/", host: apiHost, port: apiPort, strip: "" },
  { prefix: "/minio/", host: minioHost, port: minioPort, authority: minioPublicAuthority, strip: "/minio" },
];

function tryProxy(request, response) {
  const target = proxyTargets.find((t) => request.url.startsWith(t.prefix));
  if (!target) return false;
  const upstreamPath = target.strip ? request.url.slice(target.strip.length) : request.url;
  const headers = { ...request.headers, host: target.authority || `${target.host}:${target.port}` };
  const upstream = http.request(
    { host: target.host, port: target.port, method: request.method, path: upstreamPath, headers },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );
  upstream.on("error", () => {
    send(response, 502, JSON.stringify({ code: "UPSTREAM_UNAVAILABLE", message: "Backend service is not reachable.", details: {}, requestId: "proxy", timestamp: new Date().toISOString() }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  });
  request.pipe(upstream);
  return true;
}

const server = http.createServer((request, response) => {
  if (tryProxy(request, response)) return;
  if (handleRuntimeConfig(request, response)) return;

  if (!["GET", "HEAD"].includes(request.method)) {
    send(response, 405, "Method Not Allowed", {
      Allow: "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  const requestUrl = new URL(request.url, `http://${host}:${port}`);
  if (requestUrl.pathname === "/") {
    send(response, 302, "", {
      Location: "/student/",
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  const filePath = resolveFile(request.url);
  if (!filePath) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  function serveFile(targetPath) {
    fs.stat(targetPath, (statError, stat) => {
      if (statError) {
        send(response, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }

      // Directory requests like /student/ → serve index.html
      if (stat.isDirectory()) {
        serveFile(path.join(targetPath, "index.html"));
        return;
      }

      if (!stat.isFile()) {
        send(response, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
        return;
      }

      const type = contentTypes[path.extname(targetPath).toLowerCase()] || "application/octet-stream";
      response.writeHead(200, {
        ...securityHeaders,
        "Content-Type": type,
        "Content-Length": stat.size,
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      fs.createReadStream(targetPath)
        .on("error", () => send(response, 500, "Internal Server Error", { "Content-Type": "text/plain; charset=utf-8" }))
        .pipe(response);
    });
  }

  serveFile(filePath);
});

server.requestTimeout = 10000;
server.headersTimeout = 12000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 64;

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`BNBU Web student preview listening at http://${host}:${port}/student/`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`端口 ${port} 已被占用。请先关闭旧预览服务，或换端口启动：`);
      console.error(`  Windows: netstat -ano | findstr :${port}`);
      console.error(`  然后: taskkill /PID <pid> /F`);
      console.error(`  或: set PORT=4175 && npm run preview`);
      process.exit(1);
    }
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  handleRuntimeConfig,
  publicRuntimeConfig,
  runtimeConfigScript,
  securityHeaders,
};
