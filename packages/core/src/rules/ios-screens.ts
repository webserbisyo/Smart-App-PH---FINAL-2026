// iPhone and iPad launch pictures (decisions R51, T121). iOS paints an installed web app's launch picture
// only when one matches the screen exactly; any screen without one opens white. Shared by the storefront
// (one picture per shop, drawn on request) and the dashboard (fixed pictures made by
// tooling/scripts/dashboard-splash.ts). No imports, so that script and vite.config.ts can load this file.

/**
 * Every current iPhone and iPad screen in CSS pixels and pixel ratio (portrait). Phones from the iPhone SE
 * (1st gen) to the iPhone 17 family and the iPhone Air; iPads from the 9.7" to the 13" iPad Pro.
 */
export const IOS_SCREENS = [
  // iPhones
  { width: 440, height: 956, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 420, height: 912, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 320, height: 568, ratio: 2 },
  // iPads
  { width: 1032, height: 1376, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
  { width: 834, height: 1210, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 744, height: 1133, ratio: 2 },
] as const;

export type IosScreen = (typeof IOS_SCREENS)[number];

/** "1170x2532": the picture's size in real pixels, as its address names it. */
export function splashSizeName(screen: IosScreen): string {
  return `${screen.width * screen.ratio}x${screen.height * screen.ratio}`;
}

/** The screen a picture address names, or null for any size we don't make. */
export function splashScreen(sizeName: string): IosScreen | null {
  return IOS_SCREENS.find((screen) => splashSizeName(screen) === sizeName) ?? null;
}

/** The media query iOS matches a launch picture with (portrait only, as the manifests). */
export function splashMedia(screen: IosScreen): string {
  return `(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait)`;
}
