export type Rng = {
  next: () => number;
  float: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  weighted: <T>(items: readonly { value: T; weight: number }[]) => T;
};

export function createSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seedInput: string | number): Rng {
  let state = typeof seedInput === "number" ? seedInput >>> 0 : createSeed(seedInput);
  if (state === 0) state = 0x6d2b79f5;

  function next() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items) => {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let cursor = next() * total;
      for (const item of items) {
        cursor -= item.weight;
        if (cursor <= 0) return item.value;
      }
      return items[items.length - 1].value;
    }
  };
}

export function resolveSeed(seed: string | undefined) {
  if (seed && seed !== "auto") return seed;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
