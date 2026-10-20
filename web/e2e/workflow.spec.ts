import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page, email = "admin@fluxo.example") {
  await page.goto("/");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.FLOW_E2E_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar no Fluxo OS" }).click();
  await expect(
    page.getByRole("heading", { name: /Bom trabalho/ }),
  ).toBeVisible();
}
test("creates a client and equipment, executes a complete service order and preserves delivery", async ({
  page,
}) => {
  await login(page);
  const name = `Cliente E2E ${Date.now()}`;
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("button", { name: "Novo cliente", exact: true }).click();
  await page.getByLabel("Nome completo").fill(name);
  await page.getByLabel("Telefone", { exact: true }).fill("11900001234");
  await page.getByLabel("E-mail (opcional)").fill("teste@example.com");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Equipamentos", exact: true }).click();
  await page.getByRole("button", { name: "Novo equipamento" }).click();
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: name });
  await page.getByLabel("Marca", { exact: true }).fill("Teste");
  await page.getByLabel("Modelo", { exact: true }).fill("Notebook E2E");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("link", { name: "Ordens de serviço", exact: true })
    .click();
  await page.getByRole("button", { name: "Nova ordem", exact: true }).click();
  await page
    .getByLabel("Cliente", { exact: true })
    .selectOption({ label: name });
  await page
    .getByLabel("Equipamento", { exact: true })
    .selectOption({ label: "Teste Notebook E2E" });
  await page.getByLabel("Problema relatado").fill("Não liga");
  await page.getByLabel("Condição na entrada").fill("Carcaça sem danos");
  await page.getByLabel("Acessórios recebidos").fill("Carregador");
  await page
    .getByLabel("Prazo estimado")
    .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await page
    .getByLabel("Técnico responsável")
    .selectOption({ label: "Lucas Almeida" });
  await page.getByRole("button", { name: "Abrir ordem de serviço" }).click();
  await expect(page.getByRole("heading", { name: /OS-/ })).toBeVisible();
  const url = page.url();
  await page.getByRole("button", { name: "Iniciar diagnóstico" }).click();
  await page.getByRole("button", { name: "Registrar diagnóstico" }).click();
  await page
    .getByLabel("Diagnóstico", { exact: true })
    .fill("Falha de alimentação confirmada");
  await page.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("tab", { name: "Orçamentos" }).click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Substituição da fonte");
  await page.getByLabel("Valor unitário").fill("250.50");
  await page.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Enviar para aprovação" }).click();
  await page.getByRole("button", { name: "Registrar aprovação" }).click();
  await page
    .getByLabel("Como a decisão foi recebida?")
    .fill("Cliente aprovou por telefone.");
  await page.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Iniciar manutenção" }).click();
  await page.getByRole("button", { name: "Concluir manutenção" }).click();
  await page
    .getByLabel("Serviço realizado", { exact: true })
    .fill("Fonte substituída e testes realizados");
  await page.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Registrar entrega" }).click();
  await page.getByLabel("Quem retirou o equipamento?").fill(name);
  await page.getByRole("button", { name: "Confirmar e registrar" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto(url);
  await expect(page.locator(".detail-heading")).toContainText("Entregue");
  await page.getByRole("tab", { name: "Histórico", exact: true }).click();
  await expect(page.locator(".timeline")).toContainText(
    "Recebido por: " + name,
  );
  await expect(page.locator(".timeline")).toContainText("Orçamento aprovado");
});
test("technician sees only assigned work and cannot open administration", async ({
  page,
}) => {
  await login(page, "tecnico@fluxo.example");
  await expect(
    page.getByRole("link", { name: "Equipe e acessos" }),
  ).toHaveCount(0);
  await page.goto("/equipe");
  await expect(
    page.getByRole("heading", { name: /Bom trabalho/ }),
  ).toBeVisible();
  const response = await page.request.get("/api/users");
  expect(response.status()).toBe(403);
});
test("mobile navigation works without overflowing the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
