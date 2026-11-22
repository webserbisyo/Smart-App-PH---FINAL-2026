import * as React from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { authWords } from '@smartapp/core';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import { cn } from '@smartapp/ui/lib/utils';

/**
 * A password box with Show and Hide (T108 L6), built from the installed input group, and a Caps Lock hint
 * under it while Caps Lock is on. Used by Log in, Sign up and Forgot password.
 */
export function PasswordInput({
  className,
  capsId,
  onKeyUp,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'> & { capsId: string }) {
  const [shown, setShown] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const readCaps = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState('CapsLock'));
  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup className={cn('h-11', className)}>
        <InputGroupInput
          {...props}
          type={shown ? 'text' : 'password'}
          className="text-base md:text-sm"
          onKeyDown={(e) => {
            readCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            readCaps(e);
            onKeyUp?.(e);
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={shown ? authWords.hidePassword : authWords.showPassword}
            aria-pressed={shown}
            className="size-11 text-muted-foreground hover:text-foreground md:size-8"
            onClick={() => setShown(!shown)}
          >
            {shown ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {caps ? (
        <p id={capsId} role="status" className="text-sm text-warning-text">
          {authWords.capsLock}
        </p>
      ) : null}
    </div>
  );
}
