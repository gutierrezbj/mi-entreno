import { randomBytes, scryptSync } from "node:crypto";
import { Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
const silent = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});
process.stdout.write("Contraseña (mínimo 12 caracteres; entrada oculta): ");
const rl = createInterface({
  input: process.stdin,
  output: silent,
  terminal: true,
});
const password = await rl.question("");
rl.close();
process.stdout.write("\n");
if (password.length < 12) throw new Error("Mínimo 12 caracteres");
const salt = randomBytes(16).toString("hex");
console.log(
  "AUTH_PASSWORD_HASH=" +
    salt +
    ":" +
    scryptSync(password, salt, 64).toString("hex"),
);
