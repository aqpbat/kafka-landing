/**
 * Client runtime for artboards rendered by `render.ts`.
 * Runs the artboard's own `Component extends DCLogic` class and keeps the
 * server-rendered DOM in sync with `renderVals()` after every `setState`.
 */
import { fillTemplate, getPath, type Vals } from './render';
import { captureUtm, sendLead, type LeadFields, type LeadResult } from '../lead';

export class DCLogic {
  props: Record<string, unknown>;
  state: Record<string, any> = {};
  /** @internal */ _update?: () => void;
  /** @internal `performance.now()` when a form of this artboard was first shown. */ _formShownAt?: number;

  constructor(props: Record<string, unknown> = {}) {
    this.props = props;
  }

  setState(patch: Record<string, unknown>) {
    this.state = { ...this.state, ...patch };
    this._update?.();
  }

  renderVals(): Vals {
    return {};
  }

  /** Send a lead to kafka-bot. Absent on the design canvas — artboards check for it. */
  sendLead(fields: LeadFields): Promise<LeadResult> {
    return sendLead(fields, this._formShownAt ?? 0);
  }
}

type ComponentCtor = new (props: object) => DCLogic & {
  componentDidMount?(): void;
  componentWillUnmount?(): void;
};

const EVENTS = ['click', 'input', 'change', 'submit'] as const;

export function mount(root: HTMLElement, Component: ComponentCtor) {
  const comp = new Component({});
  let vals = comp.renderVals();

  const texts = [...root.querySelectorAll<HTMLElement>('dc-t[data-t]')];
  const ifs = [...root.querySelectorAll<HTMLElement>('dc-if[data-if]')];
  const bound = [...root.querySelectorAll<HTMLElement>('[data-dcb]')].map((el) => ({
    el,
    attrs: [...el.attributes]
      .filter((a) => a.name.startsWith('data-b-'))
      .map((a) => ({ name: a.name.slice(7), tpl: a.value })),
  }));

  const update = () => {
    vals = comp.renderVals();
    for (const el of texts) {
      const v = getPath(vals, el.dataset.t!);
      const s = v == null ? '' : String(v);
      if (el.textContent !== s) el.textContent = s;
    }
    for (const el of ifs) {
      const show = !!getPath(vals, el.dataset.if!);
      if (el.hidden === show) el.hidden = !show;
    }
    for (const { el, attrs } of bound) {
      for (const { name, tpl } of attrs) {
        const s = fillTemplate(tpl, vals);
        if (el.getAttribute(name) !== s) el.setAttribute(name, s);
      }
    }
  };
  comp._update = update;

  for (const type of EVENTS) {
    root.addEventListener(type, (e) => {
      const el = (e.target as Element).closest?.(`[data-on-${type}]`);
      if (!el || !root.contains(el)) return;
      const fn = getPath(vals, el.getAttribute(`data-on-${type}`)!);
      if (typeof fn === 'function') fn(e);
    });
  }
  // Forms are sent by the artboard's onSubmit handler (sendLead): never navigate away.
  root.addEventListener('submit', (e) => e.preventDefault());

  // `elapsed` in a lead counts from the moment its form is first seen (or touched).
  captureUtm();
  const markShown = () => {
    comp._formShownAt ??= performance.now();
  };
  const forms = root.querySelectorAll('form');
  if (forms.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        markShown();
        io.disconnect();
      }
    });
    forms.forEach((f) => io.observe(f));
  }
  root.addEventListener('focusin', (e) => {
    if ((e.target as Element).closest?.('form')) markShown();
  });

  comp.componentDidMount?.();
  // For scripts/tests: document.querySelector('[data-dc-root]').__dc
  (root as HTMLElement & { __dc?: unknown }).__dc = comp;
  return comp;
}
