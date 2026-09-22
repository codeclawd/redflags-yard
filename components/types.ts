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
