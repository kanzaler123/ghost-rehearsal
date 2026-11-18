import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { Ghost } from './Icons';
import { modalControls, useModalFocus } from './forms/modalFocus';

const targets = [
  ['.mode-switch'], ['.plan-navigator .event-card', '.plan-navigator .plan-list'],
  ['.canvas-pane'], ['.check-chip, .run-plan-checks'],
  ['.run-scope', '.command-group .btn.run'], ['.workspace-menu > summary'],
];

export function SpotlightTour({ step, onStep, onClose }: { step: number; onStep: (step: number) => void; onClose: () => void }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  useModalFocus(dialog);
  useLayoutEffect(() => {
    const overlay = dialog.current!, light = windowRef.current!, note = card.current!;
    const elements = targets[step].map(selector => document.querySelector<HTMLElement>(selector)!);
    const gap = 12, pad = 5;
    let viewportWidth = 0, viewportHeight = 0;
    function place() {
      const width = overlay.clientWidth, height = overlay.clientHeight;
      const w = note.offsetWidth, h = note.offsetHeight;
      if (width !== viewportWidth || height !== viewportHeight) {
        viewportWidth = width; viewportHeight = height;
        elements[0].scrollIntoView({ block: height < 2 * (h + gap) ? 'start' : 'center', inline: 'nearest', behavior: 'instant' });
      }
      const rects = elements.map(element => element.getBoundingClientRect());
      const left = Math.max(0, Math.min(...rects.map(rect => rect.left)) - pad);
      const right = Math.min(width, Math.max(...rects.map(rect => rect.right)) + pad);
      const top = Math.max(0, Math.min(...rects.map(rect => rect.top)) - pad);
      let bottom = Math.min(height, Math.max(...rects.map(rect => rect.bottom)) + pad);
      const clamp = (value: number, max: number) => Math.max(gap, Math.min(value, max - gap));
      let x = clamp((left + right - w) / 2, width - w);
      let y = bottom + gap;
      if (right + w + 2 * gap <= width || left >= w + 2 * gap) {
        x = right + w + 2 * gap <= width ? right + gap : left - w - gap;
        y = clamp((top + bottom - h) / 2, height - h);
      } else if (y + h + gap > height) {
        if (top >= h + 2 * gap) y = top - h - gap;
        else { y = height - h - gap; bottom = Math.min(bottom, y - gap); }
      }
      Object.assign(light.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(0, right - left)}px`, height: `${Math.max(0, bottom - top)}px` });
      Object.assign(note.style, { left: `${x}px`, top: `${Math.max(gap, y)}px` });
      light.style.setProperty('--tour-beam-height', `${top + Math.min(70, (bottom - top) / 2)}px`);
    }
    place();
    const observer = new ResizeObserver(place);
    [...elements, overlay, note].forEach(element => observer.observe(element));
    window.addEventListener('scroll', place, true);
    return () => { observer.disconnect(); window.removeEventListener('scroll', place, true); };
  }, [step, t]);
  const [title, description] = t.tour.steps[step];
  return createPortal(<dialog className="spotlight-tour" ref={dialog} aria-label={t.tour.title} aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key !== 'Tab') return;
      const controls = modalControls(event.currentTarget), first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="spotlight-window" ref={windowRef} aria-hidden="true"><span className="tracked-spotlight" /></div>
    <section className="spotlight-card" ref={card}>
      <div aria-live="polite" aria-atomic="true"><p className="eyebrow"><Ghost size={20} />{t.tour.title} · {step + 1} / {targets.length}</p><h2>{title}</h2><p>{description}</p></div>
      <div className="spotlight-actions"><button type="button" className="text-btn" onClick={onClose}>{t.tour.skip}</button>
        <button type="button" className="btn ghost small" disabled={step === 0} onClick={() => onStep(step - 1)}>{t.tour.previous}</button>
        <button type="button" className="btn run small" onClick={() => step + 1 === targets.length ? onClose() : onStep(step + 1)}>{step + 1 === targets.length ? t.tour.done : t.tour.next}</button>
      </div>
    </section>
  </dialog>, document.body);
}
