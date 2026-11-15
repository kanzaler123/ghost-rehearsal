import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

function available(element: HTMLElement) {
  return element.isConnected && !element.matches(':disabled') && !element.closest('[hidden], [inert]')
    && element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

export function modalControls(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>('button, input, textarea, select, a[href], summary, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && available(element));
}

export function useModalFocus(ref: RefObject<HTMLDialogElement | null>) {
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousScope = previous?.closest('dialog') ?? document.body;
    const previousControls = modalControls(previousScope);
    const previousIndex = previous ? previousControls.indexOf(previous) : -1;
    const restore = [...previousControls.slice(previousIndex + 1), ...previousControls.slice(0, previousIndex).reverse()];
    let focused: HTMLElement | null = null;
    let neighbors: HTMLElement[] = [];
    const remember = () => {
      focused = document.activeElement as HTMLElement;
      const controls = modalControls(dialog), index = controls.indexOf(focused);
      const nearby = [...controls.slice(index + 1), ...controls.slice(0, index).reverse()];
      neighbors = [...nearby.filter(element => element.tagName === 'BUTTON'), ...nearby];
    };
    dialog.addEventListener('focusin', remember);
    dialog.showModal();
    (modalControls(dialog).find(element => !!element.closest('.modal-body')) ?? modalControls(dialog)[0])?.focus();
    const observer = new MutationObserver(() => {
      if (!dialog.open || !focused || available(focused)) return;
      if (document.activeElement !== document.body && document.activeElement !== dialog && !dialog.contains(document.activeElement)) return;
      (neighbors.find(element => dialog.contains(element) && available(element)) ?? modalControls(dialog)[0])?.focus();
    });
    observer.observe(dialog, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'inert', 'style', 'class'] });
    return () => {
      observer.disconnect();
      dialog.removeEventListener('focusin', remember);
      dialog.close();
      if (previous && previous !== document.body && available(previous)) previous.focus();
      else (restore.find(available) ?? modalControls(previousScope)[0])?.focus();
    };
  }, [ref]);
}
