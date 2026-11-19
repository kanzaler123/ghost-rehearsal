import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { MESSAGES } from '../src/i18n/messages';
const context = vi.hoisted(() => ({ current: {} as unknown }));
vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof import('react')>(), useContext: () => context.current }));
import { ContextMenu, LiveAnnouncer, ModeNav, RunStateCard, SHELL_COMPONENTS, TopBar } from '../src/components/shell';
import { filterNodes } from '../src/components/shell/navigation';
import type { TopBarProps } from '../src/components/shell/TopBar';
import { isStudioRoute, STUDIO_HASH } from '../src/app/preferences';
type Element = ReactElement<Record<string, any>>;
function flatten(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...flatten(typeof element.type === 'function' && SHELL_COMPONENTS.has(element.type) ? (element.type as (props: Record<string, unknown>) => unknown)(element.props) : element.props.children)];
}
function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  return value && typeof value === 'object' && 'props' in value ? text((value as Element).props.children) : '';
}
describe('shell labels and keyboard menus', () => {
  it.each(['en', 'zh'] as const)('keeps mode text, names and action descriptions in %s', lang => {
    const t = MESSAGES[lang]; context.current = { t, lang, setLang() {} };
    const noop = () => {};
    const props: TopBarProps = { mode: 'Build', busy: false, canUndo: false, canRedo: false, unsaved: true, draftSaved: true, activityName: 'An activity', planName: 'A named plan', compareUnavailable: t.topbar.compareUnavailable, runMode: 'cutoff', lang, onMode: noop, onUndo: noop, onRedo: noop, onRun: noop, onStop: noop, onSave: noop, onImport: noop, onExport: noop, onPlanJson: noop, onScenarioJson: noop, onAbout: noop, onRunMode: noop, onLang: noop };
    const tree = flatten(TopBar(props));
    const tabs = tree.filter(item => item.props.role === 'tab');
    expect(tabs.map(text)).toEqual([t.modes.Build, t.modes.Rehearse, t.modes.Compare]);
    expect(tabs.map(tab => tab.props['aria-selected'])).toEqual([true, false, false]);
    expect(tabs[2].props['aria-describedby']).toBe('mode-unavailable'); expect(tabs[2].props['aria-disabled']).toBe(true);
    expect(tree.find(item => item.props.className === 'context-chip')!.props['aria-label']).toBe(t.topbar.context('An activity', 'A named plan'));
    for (const button of tree.filter(item => item.type === 'button' || item.type === 'summary')) expect(text(button) || button.props['aria-label']).toBeTruthy();
    expect(flatten(ModeNav({ mode: 'Rehearse', busy: true, onMode: noop })).filter(item => item.props.role === 'tab').every(item => item.props.disabled)).toBe(true);
  });
  it('Escape closes just its menu and restores the summary focus; focus leaving closes without trapping it', () => {
    const tree = flatten(ContextMenu({ label: 'Actions', children: 'Menu items' }));
    const details = tree[0], focus = vi.fn(), stopPropagation = vi.fn(), preventDefault = vi.fn();
    const element = { open: true, querySelector: () => ({ focus }), contains: () => false };
    details.props.onKeyDown({ key: 'Escape', currentTarget: element, stopPropagation, preventDefault });
    expect(element.open).toBe(false); expect(stopPropagation).toHaveBeenCalledOnce(); expect(focus).toHaveBeenCalledOnce();
    element.open = true; details.props.onBlur({ currentTarget: element, relatedTarget: {} }); expect(element.open).toBe(false); expect(focus).toHaveBeenCalledOnce();
  });
  it('renders one enabled primary action per state and separates failure announcements', () => {
    const t = MESSAGES.en; context.current = { t, lang: 'en' };
    for (const kind of Object.keys(t.runState) as (keyof typeof t.runState)[]) {
      const actions = flatten(RunStateCard({ kind, action: kind === 'computing' ? 'stop' : 'rerun', onAction() {} })).filter(item => item.type === 'button' && item.props.className.includes('primary'));
      expect(actions).toHaveLength(1); expect(actions[0].props.disabled).not.toBe(true);
    }
    const tree = flatten(LiveAnnouncer({ message: 'complete', error: 'failed' }));
    expect(text(tree.find(item => item.props.role === 'alert'))).toBe('failed'); expect(text(tree.find(item => item.props.role === 'status'))).toBe('');
  });
  it('search matches trimmed names and localized types while keeping order', () => {
    const nodes = [{ name: 'Alpha', type: 'service' }, { name: 'Beta', type: 'exit' }, { name: 'Alphabet', type: 'service' }];
    expect(filterNodes(nodes, ' ALP ', type => type)).toEqual([nodes[0], nodes[2]]);
    expect(filterNodes(nodes, '出口', type => type === 'exit' ? '出口' : '服务')).toEqual([nodes[1]]);
    expect(filterNodes(nodes, '', type => type)).toEqual(nodes); expect(filterNodes(nodes, 'no match', type => type)).toEqual([]);
  });
  it('renders brand as a home button without a replay-opening menu item and recognizes studio routes', () => {
    const t = MESSAGES.zh; context.current = { t, lang: 'zh', setLang() {} };
    const onOpening = vi.fn(), noop = () => {};
    const tree = flatten(TopBar({ mode: 'Build', busy: false, canUndo: false, canRedo: false, unsaved: false, draftSaved: true, activityName: '午夜鬼屋', planName: '方案 A', runMode: 'cutoff', lang: 'zh', onMode: noop, onUndo: noop, onRedo: noop, onRun: noop, onStop: noop, onSave: noop, onImport: noop, onExport: noop, onPlanJson: noop, onScenarioJson: noop, onAbout: noop, onRunMode: noop, onLang: noop, onOpening }));
    const homeButton = tree.find(item => item.type === 'button' && item.props['aria-label'] === t.redesign.backHome)!;
    expect(homeButton).toBeDefined();
    homeButton.props.onClick();
    expect(onOpening).toHaveBeenCalledOnce();
    expect(tree.some(item => text(item).includes('重看开场'))).toBe(false);
    expect(isStudioRoute('')).toBe(false);
    expect(isStudioRoute('#/')).toBe(false);
    expect(isStudioRoute(STUDIO_HASH)).toBe(true);
    expect(isStudioRoute(`${STUDIO_HASH}/`)).toBe(true);
  });
});
