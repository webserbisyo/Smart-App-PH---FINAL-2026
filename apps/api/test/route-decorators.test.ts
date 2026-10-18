import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { AppController } from '../src/app.controller.js';
import { CAN_PERMISSION_KEY, IS_PUBLIC_KEY } from '../src/auth/decorators.js';

describe('Route Decorators Policy', () => {
  const reflector = new Reflector();

  it('fails if any route has neither @Public() nor @Can()', () => {
    const controllers = [AppController];

    for (const controller of controllers) {
      const prototype = controller.prototype;
      const propertyNames = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof prototype[name] === 'function',
      );

      for (const methodName of propertyNames) {
        const handler = prototype[methodName];
        const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
        const canPermission = reflector.get<string>(CAN_PERMISSION_KEY, handler);

        const hasGuard = Boolean(isPublic) || typeof canPermission === 'string';

        expect(
          hasGuard,
          `Route handler "${controller.name}.${methodName}" must have either @Public() or @Can()`,
        ).toBe(true);
      }
    }
  });
});
