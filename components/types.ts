import type { CategoryId, ScanScore, Severity } from "@/lib/types";

/** `public/policies/index.json` — the fleet at anchor. */
export interface FleetShip {
  id: string;
  name: string;
  url: string;
  fetchedAt: string;
  chars: number;
}

/** `public/policies/<id>.json` — a fleet ship with its text aboard. */
export interface FleetPolicy extends FleetShip {
  text: string;
}

/** One ship's row in `public/baked/matrix.json`. */
export interface MatrixShip extends FleetShip {
  score: ScanScore;
  flagCount: number;
  /** Flags found per matrix column. 0 means the rulebook found none. */
  counts: Record<CategoryId, number>;
}

/** `public/baked/matrix.json` — the whole fleet, already boarded. */
export interface FleetMatrix {
  bakedAt: string;
  engine: string;
  columns: Array<{ id: CategoryId; severity: Severity }>;
  ships: MatrixShip[];
}
