import { test, expect } from "@playwright/test";

test("page matches the committed layout and sends text to the backend", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Agentic Engineering." }),
  ).toBeVisible();
  await expect(page.getByText("Stop with")).toBeVisible();
  await expect(page).toHaveScreenshot("agentic-engineering.png", {
    fullPage: true,
  });

  const message = "Playwright E2E message to Docker log";
  await page
    .getByRole("textbox", { name: /your message to the machine/i })
    .fill(message);
  const sent = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/log") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /send to docker log/i }).click();
  expect((await sent).status()).toBe(204);
  await expect(page.getByRole("status")).toHaveText("Sent to the Docker log.");
  await expect(
    page.getByRole("textbox", { name: /your message to the machine/i }),
  ).toBeEmpty();
});
