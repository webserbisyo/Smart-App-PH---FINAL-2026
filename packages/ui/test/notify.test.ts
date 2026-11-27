import { describe, expect, it, vi } from 'vitest';
import { toast } from '../src/components/toast';
import { connectToasts, notify } from '../src/compositions/notify';

describe('notify', () => {
  it('closes the toast when its button is tapped, so Undo runs once', () => {
    const add = vi.spyOn(toast, 'add');
    const close = vi.spyOn(toast, 'close');
    const disconnect = connectToasts(toast);
    const undo = vi.fn();

    const id = notify({ title: 'Removed Classic Smash', action: { label: 'Undo', onClick: undo } });
    const onClick = add.mock.calls.at(-1)?.[0].actionProps?.onClick;
    expect(onClick).toBeTypeOf('function');
    if (onClick) Reflect.apply(onClick, undefined, []);

    expect(undo).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledWith(id);
    disconnect();
  });

  it('adds no button when there is no action', () => {
    const add = vi.spyOn(toast, 'add');
    const disconnect = connectToasts(toast);
    notify({ title: 'Saved', tone: 'success' });
    expect(add.mock.calls.at(-1)?.[0].actionProps).toBeUndefined();
    disconnect();
  });
});
