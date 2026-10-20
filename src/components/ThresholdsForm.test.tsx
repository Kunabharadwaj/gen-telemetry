import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/lib/schema";
import { server } from "@/test/server";
import { createTestClient, wrapper } from "@/test/utils";
import { ThresholdsForm } from "./ThresholdsForm";

const setup = () => render(<ThresholdsForm values={DEFAULT_THRESHOLDS} />, { wrapper: wrapper(createTestClient()) });

describe("ThresholdsForm", () => {
  it("validates with zod and does not submit invalid data", async () => {
    let posted = false;
    server.use(http.post("/api/thresholds", () => ((posted = true), HttpResponse.json({}))));
    setup();
    const temp = screen.getByLabelText(/max coolant temp/i);
    await userEvent.clear(temp);
    await userEvent.type(temp, "500");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Max coolant temp must be at most 120")).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("shows an error for an empty field", async () => {
    setup();
    await userEvent.clear(screen.getByLabelText(/min fuel/i));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Min fuel must be a number")).toBeInTheDocument();
  });

  it("submits valid values and confirms", async () => {
    let body: unknown;
    server.use(http.post("/api/thresholds", async ({ request }) => HttpResponse.json((body = await request.json()))));
    setup();
    const fuel = screen.getByLabelText(/min fuel/i);
    await userEvent.clear(fuel);
    await userEvent.type(fuel, "20");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Thresholds saved")).toBeInTheDocument();
    expect(body).toEqual({ ...DEFAULT_THRESHOLDS, minFuelPct: 20 });
  });

  it("shows a message when the server rejects the save", async () => {
    server.use(http.post("/api/thresholds", () => new HttpResponse(null, { status: 500 })));
    setup();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/could not save thresholds/i)).toBeInTheDocument();
  });
});
