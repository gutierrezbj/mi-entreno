import { test, expect } from "@playwright/test";
const testOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";
test("private mobile flow: edit, train, recover, offline save, idempotent sync and history", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/login/);
  await page
    .getByLabel("Usuario", { exact: true })
    .fill(process.env.AUTH_USERNAME ?? "test-owner");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.TEST_PASSWORD ?? "local-test-password-123");
  await page.getByRole("button", { name: "Entrar a mi espacio" }).click();
  await expect(
    page.getByRole("heading", { name: "Mis rutinas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Comenzar sesión" }),
  ).toBeVisible();
  const firstBlock = page.locator("details.plan-block").first();
  await expect(firstBlock.locator(".superset-card")).toHaveCount(4);
  const firstPair = firstBlock.getByRole("region", {
    name: "Superset 1",
    exact: true,
  });
  await expect(firstPair.getByText("Air Bike", { exact: true })).toBeVisible();
  await expect(firstPair.getByText("Burpees", { exact: true })).toBeVisible();
  await expect(firstPair.getByText("Máquina", { exact: true })).toBeVisible();
  await expect(
    firstPair.getByText("Peso corporal", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar rutina", exact: true })
    .click();
  await expect(page.getByLabel("Tipo 1.1", { exact: true })).toHaveValue(
    "machine",
  );
  await expect(page.getByLabel("Tipo 1.2", { exact: true })).toHaveValue(
    "bodyweight",
  );
  await page.getByLabel("Tipo 1.2", { exact: true }).selectOption("weighted");
  await page.getByLabel("Objetivo 1.1", { exact: true }).fill("425");
  await page
    .getByRole("button", { name: "Guardar rutina", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Comenzar sesión" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Comenzar sesión" }).click();
  const workoutPair = page.getByRole("region", {
    name: "Superset 1 ronda 1",
    exact: true,
  });
  await expect(
    workoutPair.getByText("Air Bike", { exact: true }),
  ).toBeVisible();
  await expect(workoutPair.getByText("Burpees", { exact: true })).toBeVisible();
  await expect(
    workoutPair.getByText("Con carga", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Real Air Bike ronda 1", { exact: true }).fill("220");
  await page
    .getByLabel("Estado Air Bike ronda 1", { exact: true })
    .selectOption("partial");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const paused = await page.getByTestId("timer").innerText();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("timer")).toHaveText(paused);
  await page.reload();
  await expect(
    page.getByLabel("Real Air Bike ronda 1", { exact: true }),
  ).toHaveValue("220");
  await expect(
    page.getByRole("button", { name: "Reanudar", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reanudar", exact: true }).click();
  await page
    .getByLabel("Cómo ha ido", { exact: true })
    .fill("Prueba móvil: ronda parcial");
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Finalizar y guardar parcial" })
    .click();
  await expect(
    page.getByText("Pendiente de sincronizar", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByText("Pendiente de sincronizar", { exact: true }),
  ).toHaveCount(0, { timeout: 20000 });
  const response = await page.request.get("/api/data");
  const data = await response.json();
  const sessions = data.sessions.filter(
    (s: { notes: string }) => s.notes === "Prueba móvil: ronda parcial",
  );
  expect(sessions).toHaveLength(1);
  const saved = sessions[0];
  expect(saved.status).toBe("partial");
  expect(saved.results[0].actual).toBe(220);
  expect(saved.template.blocks[0].exercises[0].target).toBe(425);
  expect(saved.template.blocks[0].exercises[1].equipment).toBe("weighted");
  expect(saved.template.blocks[0].exercises[0].supersetId).toBe(
    saved.template.blocks[0].exercises[1].supersetId,
  );
  const retry = await page.request.post("/api/sessions", {
    headers: { Origin: testOrigin },
    data: saved,
  });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).duplicate).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  const card = page
    .locator("details.history")
    .filter({ hasText: "registro anotado" })
    .first();
  await card.locator("summary").click();
  await expect(card.getByText("220 m", { exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/mobile-history.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Rutinas", exact: true }).click();
  await page.screenshot({
    path: "test-results/mobile-routine.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Editar rutina", exact: true })
    .click();
  await page.getByLabel("Objetivo 1.1", { exact: true }).fill("450");
  await page
    .getByRole("button", { name: "Guardar rutina", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Comenzar sesión" }),
  ).toBeVisible();
  const after = await (await page.request.get("/api/data")).json();
  expect(
    after.sessions.find((s: { id: string }) => s.id === saved.id).template
      .blocks[0].exercises[0].target,
  ).toBe(425);
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await expect(page).toHaveURL(/login/);
});
test("API refuses anonymous and cross-origin writes and does not cache private data", async ({
  request,
}) => {
  const data = await request.get("/api/data");
  expect(data.status()).toBe(401);
  expect(data.headers()["cache-control"]).toBe("no-store");
  expect(
    (
      await request.post("/api/sessions", {
        headers: { Origin: "https://attacker.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/login", {
        headers: { Origin: testOrigin },
        data: { username: "no", password: "wrong" },
      })
    ).status(),
  ).toBe(401);
});
