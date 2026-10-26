// URL state management for the menu screen (?q=, ?cat=, ?fav=1, ?show=best|new, ?item=).

// The two quick lists beside Favourites (decision R29).
export const MENU_SHOWS = ['best', 'new'] as const;
export type MenuShow = (typeof MENU_SHOWS)[number];

function isMenuShow(value: string): value is MenuShow {
  return MENU_SHOWS.some((show) => show === value);
}

export interface MenuParams {
  q: string;
  cat: string | null;
  fav: boolean;
  show: MenuShow | null;
  item: string | null;
}

export interface MenuParamSource {
  get(name: string): string | null;
}

export function parseMenuParams(source: MenuParamSource): MenuParams {
  const q = (source.get('q') ?? '').trim();
  const rawCat = (source.get('cat') ?? '').trim();
  const cat = rawCat.length > 0 && rawCat !== 'all' ? rawCat : null;
  const rawFav = (source.get('fav') ?? '').trim();
  const fav = rawFav === '1' || rawFav === 'true';
  const rawShow = (source.get('show') ?? '').trim();
  const show = isMenuShow(rawShow) ? rawShow : null;
  const rawItem = (source.get('item') ?? '').trim();
  const item = rawItem.length > 0 ? rawItem : null;

  return { q, cat, fav, show, item };
}

export function buildMenuSearch(current: MenuParams, updates: Partial<MenuParams> = {}): string {
  const merged: MenuParams = { ...current, ...updates };
  const params = new URLSearchParams();

  if (merged.q.trim().length > 0) {
    params.set('q', merged.q.trim());
  }
  if (merged.cat && merged.cat !== 'all') {
    params.set('cat', merged.cat);
  }
  if (merged.fav) {
    params.set('fav', '1');
  }
  if (merged.show) {
    params.set('show', merged.show);
  }
  if (merged.item) {
    params.set('item', merged.item);
  }

  const str = params.toString();
  return str.length > 0 ? `?${str}` : '';
}

/** In multi-select add-on groups, unpicked options disable once the max is reached. */
export function isOptionDisabledAtMax(
  chosenOptionIds: readonly string[],
  groupMax: number,
  optionId: string,
): boolean {
  if (chosenOptionIds.includes(optionId)) return false;
  return chosenOptionIds.length >= groupMax;
}
