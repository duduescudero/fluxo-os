import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("login and dashboard have no detected WCAG A/AA violations and fit mobile width", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Vamos colocar/ }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByLabel("E-mail", { exact: true }).fill("admin@fluxo.example");
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.FLOW_E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar no Fluxo OS" }).click();
  await expect(
    page.getByRole("heading", { name: /Bom trabalho/ }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
