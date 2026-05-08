import type { ItemDefinition, RecipeDefinition, TileDefinition } from "./types";

export const TILE_DEFINITIONS: Record<string, TileDefinition> = {
  air: {
    id: "air",
    label: "Air",
    solid: false,
    mineable: false,
    hardness: 0,
    drops: {}
  },
  meadow_grass: {
    id: "meadow_grass",
    label: "Moonlit Meadow Grass",
    solid: true,
    mineable: true,
    hardness: 1,
    drops: { loam_block: 1, star_dust: 1 },
    placeItem: "loam_block"
  },
  loam: {
    id: "loam",
    label: "Soft Loam",
    solid: true,
    mineable: true,
    hardness: 1,
    drops: { loam_block: 1 },
    placeItem: "loam_block"
  },
  starstone: {
    id: "starstone",
    label: "Starstone",
    solid: true,
    mineable: true,
    hardness: 2,
    drops: { starstone_block: 1, star_dust: 1 },
    placeItem: "starstone_block"
  },
  moon_crystal: {
    id: "moon_crystal",
    label: "Moon Crystal",
    solid: true,
    mineable: true,
    hardness: 1,
    drops: { moon_crystal: 1, star_dust: 2 }
  },
  meteor_brick: {
    id: "meteor_brick",
    label: "Meteor Brick",
    solid: true,
    mineable: true,
    hardness: 1,
    drops: { meteor_brick: 1 },
    placeItem: "meteor_brick"
  },
  plaza_lamp: {
    id: "plaza_lamp",
    label: "Plaza Lamp",
    solid: false,
    mineable: false,
    hardness: 0,
    drops: {}
  }
};

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  loam_block: {
    id: "loam_block",
    label: "Loam Block",
    description: "A soft block for quick cozy builds.",
    placeTile: "loam",
    maxStack: 99
  },
  starstone_block: {
    id: "starstone_block",
    label: "Starstone Block",
    description: "A sturdy midnight-blue building block.",
    placeTile: "starstone",
    maxStack: 99
  },
  moon_crystal: {
    id: "moon_crystal",
    label: "Moon Crystal",
    description: "A bright shard used in lantern crafting.",
    maxStack: 99
  },
  star_dust: {
    id: "star_dust",
    label: "Star Dust",
    description: "Soft glimmer collected from meadow stone.",
    maxStack: 99
  },
  meteor_brick: {
    id: "meteor_brick",
    label: "Meteor Brick",
    description: "Warm brick from old sky ruins.",
    placeTile: "meteor_brick",
    maxStack: 99
  },
  star_lantern: {
    id: "star_lantern",
    label: "Star Lantern",
    description: "A gentle lantern that marks friendly camps.",
    placeTile: "plaza_lamp",
    maxStack: 12
  }
};

export const RECIPES: Record<string, RecipeDefinition> = {
  meteor_brick: {
    output: "meteor_brick",
    label: "Meteor Brick",
    inputs: { loam_block: 2, star_dust: 1 },
    craftingXp: 12
  },
  star_lantern: {
    output: "star_lantern",
    label: "Star Lantern",
    inputs: { moon_crystal: 1, star_dust: 3 },
    craftingXp: 26
  }
};
