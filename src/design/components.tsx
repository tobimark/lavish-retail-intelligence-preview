import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Button({ children, className = '', variant = 'quiet', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'quiet' | 'primary' | 'icon' }) {
  return <button {...props} className={`button button--${variant} ${className}`}>{children}</button>;
}
export function Status({ offline = false, children }: { offline?: boolean; children: ReactNode }) {
  return <span className={`status ${offline ? 'status--offline' : ''}`}><i aria-hidden="true" />{children}</span>;
}
export function Metric({ label, value, note, direction, onInfo }: { label: string; value: number | string; note: string; direction?: string; onInfo?: () => void }) {
  return <div className="metric"><div className="metric-label">{label}{onInfo && <button onClick={onInfo} className="info-dot" aria-label={`About ${label}`} type="button">i</button>}</div><div className="metric-value">{value}<span className={`metric-direction ${direction === '↓' ? 'exit-color' : ''}`} aria-hidden="true">{direction}</span></div><div className="metric-note">{note}</div></div>;
}
/**
 * Shared modal dialog/drawer.
 * - real native <dialog> + showModal (inert background, Esc handled natively)
 * - body scroll locked while open and the page scroll position restored on close
 * - Tab focus cycles inside the dialog; the top close button stays reachable
 * - focus returns to the invoking control after close
 */
export function Dialog({ title, eyebrow, children, onClose, drawer = false }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const invoker = useRef<HTMLElement | null>(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    const dialog = ref.current!;
    const body = document.body;
    const active = document.activeElement;
    invoker.current = active instanceof HTMLElement && active !== document.body ? active : null;
    savedScroll.current = window.scrollY;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    dialog.showModal();
    const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog.open) return;
      const focusables = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      const target = invoker.current;
      const top = savedScroll.current;
      dialog.close();
      window.scrollTo(0, top);
      // React removes the <dialog> before native close() can restore focus, so restore it explicitly
      // once the dialog is detached. The isConnected guard keeps StrictMode's development remount
      // (same DOM node still attached) from stealing focus back out of the open dialog.
      if (target && target.isConnected) requestAnimationFrame(() => { if (!dialog.isConnected) target.focus({ preventScroll: true }); });
    };
  }, []);

  return <dialog className={drawer ? 'dialog drawer' : 'dialog'} ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="dialog-title" aria-modal="true">
    <div className="dialog-inner"><div className="dialog-top"><span className="eyebrow">{eyebrow}</span><button type="button" ref={closeRef} className="button button--icon dialog-close" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div><h2 id="dialog-title">{title}</h2>{children}</div>
  </dialog>;
}
