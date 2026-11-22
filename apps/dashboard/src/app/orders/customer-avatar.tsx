import type { BoardOrder } from '@smartapp/core';
import { CUSTOMER_LOOK, customerKind } from './customer-kind.js';
import { CustomerFace } from '../owner-avatar.js';

/** A member's face, or the customer's initials tinted by who they are (first order, guest). */
export function CustomerAvatar({
  order,
  size = 'sm',
  className,
}: {
  order: BoardOrder;
  size?: 'sm' | 'default';
  className?: string | undefined;
}) {
  return (
    <CustomerFace
      avatar={order.customerAvatar}
      name={order.customerName}
      size={size}
      className={className}
      initialsClassName={CUSTOMER_LOOK[customerKind(order)].avatar}
    />
  );
}
