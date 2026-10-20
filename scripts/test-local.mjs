// Executes only against the disposable DB in compose.test.yaml. Never loads .env.
import { spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
const password = "local-test-password-123";
const salt = randomBytes(16).toString("hex");
const env = {
  ...process.env,
  DATABASE_URL:
    "postgres://test:test_local_only@localhost:54329/mi_entreno_test",
  AUTH_USERNAME: "test-owner",
  AUTH_PASSWORD_HASH:
    salt + ":" + scryptSync(password, salt, 64).toString("hex"),
  TEST_PASSWORD: password,
  APP_ORIGIN: "http://localhost:3000",
};
for (const command of [
  "db:migrate",
  "db:seed",
  "test:integration",
  "test:e2e",
]) {
  const result = spawnSync("npm", ["run", command], { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
