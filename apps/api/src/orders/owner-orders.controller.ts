import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  BasketLineSchema,
  BookingRulesSchema,
  CreateOwnerOrderInputSchema,
  EditOrderInputSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  OrderStatusEnum,
  OwnerOrderPayloadSchema,
  PauseModeEnum,
  PaymentMethodEnum,
  type BoardOrder,
  type BookingRules,
  type ChatSummary,
  type CreateOwnerOrderInput,
  type DayLoad,
  type EditOrderInput,
  type OpenState,
  type OwnerOrder,
  type OwnerOrderCreated,
  type Payment,
  type Quote,
  type Schedule,
} from '@smartapp/core';
import { z } from 'zod';
import { Can } from '../auth/decorators.js';
import { OrderReader } from './order-reader.js';
import { OrderSteps } from './order-steps.service.js';
import { OwnerOrdersService } from './owner-orders.service.js';

const ListQuerySchema = z
  .object({
    open: z.enum(['true']).optional(),
    from: IsoDateSchema.optional(),
    to: IsoDateSchema.optional(),
    // Any day (T126): a search that also finds finished orders; needs q.
    any: z.enum(['true']).optional(),
    q: z.string().max(60).optional(),
  })
  .refine(
    (v) =>
      v.open === 'true' ||
      (v.from !== undefined && v.to !== undefined) ||
      (v.any === 'true' && (v.q ?? '').trim() !== ''),
  );
type ListQuery = z.infer<typeof ListQuerySchema>;

const RangeQuerySchema = z.object({ from: IsoDateSchema, to: IsoDateSchema });
type RangeQuery = z.infer<typeof RangeQuerySchema>;

const FindQuerySchema = z.object({ code: z.string().min(1).max(300) });
type FindQuery = z.infer<typeof FindQuerySchema>;

const ProofQuerySchema = z.object({ path: z.string().min(1).max(200) });
type ProofQuery = z.infer<typeof ProofQuerySchema>;

const ReviewInputSchema = z
  .object({ approve: z.boolean(), rejectReason: z.string().max(200).optional() })
  .strict();
type ReviewInput = z.infer<typeof ReviewInputSchema>;

const RecordPaymentInputSchema = z
  .object({ method: PaymentMethodEnum, amount: z.number().int().positive().optional() })
  .strict();
type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;

const AdvanceInputSchema = z
  .object({
    toStatus: OrderStatusEnum,
    trackingUrl: z.union([z.url().max(500), z.literal('')]).optional(),
  })
  .strict();
type AdvanceInput = z.infer<typeof AdvanceInputSchema>;

const RescheduleInputSchema = z
  .object({ scheduledAt: IsoDateTimeSchema, override: z.boolean().optional() })
  .strict();
type RescheduleInput = z.infer<typeof RescheduleInputSchema>;

const NoteInputSchema = z.object({ note: z.string().max(300).nullable() }).strict();
type NoteInput = z.infer<typeof NoteInputSchema>;

const CancelInputSchema = z.object({ reason: z.string().max(200) }).strict();
type CancelInput = z.infer<typeof CancelInputSchema>;

const DeliveryInputSchema = z
  .object({
    provider: z.string().max(40).optional(),
    trackingUrl: z.union([z.url().max(500), z.literal('')]).optional(),
    riderName: z.string().max(60).optional(),
    riderPhone: z.string().max(20).optional(),
  })
  .strict();
type DeliveryInput = z.infer<typeof DeliveryInputSchema>;

const PauseInputSchema = z.object({ mode: PauseModeEnum }).strict();
type PauseInput = z.infer<typeof PauseInputSchema>;

const QuoteInputSchema = z
  .object({ payload: OwnerOrderPayloadSchema, orderId: z.string().max(40).optional() })
  .strict();
type QuoteInput = z.infer<typeof QuoteInputSchema>;

const ScheduleInputSchema = z
  .object({
    lines: z.array(BasketLineSchema.pick({ itemId: true, qty: true })).max(50),
    orderId: z.string().max(40).optional(),
  })
  .strict();
type ScheduleInput = z.infer<typeof ScheduleInputSchema>;

/**
 * api.md "Orders (owner)" (launch phase 5, T117). Reads need `shop:view`, changes `orders:manage`. An id
 * from another shop, or not an id at all, is Not found (rule 12).
 */
@Controller('owner')
export class OwnerOrdersController {
  constructor(
    @Inject(OwnerOrdersService) private readonly orders: OwnerOrdersService,
    @Inject(OrderSteps) private readonly steps: OrderSteps,
    @Inject(OrderReader) private readonly reader: OrderReader,
  ) {}

  @Get('orders')
  @Can('shop:view')
  listOrders(@Query({ schema: ListQuerySchema }) query: ListQuery): Promise<BoardOrder[]> {
    return this.orders.listOrders(
      query.open === 'true'
        ? { open: true, q: query.q }
        : query.any === 'true'
          ? { anyDay: true, q: query.q }
          : { from: query.from, to: query.to, q: query.q },
    );
  }

  @Get('orders/scheduled')
  @Can('shop:view')
  listScheduled(
    @Query({ schema: RangeQuerySchema }) query: RangeQuery,
  ): Promise<{ orders: BoardOrder[]; days: DayLoad[] }> {
    return this.orders.listScheduled(query.from, query.to);
  }

  @Get('orders/find')
  @Can('shop:view')
  findOrder(@Query({ schema: FindQuerySchema }) query: FindQuery): Promise<BoardOrder[]> {
    return this.orders.findOrder(query.code);
  }

