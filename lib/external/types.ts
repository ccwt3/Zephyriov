/** A game reduced to what opening detection needs. */
export interface AnalyzedGame {
  /** Opening name as reported by the platform (e.g. "Sicilian Defense: Dragon Variation"). */
  openingName: string;
  eco: string | null;
  /** Side the user played in this game. */
  color: "white" | "black";
}
