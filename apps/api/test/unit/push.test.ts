import { describe, expect, it } from 'vitest';
import * as webPush from 'web-push';
import { mapLimit } from '../../src/push/push-delivery.service.js';
import { isPushServiceUrl, platformOf } from '../../src/push/push-endpoints.js';
import {
  firstName,
  ownerNewOrder,
  pushMessage,
  statusBody,
  topicOf,
} from '../../src/push/push-messages.js';

describe('push (phase 5)', () => {
  it('uses the web-push functions we rely on (R7)', () => {
    expect(typeof webPush.sendNotification).toBe('function');
    expect(typeof webPush.generateVAPIDKeys).toBe('function');
    const keys = webPush.generateVAPIDKeys();
    expect(keys.publicKey).toMatch(/^[A-Za-z0-9_-]{80,100}$/);
    expect(keys.privateKey).toMatch(/^[A-Za-z0-9_-]{40,50}$/);
  });

  it('sends only to the push services browsers use', () => {
    expect(isPushServiceUrl('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushServiceUrl('https://web.push.apple.com/QF1')).toBe(true);
    expect(isPushServiceUrl('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isPushServiceUrl('https://db5p.notify.windows.com/w/?token=x')).toBe(true);
    expect(isPushServiceUrl('http://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isPushServiceUrl('https://fcm.googleapis.com:8443/fcm/send/abc')).toBe(false);
    expect(isPushServiceUrl('https://user@fcm.googleapis.com/x')).toBe(false);
    expect(isPushServiceUrl('https://fcm.googleapis.com.evil.com/x')).toBe(false);
    expect(isPushServiceUrl('https://169.254.169.254/latest')).toBe(false);
    expect(isPushServiceUrl('not a url')).toBe(false);
  });

  it('names the phone kind from its browser line', () => {
    expect(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X)')).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Linux; Android 14; SM-A156E)')).toBe('android');
    expect(platformOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    expect(platformOf(undefined)).toBe('other');
  });

  it('words each order step, and keeps quiet where phase 6 speaks', () => {
    expect(statusBody('preparing', 'pickup', 7)).toBe(
      'Order #007 was accepted. It is being prepared.',
    );
    expect(statusBody('ready', 'delivery', 12)).toContain('The rider picks it up next');
    expect(statusBody('ready', 'pickup', 12)).toContain('Show your order number');
    expect(statusBody('completed', 'pickup', 12)).toBeNull();
    expect(statusBody('placed', 'pickup', 12)).toBeNull();
  });

  it('keeps the declarative shape small and the customer to a first name', () => {
    const message = pushMessage({
      title: 'Kanto Smash',
      body: 'x'.repeat(500),
      navigate: 'https://kanto-smash.webserbisyo.com/kanto-smash/o/abc',
      tag: 'order-1',
    });
    expect(message.web_push).toBe(8030);
    expect(message.notification.body).toHaveLength(240);
    expect(JSON.stringify(message).length).toBeLessThan(4000);
    expect(firstName('  Maria Clara Santos ')).toBe('Maria');
    const alert = ownerNewOrder({
      orderNo: 45,
      total: 45000,
      customerName: 'Juan Dela Cruz',
      type: 'delivery',
    });
    expect(alert.title).toBe('New order #045 · ₱450');
    expect(alert.body).toBe('Juan · Delivery. Open Orders to accept it.');
    expect(topicOf('0f8fad5b-d9cb-469f-a165-70867728950e')).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('runs at most a few sends at once and keeps their order', async () => {
    let running = 0;
    let most = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50, 60]);
    expect(most).toBe(2);
  });
});
