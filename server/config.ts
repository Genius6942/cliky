import { GameSettings } from "./room";

export interface Config {
  defaultSettings: GameSettings;
  version: string;
}

export const config = {
  version: "2.0.0",
  defaultSettings: {
    mode: "clicks" as GameSettings["mode"],
    target: 100,
    boosts: {
      points: {
        min: 10,
        max: 20,
      },
      cooldown: {
        min: 750,
        max: 1250,
      },
      radius: {
        min: 40,
        max: 70,
      },
      edges: {
        min: 3,
        max: 8,
      },
    },
  },
};
