const assert = require("node:assert/strict");
const vm = require("node:vm");

const {
  handleRuntimeConfig,
  publicRuntimeConfig,
  runtimeConfigScript,
} = require("./preview-server.cjs");

function responseCapture() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
    },
  };
}

assert.deepEqual(publicRuntimeConfig({ APP_ENV: "local" }), { appEnv: "local" });
assert.deepEqual(publicRuntimeConfig({ APP_ENV: "test" }), { appEnv: "test" });
assert.deepEqual(publicRuntimeConfig({ APP_ENV: "staging" }), { appEnv: "staging" });
assert.deepEqual(publicRuntimeConfig({ APP_ENV: "qa" }), { appEnv: "qa" });
assert.deepEqual(publicRuntimeConfig({ APP_ENV: "production" }), { appEnv: "production" });
assert.deepEqual(publicRuntimeConfig({ APP_ENV: "unexpected" }), { appEnv: "unknown" });
assert.deepEqual(publicRuntimeConfig({}), { appEnv: "unknown" });

const secretEnvironment = {
  APP_ENV: "local",
  PRIVATE_FLAG: "must-not-appear",
  ACCESS_TOKEN: "must-not-appear",
  DATABASE_URL: "postgresql://must-not-appear",
  OTP: "123456",
};
const script = runtimeConfigScript(secretEnvironment);
assert.deepEqual(Object.keys(publicRuntimeConfig(secretEnvironment)), ["appEnv"]);
assert.doesNotMatch(script, /must-not-appear|123456|DATABASE_URL|ACCESS_TOKEN|OTP|PRIVATE_FLAG/);
const context = {};
vm.runInNewContext(script, context);
assert.equal(context.__BNBU_PUBLIC_CONFIG__.appEnv, "local");
assert.equal(Object.isFrozen(context.__BNBU_PUBLIC_CONFIG__), true);

const getResponse = responseCapture();
assert.equal(
  handleRuntimeConfig(
    { method: "GET", url: "/runtime-config.js?cache-bust=1" },
    getResponse,
    secretEnvironment,
  ),
  true,
);
assert.equal(getResponse.status, 200);
assert.equal(getResponse.headers["Cache-Control"], "no-store");
assert.equal(getResponse.headers["Content-Type"], "text/javascript; charset=utf-8");
assert.match(getResponse.headers["Content-Security-Policy"], /script-src 'self'/);
assert.match(getResponse.headers["Content-Security-Policy"], /media-src 'self' blob:/);
assert.equal(getResponse.body, script);

const headResponse = responseCapture();
handleRuntimeConfig(
  { method: "HEAD", url: "/runtime-config.js" },
  headResponse,
  secretEnvironment,
);
assert.equal(headResponse.status, 200);
assert.equal(headResponse.body, "");
assert.equal(headResponse.headers["Content-Length"], Buffer.byteLength(script));

const postResponse = responseCapture();
handleRuntimeConfig(
  { method: "POST", url: "/runtime-config.js" },
  postResponse,
  secretEnvironment,
);
assert.equal(postResponse.status, 405);
assert.equal(postResponse.headers.Allow, "GET, HEAD");
assert.equal(postResponse.headers["Cache-Control"], "no-store");

assert.equal(
  handleRuntimeConfig(
    { method: "GET", url: "/student/" },
    responseCapture(),
    secretEnvironment,
  ),
  false,
);

console.log("preview runtime config checks passed");