  @Post('orders/quote')
  @HttpCode(200)
  @Can('orders:manage')
  quoteOwnerOrder(@Body({ schema: QuoteInputSchema }) body: QuoteInput): Promise<Quote> {
    return this.orders.quoteOwnerOrder(body.payload, body.orderId);
  }

  @Post('orders/schedule')
  @HttpCode(200)
  @Can('orders:manage')
  getOwnerSchedule(@Body({ schema: ScheduleInputSchema }) body: ScheduleInput): Promise<Schedule> {
    return this.orders.getOwnerSchedule(body.lines, body.orderId);
  }

  @Post('orders')
  @HttpCode(200)
  @Can('orders:manage')
  createOwnerOrder(
    @Body({ schema: CreateOwnerOrderInputSchema }) body: CreateOwnerOrderInput,
  ): Promise<OwnerOrderCreated> {
    return this.orders.createOwnerOrder(body);
  }

  @Get('orders/:id')
  @Can('shop:view')
  async getOrderDetail(@Param('id') id: string): Promise<OwnerOrder> {
    return this.reader.owner(await this.orders.getOrderDetail(id));
  }

  @Put('orders/:id')
  @Can('orders:manage')
  async editOrder(
    @Param('id') id: string,
    @Body({ schema: EditOrderInputSchema }) body: EditOrderInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(await this.orders.editOrder(id, body));
  }

  @Post('orders/:id/seen')
  @HttpCode(200)
  @Can('shop:view')
  markSeen(@Param('id') id: string): Promise<BoardOrder> {
    return this.orders.markSeen(id);
  }

  @Get('proofs')
  @Can('shop:view')
  getProofUrl(@Query({ schema: ProofQuerySchema }) query: ProofQuery): Promise<{ url: string }> {
    return this.orders.getProofUrl(query.path);
  }

  @Get('chats')
  @Can('shop:view')
  listChats(): Promise<ChatSummary[]> {
    return this.orders.listChats();
  }

  @Post('chats/:orderId/seen')
  @HttpCode(200)
  @Can('shop:view')
  markChatSeen(@Param('orderId') orderId: string): Promise<ChatSummary> {
    return this.orders.markChatSeen(orderId);
  }

  // The id is the order's: its waiting photo is the one answered.
  @Post('payments/:id/review')
  @HttpCode(200)
  @Can('orders:manage')
  reviewPayment(
    @Param('id') id: string,
    @Body({ schema: ReviewInputSchema }) body: ReviewInput,
  ): Promise<Payment> {
    return this.steps.reviewPayment(id, body.approve, body.rejectReason);
  }

  @Post('orders/:id/payments')
  @HttpCode(200)
  @Can('orders:manage')
  recordPayment(
    @Param('id') id: string,
    @Body({ schema: RecordPaymentInputSchema }) body: RecordPaymentInput,
  ): Promise<Payment> {
    return this.steps.recordPayment(id, body.method, body.amount);
  }

  @Post('orders/:id/payments/give-back')
  @HttpCode(200)
  @Can('orders:manage')
  recordGiveBack(@Param('id') id: string): Promise<Payment> {
    return this.steps.recordGiveBack(id);
  }

  @Post('orders/:id/advance')
  @HttpCode(200)
  @Can('orders:manage')
  async advanceOrder(
    @Param('id') id: string,
    @Body({ schema: AdvanceInputSchema }) body: AdvanceInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(await this.steps.advance(id, body.toStatus, body.trackingUrl));
  }

  @Post('orders/:id/recall')
  @HttpCode(200)
  @Can('orders:manage')
  async recallOrder(@Param('id') id: string): Promise<OwnerOrder> {
    return this.reader.owner(await this.steps.recall(id));
  }

  @Get('orders/:id/schedule')
  @Can('shop:view')
  getRescheduleSchedule(@Param('id') id: string): Promise<Schedule> {
    return this.orders.getRescheduleSchedule(id);
  }

  @Post('orders/:id/reschedule')
  @HttpCode(200)
  @Can('orders:manage')
  async rescheduleOrder(
    @Param('id') id: string,
    @Body({ schema: RescheduleInputSchema }) body: RescheduleInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(
      await this.orders.rescheduleOrder(id, body.scheduledAt, body.override ?? false),
    );
  }

  @Patch('orders/:id/note')
  @Can('orders:manage')
  async saveOwnerNote(
    @Param('id') id: string,
    @Body({ schema: NoteInputSchema }) body: NoteInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(await this.orders.saveOwnerNote(id, body.note));
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @Can('orders:manage')
  async cancelOrder(
    @Param('id') id: string,
    @Body({ schema: CancelInputSchema }) body: CancelInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(await this.steps.cancel(id, body.reason));
  }

  @Patch('orders/:id/delivery')
  @Can('orders:manage')
  async saveDeliveryInfo(
    @Param('id') id: string,
    @Body({ schema: DeliveryInputSchema }) body: DeliveryInput,
  ): Promise<OwnerOrder> {
    return this.reader.owner(await this.orders.saveDeliveryInfo(id, body));
  }

  @Get('booking-rules')
  @Can('shop:view')
  getBookingRules(): Promise<BookingRules> {
    return this.orders.getBookingRules();
  }

  @Put('booking-rules')
  @Can('orders:manage')
  saveBookingRules(
    @Body({ schema: BookingRulesSchema }) body: BookingRules,
  ): Promise<BookingRules> {
    return this.orders.saveBookingRules(body);
  }

  @Post('pause')
  @HttpCode(200)
  @Can('orders:manage')
  setPause(@Body({ schema: PauseInputSchema }) body: PauseInput): Promise<OpenState> {
    return this.orders.setPause(body.mode);
  }
}
