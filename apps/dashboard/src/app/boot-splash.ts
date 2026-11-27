// The installed dashboard's opening screen (decision T121) lives in index.html so it paints before any script.
// It leaves once the app has drawn something into #root, but never before 1 s from launch, so a fast phone
// still sees the logo instead of a flash. CSS removes it at 3 s whatever happens (`boot-splash`).

const SPLASH_MIN_MS = 1000;

export function releaseBootSplash(): void {
  const splash = document.getElementById('boot-splash');
  const root = document.getElementById('root');
  if (!splash || !root) return;
  const release = () =>
    setTimeout(() => splash.setAttribute('data-ready', ''), SPLASH_MIN_MS - performance.now());
  if (root.childElementCount > 0) {
    release();
    return;
  }
  const watch = new MutationObserver(() => {
    if (root.childElementCount === 0) return;
    watch.disconnect();
    release();
  });
  watch.observe(root, { childList: true });
}
