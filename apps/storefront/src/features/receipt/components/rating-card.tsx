'use client';

import { useId, useState } from 'react';
import { words, type OrderReceipt } from '@smartapp/core';
import { useRateOrder } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Label } from '@smartapp/ui/components/label';
import { Rating, RatingItem } from '@smartapp/ui/components/rating';
import { Textarea } from '@smartapp/ui/components/textarea';
import { ExternalLink, Star } from 'lucide-react';

const CARD = 'rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6';

export interface RatingCardProps {
  readonly slug: string;
  readonly order: OrderReceipt;
  readonly googleReviewUrl: string | null;
}

/** Stars and a comment on a finished order, then thanks (and the shop's Google review link). */
export function RatingCard({ slug, order, googleReviewUrl }: RatingCardProps) {
  const rate = useRateOrder(slug, order.token);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const commentId = useId();
  const W = words.receipt.rating;

  const shownStars = order.rating?.stars ?? stars;
  const shownComment = order.rating?.comment ?? comment.trim();

  async function handleSend() {
    if (stars < 1) return;
    try {
      await rate.mutateAsync({ stars, comment: comment.trim() || null });
      setSent(true);
    } catch {
      // The message below says what to do.
    }
  }

  return (
    <section
      id="receipt-rating-section"
      aria-labelledby="receipt-rating-title"
      className={`${CARD} flex flex-col gap-4`}
    >
      <h2 id="receipt-rating-title" className="text-base font-semibold">
        {W.title}
      </h2>

      {order.rating || sent ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/50 p-4 text-center">
          <div className="flex gap-1 text-warning" aria-label={W.starsLabel(shownStars)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                aria-hidden="true"
                className={star <= shownStars ? 'size-6 fill-current' : 'size-6 text-muted'}
              />
            ))}
          </div>
          <p className="text-base font-semibold">{W.thanks}</p>
          {shownComment ? (
            <p className="text-sm break-words text-muted-foreground">“{shownComment}”</p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Rating
            value={stars}
            onValueChange={setStars}
            aria-label={W.stars}
            className="justify-center gap-2"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <RatingItem
                key={value}
                value={value}
                aria-label={W.starsLabel(value)}
                className="size-11"
              />
            ))}
          </Rating>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={commentId} className="text-sm text-muted-foreground">
              {W.comment}
            </Label>
            <Textarea
              id={commentId}
              placeholder={W.commentPlaceholder}
              maxLength={300}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none rounded-xl text-base"
            />
          </div>
          {rate.isError ? (
            <p role="alert" className="text-sm text-destructive-text">
              {W.failed}
            </p>
          ) : null}
          <Button
            type="button"
            id="receipt-submit-rating-button"
            onClick={handleSend}
            disabled={rate.isPending}
            className="h-11 w-full rounded-full text-base"
          >
            {W.send}
          </Button>
        </div>
      )}

      {googleReviewUrl ? (
        <Button
          variant="ghost"
          nativeButton={false}
          render={<a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" />}
          className="h-11 gap-1.5 self-center rounded-full px-4"
        >
          {W.google}
          <ExternalLink aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </section>
  );
}
