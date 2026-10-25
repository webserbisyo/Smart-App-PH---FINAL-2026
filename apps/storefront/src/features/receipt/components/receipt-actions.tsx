'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPeso, type OrderReceipt, type Storefront } from '@smartapp/core';
import { useBasket, useRateOrder } from '@smartapp/data';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Rating, RatingItem } from '@smartapp/ui/components/rating';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import {
  Bell,
  Check,
  Copy,
  Download,
  ExternalLink,
  MoreVertical,
  Printer,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { buildMessengerOrderText } from '../receipt-rules';

export interface ReceiptActionsProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly storefront: Storefront;
  readonly receiptUrl: string;
}

export function ReceiptActions({ slug, order, storefront, receiptUrl }: ReceiptActionsProps) {
  const router = useRouter();
  const basket = useBasket(slug);
  const rateOrderMutation = useRateOrder(slug, order.token);

  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [copiedMenu, setCopiedMenu] = useState(false);

  // Install card state
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(`install-dismissed-${slug}`) === 'true';
    } catch {
      return false;
    }
  });

  const ratingId = useId();

  const isCompleted = order.status === 'completed';
  const hasStamps = storefront.stampCard.status === 'on';

  // More menu handlers
  async function handleCopyDetails() {
    const text = buildMessengerOrderText({
      orderNo: order.orderNo,
      lineCount: order.lines.length,
      totalFormatted: formatPeso(order.totals.total),
      receiptUrl,
    });
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedMenu(true);
        setTimeout(() => setCopiedMenu(false), 3000);
      }
    } catch {
      // Ignored
    }
  }

  function handleSavePng() {
    const imgUrl = `/${slug}/o/${order.token}/image`;
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `receipt-${order.orderNo}.png`;
    link.click();
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${storefront.info.name} Order #${order.orderNo}`,
          text: `Receipt for order #${order.orderNo}`,
          url: receiptUrl,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    try {
      await navigator.clipboard?.writeText(receiptUrl);
      setCopiedMenu(true);
      setTimeout(() => setCopiedMenu(false), 3000);
    } catch {
      // Ignored
    }
  }

  function handleOrderAgain() {
    for (const line of order.lines) {
      basket.add({
        itemId: line.itemId,
        variantId: line.variantId,
        optionIds: [...line.optionIds],
        note: line.note,
        qty: line.qty,
      });
    }
    router.push(`/${slug}/menu`);
  }

  async function handleSendRating() {
    if (ratingStars < 1) return;
    try {
      await rateOrderMutation.mutateAsync({
        stars: ratingStars,
        comment: ratingComment.trim() || null,
      });
      setRatingSubmitted(true);
    } catch {
      // Error handled
    }
  }

  function handleDismissInstall() {
    setInstallDismissed(true);
    try {
      localStorage.setItem(`install-dismissed-${slug}`, 'true');
    } catch {
      // Ignored
    }
  }

  return (
    <div id="receipt-actions-section" className="flex flex-col gap-4">
      {/* Action Row: More menu, Order again */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          id="receipt-order-again-button"
          variant="secondary"
          onClick={handleOrderAgain}
          className="h-10 flex-1 gap-2 font-medium"
        >
          <RefreshCw className="size-4" />
          <span>Order again</span>
        </Button>

        {/* More Actions Dropdown (c-dropdown-menu-13) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="receipt-more-actions-button"
            className="flex size-10 items-center justify-center rounded-lg border bg-background text-foreground shadow-2xs hover:bg-muted"
            aria-label="More actions"
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={handleCopyDetails} className="cursor-pointer gap-2">
              {copiedMenu ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              <span>{copiedMenu ? 'Copied' : 'Copy order details'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSavePng} className="cursor-pointer gap-2">
              <Download className="size-4" />
              <span>Save receipt (PNG)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} className="cursor-pointer gap-2">
              <Printer className="size-4" />
              <span>Print or Save PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="cursor-pointer gap-2">
              <Share2 className="size-4" />
              <span>Share receipt link</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notify Me Switch (c-switch-2) */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Bell className="size-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">Notify me</span>
            <span className="text-xs text-muted-foreground">
              {notifyPush ? "We'll tell you when it's ready" : 'Get browser updates on this order'}
            </span>
          </div>
        </div>
        <Switch
          id="receipt-notify-switch"
          checked={notifyPush}
          onCheckedChange={setNotifyPush}
          aria-label="Order notifications toggle"
        />
      </div>

      {/* Suki Stamp Card Info (T12 bridge) */}
      {hasStamps && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-primary" />
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">Suki Stamp Rewards</span>
              <span className="text-muted-foreground">
                {isCompleted
                  ? 'This order earned 1 stamp!'
                  : 'This order earns 1 stamp · Pending until completed'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rating & Review (when completed) */}
      {isCompleted && (
        <div
          id="receipt-rating-section"
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs"
        >
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Rate your experience
          </h3>

          {order.rating || ratingSubmitted ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/30 p-3 text-center">
              <div className="flex gap-1 text-primary">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`size-5 ${star <= (order.rating?.stars ?? ratingStars) ? 'fill-primary' : 'text-muted'}`}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold">Thanks for rating!</p>
              {(order.rating?.comment || ratingComment) && (
                <p className="text-xs text-muted-foreground italic">
                  "{order.rating?.comment ?? ratingComment}"
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Rating stars */}
              <div className="flex items-center justify-center p-2">
                <Rating
                  id={ratingId}
                  value={ratingStars}
                  onValueChange={setRatingStars}
                  className="gap-2"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <RatingItem key={value} value={value} className="size-7" />
                  ))}
                </Rating>
              </div>

              {/* Comment textarea */}
              <Textarea
                id="receipt-rating-comment"
                placeholder="Leave an optional note (up to 300 characters)…"
                maxLength={300}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={2}
                className="resize-none text-xs"
              />

              <Button
                type="button"
                id="receipt-submit-rating-button"
                onClick={handleSendRating}
                disabled={rateOrderMutation.isPending}
                className="h-9 w-full font-medium"
              >
                Send rating
              </Button>
            </div>
          )}

          {/* Google Review link if configured */}
          {storefront.info.contact.googleReviewUrl && (
            <a
              href={storefront.info.contact.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 pt-1 text-xs font-medium text-primary hover:underline"
            >
              <span>Review us on Google</span>
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {/* Install App Card (c-alert-18 pattern) */}
      {!installDismissed && (
        <Alert id="receipt-install-card" variant="info" className="relative p-3.5">
          <div className="flex w-full items-start justify-between">
            <div className="flex flex-col gap-1 pr-6">
              <AlertTitle className="text-xs font-semibold">
                Add {storefront.info.name} to your home screen
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Order faster next time and keep receipts accessible offline.
              </AlertDescription>
            </div>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss install notice"
            >
              <X className="size-4" />
            </button>
          </div>
        </Alert>
      )}
    </div>
  );
}
