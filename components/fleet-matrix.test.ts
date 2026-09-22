import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ScanResult } from "@/lib/types";
import type { FleetMatrix } from "./types";

const bakedDir = path.join(import.meta.dirname, "..", "public", "baked");
const read = <T,>(file: string): T => JSON.parse(readFileSync(path.join(bakedDir, file), "utf8"));

const matrix = read<FleetMatrix>("matrix.json");
const index = read<Array<{ id: string; name: string; chars: number }>>(
  path.join("..", "policies", "index.json"),
);

describe("the baked fleet ledger", () => {
  it("carries every ship in the fleet", () => {
    expect(matrix.ships.map((ship) => ship.id).sort()).toEqual(index.map((e) => e.id).sort());
  });

  it("is ordered worst first", () => {
    const values = matrix.ships.map((ship) => ship.score.value);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  // A stale bake is the failure mode this file exists for: re-run `pnpm bake`
  // whenever the rulebook, the lexicon or the score changes.
  it.each(matrix.ships.map((ship) => ship.id))("%s matches its baked scan", (id) => {
    const ship = matrix.ships.find((entry) => entry.id === id)!;
    const result = read<ScanResult>(`${id}.json`);

    expect(result.score).toEqual(ship.score);
    expect(result.flags.length).toBe(ship.flagCount);
    expect(Object.keys(ship.counts).sort()).toEqual(matrix.columns.map((c) => c.id).sort());

    for (const column of matrix.columns) {
      const found = result.flags.filter((flag) => flag.category === column.id).length;
      expect(ship.counts[column.id]).toBe(found);
    }
  });

  it("never ships a flag without a verbatim quote", () => {
    for (const ship of matrix.ships) {
      for (const flag of read<ScanResult>(`${ship.id}.json`).flags) {
        expect(flag.quote.length).toBeGreaterThan(0);
        expect(flag.end - flag.start).toBe(flag.quote.length);
      }
    }
  });
});
