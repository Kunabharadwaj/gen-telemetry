import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { initialGenerators } from "@/lib/simulator";
import { server } from "@/test/server";
import { FakeSocket, createTestClient, wrapper } from "@/test/utils";
import { Dashboard } from "./Dashboard";

function renderDashboard(socket = new FakeSocket(), props = {}) {
  render(<Dashboard createSocket={() => socket} {...props} />, { wrapper: wrapper(createTestClient()) });
  return socket;
}

describe("Dashboard", () => {
  it("shows a skeleton while loading, then the generators", async () => {
    renderDashboard();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(await screen.findAllByTestId("generator-card")).toHaveLength(4);
    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
  });

  it("shows an error with retry when the API fails, and recovers", async () => {
    server.use(http.get("/api/generators", () => new HttpResponse(null, { status: 500 })));
    renderDashboard();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn.t load generators/i);
    expect(alert).toHaveTextContent("Request failed (500)");

    server.resetHandlers();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(await screen.findAllByTestId("generator-card")).toHaveLength(4);
  });

  it("reflects connection state and applies live updates", async () => {
    const socket = renderDashboard();
    await screen.findAllByTestId("generator-card");
    expect(screen.getByTestId("connection-status")).toHaveTextContent("Connecting");

    act(() => socket.open());
    expect(screen.getByTestId("connection-status")).toHaveTextContent("Live");

    const g = initialGenerators(Date.now())[0];
    act(() => socket.emit({ type: "telemetry", data: { ...g, outputKw: 555, updatedAt: Date.now() } }));
    expect(within(screen.getByRole("article", { name: g.name })).getByText("555")).toBeInTheDocument();
  });

  it("shows a reconnecting banner with last known values when the socket drops", async () => {
    const socket = renderDashboard();
    await screen.findAllByTestId("generator-card");
    act(() => socket.open());
    act(() => socket.drop());
    expect(screen.getByTestId("connection-status")).toHaveTextContent(/Reconnecting \(attempt 1\/5/);
    expect(screen.getByRole("alert")).toHaveTextContent(/showing last known values/i);
    expect(screen.getAllByTestId("generator-card")).toHaveLength(4);
  });

  it("shows alert chips from thresholds", async () => {
    renderDashboard();
    const broome = await screen.findByRole("article", { name: "Broome Pumping" });
    expect(within(broome).getByText("Low fuel")).toBeInTheDocument();
  });
});
