import { ITEM_DEFINITIONS, RECIPES } from "./items";
import type { Inventory, ItemId } from "./types";

export function createStarterInventory(): Inventory {
  return {
    loam_block: 8,
    star_dust: 2
  };
}

export function normalizeInventory(inventory: Inventory): Inventory {
  const normalized: Inventory = {};
  for (const [itemId, count] of Object.entries(inventory)) {
    if (!ITEM_DEFINITIONS[itemId] || !Number.isFinite(count) || count <= 0) {
      continue;
    }
    normalized[itemId] = Math.min(Math.floor(count), ITEM_DEFINITIONS[itemId].maxStack);
  }
  return normalized;
}

export function addItem(inventory: Inventory, itemId: ItemId, count: number): Inventory {
  const item = ITEM_DEFINITIONS[itemId];
  if (!item || count <= 0) {
    return normalizeInventory(inventory);
  }
  const current = inventory[itemId] ?? 0;
  return normalizeInventory({
    ...inventory,
    [itemId]: Math.min(item.maxStack, current + Math.floor(count))
  });
}

export function removeItem(inventory: Inventory, itemId: ItemId, count: number): Inventory | null {
  if (count <= 0) {
    return normalizeInventory(inventory);
  }
  const current = inventory[itemId] ?? 0;
  if (current < count) {
    return null;
  }
  const next = { ...inventory, [itemId]: current - Math.floor(count) };
  return normalizeInventory(next);
}

export function hasRecipeInputs(inventory: Inventory, output: ItemId): boolean {
  const recipe = RECIPES[output];
  if (!recipe) {
    return false;
  }
  return Object.entries(recipe.inputs).every(([itemId, count]) => {
    return (inventory[itemId] ?? 0) >= (count ?? 0);
  });
}

export function craftItem(inventory: Inventory, output: ItemId): { inventory: Inventory; xp: number } | null {
  const recipe = RECIPES[output];
  if (!recipe || !hasRecipeInputs(inventory, output)) {
    return null;
  }

  let next = normalizeInventory(inventory);
  for (const [itemId, count] of Object.entries(recipe.inputs)) {
    const removed = removeItem(next, itemId as ItemId, count ?? 0);
    if (!removed) {
      return null;
    }
    next = removed;
  }

  next = addItem(next, output, 1);
  return {
    inventory: next,
    xp: recipe.craftingXp
  };
}
