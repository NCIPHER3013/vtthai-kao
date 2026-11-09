export const MEAT_GROUP = 'Select meat';
export const EXTRA_GROUP = 'Optional extras';
export const MEAT_CHOICES = ['Vegetarian / Tofu', 'Chicken', 'Beef', 'Duck', 'Prawn / Seafood'];
export const EXTRA_CHOICES = ['Extra Chicken', 'Extra Beef', 'Extra Duck', 'Extra Prawn / Seafood'];

const LEGACY_MEAT = ['Protein'];
const LEGACY_EXTRA = ['Add extra meat'];

export function isMeatGroup(g: any): boolean {
  return !!g && (g.name === MEAT_GROUP || LEGACY_MEAT.includes(g.name));
}

export function isExtraGroup(g: any): boolean {
  return !!g && (g.name === EXTRA_GROUP || LEGACY_EXTRA.includes(g.name));
}

export function findMeatIndex(groups: any[]): number {
  return groups.findIndex(isMeatGroup);
}

export function findExtraIndex(groups: any[]): number {
  return groups.findIndex(isExtraGroup);
}

export function makeOption(name: string, price = 0) {
  return { name, priceAdjustment: price, price_takeaway: price, price_delivery: price };
}

export function setMeatRequired(groups: any[], required: boolean): any[] {
  const idx = findMeatIndex(groups);
  if (idx >= 0) {
    return groups.map((g, i) => (i === idx ? { ...g, name: MEAT_GROUP, required, multiple: false } : g));
  }
  if (!required) return groups;
  return [{ name: MEAT_GROUP, required: true, multiple: false, options: MEAT_CHOICES.map((n) => makeOption(n)) }, ...groups];
}

export function toggleGroupOption(groups: any[], idx: number, name: string, on: boolean): any[] {
  return groups.map((g, i) => {
    if (i !== idx) return g;
    const has = g.options.some((o: any) => o.name === name);
    if (on && !has) return { ...g, options: [...g.options, makeOption(name)] };
    if (!on && has) return { ...g, options: g.options.filter((o: any) => o.name !== name) };
    return g;
  });
}

export function setExtrasEnabled(groups: any[], enabled: boolean): any[] {
  const idx = findExtraIndex(groups);
  if (idx >= 0) {
    if (!enabled) return groups.filter((_, i) => i !== idx);
    return groups.map((g, i) => (i === idx ? { ...g, name: EXTRA_GROUP, required: false, multiple: true } : g));
  }
  if (!enabled) return groups;
  return [...groups, { name: EXTRA_GROUP, required: false, multiple: true, options: EXTRA_CHOICES.map((n) => makeOption(n)) }];
}

export function setOptionPrice(groups: any[], idx: number, name: string, price: number): any[] {
  return groups.map((g, i) =>
    i !== idx
      ? g
      : { ...g, options: g.options.map((o: any) => (o.name === name ? { ...o, priceAdjustment: price, price_takeaway: price, price_delivery: price } : o)) }
  );
}
