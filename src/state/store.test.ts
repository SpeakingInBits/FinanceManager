import { describe, it, expect, vi } from 'vitest';
import { Store } from './store';

describe('Store', () => {
  it('returns the initial state', () => {
    const store = new Store({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('merges a partial patch into state', () => {
    const store = new Store({ count: 0, name: 'a' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, name: 'a' });
  });

  it('accepts an updater function receiving the current state', () => {
    const store = new Store({ count: 5 });
    store.setState((state) => ({ count: state.count + 1 }));
    expect(store.getState().count).toBe(6);
  });

  it('notifies subscribers with the new state on every setState', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple independent subscribers', () => {
    const store = new Store({ count: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.setState({ count: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('produces a new state object on each update without mutating the previous one', () => {
    const store = new Store({ count: 0 });
    const before = store.getState();
    store.setState({ count: 1 });
    const after = store.getState();
    expect(before).not.toBe(after);
    expect(before).toEqual({ count: 0 });
  });
});
