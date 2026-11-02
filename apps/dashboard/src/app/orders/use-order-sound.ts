import * as React from 'react';
import type { BoardOrder } from '@smartapp/core';

const STORAGE_KEY = 'smartapp:order-sound-enabled';

function playChime() {
  try {
    // Safari has had the unprefixed AudioContext since 14.1.
    const AudioContextClass = window.AudioContext;
    if (typeof AudioContextClass !== 'function') return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle two-tone chime: D5 (587 Hz) -> A5 (880 Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // AudioContext blocked or user interaction not yet registered
  }
}

export function useOrderSound(orders?: BoardOrder[]) {
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const previousIdsRef = React.useRef<Set<string> | null>(null);

  const enableSound = React.useCallback(() => {
    setSoundEnabled(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    // Play once on enable to unlock audio context
    playChime();
  }, []);

  React.useEffect(() => {
    if (!orders) return;
    const currentIds = new Set(orders.map((o) => o.id));

    if (previousIdsRef.current !== null) {
      // Check if any order is new
      let hasNew = false;
      for (const id of currentIds) {
        if (!previousIdsRef.current.has(id)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew && soundEnabled) {
        playChime();
      }
    }

    previousIdsRef.current = currentIds;
  }, [orders, soundEnabled]);

  return {
    soundEnabled,
    enableSound,
  };
}
