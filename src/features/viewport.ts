/**
 * A viewport request can outlive the render that started it: opening the replay
 * dock or inspector changes the available space while React Flow measures cards.
 * The caller supplies a live apply function so every attempt uses current bounds.
 * User navigation ends automatic placement until another explicit request.
 */
export function createViewportPlacement<T>(apply: (target: T, duration: number) => boolean) {
  let target: T;
  let requested = false;
  let applied = false;
  let manual = false;
  let timers: ReturnType<typeof setTimeout>[] = [];

  function cancelPending() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function place(duration: number) {
    if (requested && !manual) applied = apply(target, duration);
  }

  function later(delay: number, duration: number) {
    timers.push(setTimeout(() => place(duration), delay));
  }

  return {
    request(next: T) {
      cancelPending();
      target = next;
      requested = true;
      applied = false;
      manual = false;
      later(40, 300);
      // A final measurement pass never reuses the requesting render's dimensions.
      later(420, 0);
    },
    resize(refit: boolean) {
      if (!requested || manual || (applied && !refit)) return;
      cancelPending();
      place(0);
      // Stage expansion and panel resizing can finish in adjacent layout frames.
      later(120, 0);
    },
    userMove() {
      manual = true;
      cancelPending();
    },
    cancelPending,
  };
}
