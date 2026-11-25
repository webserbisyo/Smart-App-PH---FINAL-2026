import { Body, Controller, Get, HttpCode, Inject, Post, Put } from '@nestjs/common';
import {
  CentavosSchema,
  DeliverySettingsSchema,
  HoursSettingsSchema,
  NotificationPrefsSchema,
  OrderingSettingsSchema,
  OrderTypeEnum,
  PaymentAccountSchema,
  SaveProfileInputSchema,
  ShopFactsSchema,
  type DeliverySettings,
  type HoursSettings,
  type NotificationPrefs,
  type OrderingSettings,
  type OwnerProfile,
  type OwnerSettings,
  type PaymentSettings,
  type SaveProfileInput,
  type ShopFacts,
} from '@smartapp/core';
import { z } from 'zod';
import type { CallerUser } from '../auth/caller.js';
import { Can, CurrentUser } from '../auth/decorators.js';
import { AccountDeleteService } from './account-delete.service.js';
import { SettingsService } from './settings.service.js';

// The last order type and the last way to pay have their own codes (last_order_type, last_payment_method),
// so an empty list passes the shape check here and the service answers it.
const OrderingInputSchema = OrderingSettingsSchema.extend({ orderTypes: z.array(OrderTypeEnum) });
const PaymentsInputSchema = z.object({
  payments: z.array(PaymentAccountSchema),
  codMaxTotal: CentavosSchema.nullable(),
});

/** api.md "Settings (owner)": one read, one save per section (T64 to T68). */
@Controller('owner')
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AccountDeleteService) private readonly accountDelete: AccountDeleteService,
  ) {}

  @Get('settings')
  @Can('shop:view')
  getSettings(): Promise<OwnerSettings> {
    return this.settings.getSettings();
  }

  @Put('settings/shop')
  @Can('settings:manage')
  saveShopFacts(@Body({ schema: ShopFactsSchema }) body: ShopFacts): Promise<OwnerSettings> {
    return this.settings.saveShopFacts(body);
  }

  @Put('hours')
  @Can('settings:manage')
  saveHours(@Body({ schema: HoursSettingsSchema }) body: HoursSettings): Promise<OwnerSettings> {
    return this.settings.saveHours(body);
  }

  @Put('settings/ordering')
  @Can('settings:manage')
  saveOrdering(
    @Body({ schema: OrderingInputSchema }) body: OrderingSettings,
  ): Promise<OwnerSettings> {
    return this.settings.saveOrdering(body);
  }

  @Put('settings/delivery')
  @Can('settings:manage')
  saveDelivery(
    @Body({ schema: DeliverySettingsSchema }) body: DeliverySettings,
  ): Promise<OwnerSettings> {
    return this.settings.saveDelivery(body);
  }

  @Put('settings/payments')
  @Can('settings:manage')
  savePayments(
    @Body({ schema: PaymentsInputSchema }) body: PaymentSettings,
  ): Promise<OwnerSettings> {
    return this.settings.savePayments(body);
  }

  @Get('profile')
  @Can('account')
  getProfile(@CurrentUser() user: CallerUser): Promise<OwnerProfile> {
    return this.settings.getProfile(user);
  }

  @Put('profile')
  @Can('account')
  saveProfile(
    @CurrentUser() user: CallerUser,
    @Body({ schema: SaveProfileInputSchema }) body: SaveProfileInput,
  ): Promise<OwnerProfile> {
    return this.settings.saveProfile(user, body);
  }

  @Get('notifications')
  @Can('shop:view')
  getNotificationPrefs(@CurrentUser() user: CallerUser): Promise<NotificationPrefs> {
    return this.settings.getNotificationPrefs(user);
  }

  @Put('notifications')
  @Can('settings:manage')
  saveNotificationPrefs(
    @CurrentUser() user: CallerUser,
    @Body({ schema: NotificationPrefsSchema }) body: NotificationPrefs,
  ): Promise<NotificationPrefs> {
    return this.settings.saveNotificationPrefs(user, body);
  }

  /** No self-delete at launch: the founder gets the request by email. Owner only (settings:manage). */
  @Post('account/delete-request')
  @Can('settings:manage')
  @HttpCode(200)
  requestAccountDelete(@CurrentUser() user: CallerUser): Promise<{ ok: true }> {
    return this.accountDelete.request(user);
  }
}
