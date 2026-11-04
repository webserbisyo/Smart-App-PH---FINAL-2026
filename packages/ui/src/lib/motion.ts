// The installed `motion` package (14.3.0) for apps that animate lists and panels. Apps import it from here,
// so the version lives in one package.json. Keep motion under 400 ms and off for reduced motion (ux.md).
export { AnimatePresence, motion, useReducedMotion } from 'motion/react';
