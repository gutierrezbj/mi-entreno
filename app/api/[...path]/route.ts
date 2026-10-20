import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { currentUser, login, logout } from "@/lib/auth";
import {
  Conflict,
  getData,
  saveSession,
  saveTemplate,
  deleteTemplate,
} from "@/lib/repository";
import { templateSchema, sessionSchema } from "@/lib/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function body(req: NextRequest) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("CONTENT_TYPE");
  if (Number(req.headers.get("content-length")) > 1_000_000)
    throw new Error("TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError();
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new Error("TOO_LARGE");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function handle(req: NextRequest) {
  const route = req.nextUrl.pathname.slice(5);
  try {
    if (
      req.method !== "GET" &&
      (!process.env.APP_ORIGIN ||
        req.headers.get("origin") !== process.env.APP_ORIGIN)
    )
      return json({ error: "Origen no autorizado" }, 403);
    if (route === "login" && req.method === "POST") {
      const credentials = z
        .object({
          username: z.string().min(1).max(120),
          password: z.string().min(1).max(1024),
        })
        .parse(await body(req));
      const result = await login(credentials.username, credentials.password);
      return json(result, "status" in result ? result.status : 200);
    }
    const user = await currentUser();
    if (!user) return json({ error: "Inicia sesión para sincronizar" }, 401);
    if (route === "logout" && req.method === "POST") {
      await logout();
      return json({ ok: true });
    }
    if (route === "data" && req.method === "GET")
      return json(await getData(user.id));
    if (route === "templates" && ["POST", "PUT"].includes(req.method))
      return json(
        await saveTemplate(
          user.id,
          templateSchema.parse(await body(req)),
          req.method === "POST",
        ),
      );
    if (route.startsWith("templates/") && req.method === "DELETE") {
      await deleteTemplate(user.id, z.uuid().parse(route.slice(10)));
      return json({ ok: true });
    }
    if (route === "sessions" && req.method === "POST")
      return json(
        await saveSession(user.id, sessionSchema.parse(await body(req))),
      );
    return json({ error: "Ruta no disponible" }, 404);
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        { error: error.issues[0]?.message ?? "Datos no válidos" },
        400,
      );
    if (error instanceof SyntaxError)
      return json({ error: "JSON no válido" }, 400);
    if (error instanceof Conflict) return json({ error: error.message }, 409);
    if (error instanceof Error && error.message === "TOO_LARGE")
      return json({ error: "Registro demasiado grande" }, 413);
    if (error instanceof Error && error.message === "CONTENT_TYPE")
      return json({ error: "Se requiere JSON" }, 415);
    // No payloads, credentials or health data in production logs.
    return json(
      {
        error:
          "No se pudo acceder al servidor. Tus datos locales se conservan.",
      },
      503,
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
