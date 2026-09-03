export interface AnchorBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface MenuSize {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface MenuSpot {
  left: number;
  top: number;
}

export const MENU_GAP = 4;
export const MENU_MARGIN = 8;

function within(value: number, least: number, most: number): number {
  if (most < least) return least;
  return Math.min(Math.max(value, least), most);
}

function alongInline(anchor: AnchorBox, width: number, viewport: Viewport, rtl: boolean): number {
  const wanted = rtl ? anchor.right - width : anchor.left;
  return within(wanted, MENU_MARGIN, viewport.width - MENU_MARGIN - width);
}

function alongBlock(anchor: AnchorBox, height: number, viewport: Viewport): number {
  const under = anchor.bottom + MENU_GAP;
  if (under + height <= viewport.height - MENU_MARGIN) return under;
  const over = anchor.top - MENU_GAP - height;
  if (over >= MENU_MARGIN) return over;
  return within(under, MENU_MARGIN, viewport.height - MENU_MARGIN - height);
}

export function placeRowMenu(
  anchor: AnchorBox,
  menu: MenuSize,
  viewport: Viewport,
  rtl: boolean,
): MenuSpot {
  return {
    left: alongInline(anchor, menu.width, viewport, rtl),
    top: alongBlock(anchor, menu.height, viewport),
  };
}
