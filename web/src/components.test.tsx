import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Badge, Empty, ErrorBox, Pagination } from "./components";
import { money, late, number } from "./format";
describe("information and navigation", () => {
  it("identifies status using text rather than color alone", () => {
    render(<Badge status="AwaitingApproval" />);
    expect(screen.getByText("Aguardando aprovação")).toBeVisible();
  });
  it("presents an actionable error", () => {
    render(<ErrorBox error={new Error("Atualize antes de salvar.")} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Atualize antes de salvar.",
    );
  });
  it("explains an empty state", () => {
    render(
      <Empty title="Nenhuma ordem encontrada" text="Ajuste os filtros." />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent(
      "Nenhuma ordem encontrada",
    );
    expect(screen.getByText("Ajuste os filtros.")).toBeVisible();
  });
  it("prevents paging outside the result set", () => {
    const change = vi.fn();
    render(<Pagination page={1} total={15} size={10} onPage={change} />);
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(change).toHaveBeenCalledWith(2);
  });
  it("uses Brazilian currency and legible order numbers", () => {
    expect(money(1234.56)).toContain("1.234,56");
    expect(number(7)).toBe("OS-0007");
  });
  it("does not show delivered or cancelled work as overdue", () => {
    expect(late({ dueAt: "2020-01-01", status: "Delivered" })).toBe(false);
    expect(late({ dueAt: "2020-01-01", status: "Cancelled" })).toBe(false);
    expect(late({ dueAt: "2020-01-01", status: "Repairing" })).toBe(true);
  });
});
