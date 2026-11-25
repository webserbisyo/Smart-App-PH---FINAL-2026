import { describe, expect, it } from 'vitest';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { PermissionEnum } from '@smartapp/core';
import { Can, IS_PUBLIC_KEY } from '../../src/auth/decorators.js';
import { testApp } from './test-app.js';

// Rule 12: every route says who may call it. Controllers are found by Nest itself, not from a hand list.
describe('every route has @Public() or @Can()', () => {
  it('finds every controller and checks each handler', async () => {
    const app = await testApp();
    const discovery = app.get(DiscoveryService);
    const scanner = app.get(MetadataScanner);
    const reflector = app.get(Reflector);
    const missing: string[] = [];
    let routes = 0;

    for (const wrapper of discovery.getControllers()) {
      const instance: unknown = wrapper.instance;
      if (typeof instance !== 'object' || instance === null) continue;
      const proto: object = Object.getPrototypeOf(instance);
      for (const name of scanner.getAllMethodNames(proto)) {
        const handler: unknown = Reflect.get(proto, name);
        if (typeof handler !== 'function') continue;
        routes += 1;
        const targets = [handler, instance.constructor];
        const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) === true;
        const permission = reflector.getAllAndOverride(Can, targets);
        if (permission !== undefined)
          expect(PermissionEnum.safeParse(permission).success).toBe(true);
        if (!isPublic && permission === undefined) missing.push(`${wrapper.name}.${name}`);
      }
    }

    await app.close();
    expect(routes).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });
});
