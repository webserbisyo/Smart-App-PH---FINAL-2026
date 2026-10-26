'use client';

import { useId, useRef, useState, type ChangeEvent } from 'react';
import {
  errorWords,
  formatFileSize,
  imageFormatName,
  words,
  type OrderReceipt,
  type Proof,
} from '@smartapp/core';
import {
  blobToDataUrl,
  compressImage,
  errorCodeOf,
  useOnline,
  useSubmitProof,
} from '@smartapp/data';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@smartapp/ui/components/attachment';
import { Progress } from '@smartapp/ui/components/progress';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Spinner } from '@smartapp/ui/components/spinner';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  RotateCw,
  SendIcon,
  XCircle,
  XIcon,
} from 'lucide-react';

export interface ProofUploaderProps {
  readonly slug: string;
  readonly order: OrderReceipt;
}

type UploaderState = 'idle' | 'compressing' | 'ready' | 'uploading' | 'retrying' | 'done' | 'error';

interface PickedPhoto {
  readonly blob: Blob;
  readonly url: string;
  readonly fromSize: number;
}

const MAX_PROOFS = 3;
// Automatic retries after a network failure, while online (T10).
const RETRY_DELAYS_MS = [2000, 4000, 8000] as const;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function waitUntilOnline(): Promise<void> {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) =>
    window.addEventListener('online', () => resolve(), { once: true }),
  );
}

/**
 * Proof of payment (decision R33): pick a photo, see it made smaller on the phone ("4.2 MB to 310 KB ·
 * WebP") with Remove, add the optional reference, then Send proof. c-attachment-6 picker and preview,
 * c-attachment-5 progress row, inside the payment card.
 */
export function ProofUploader({ slug, order }: ProofUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnline();
  const [state, setState] = useState<UploaderState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [picked, setPicked] = useState<PickedPhoto | null>(null);

  const refInputId = useId();
  const submitProof = useSubmitProof(slug, order.token);
  const W = words.receipt.proof;

  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') {
    return null;
  }

  const proofs: Proof[] = [];
  for (const msg of order.messages) {
    if (msg.proof) proofs.push(msg.proof);
  }
  const latestProof = proofs[proofs.length - 1];
  const isRejected = order.paymentStatus === 'unpaid' && latestProof?.status === 'rejected';
  const isTooMany = proofs.length >= MAX_PROOFS;
  const busy = state === 'compressing' || state === 'uploading' || state === 'retrying';

  async function pickPhoto(file: File) {
    setNote(null);
    setState('compressing');
    try {
      const blob = await compressImage(file);
      setPicked({ blob, url: await blobToDataUrl(blob), fromSize: file.size });
      setState('ready');
    } catch {
      setPicked(null);
      setState('error');
      setNote(W.unreadable);
    }
  }

  async function sendProof(photo: PickedPhoto) {
    setNote(null);
    setState('uploading');
    setUploadProgress(30);
    const send = () =>
      submitProof.mutateAsync({
        method: order.paymentMethod,
        referenceNo: referenceNo.trim() || 'PROOF',
        file: photo.blob,
      });

    for (let attempt = 0; ; attempt += 1) {
      try {
        setUploadProgress(70);
        await send();
        setUploadProgress(100);
        setState('done');
        setPicked(null);
        setReferenceNo('');
        return;
      } catch (err: unknown) {
        const code = errorCodeOf(err);
        const wait = RETRY_DELAYS_MS[attempt];
        // Only a lost connection is worth retrying; a shop rule (duplicate reference, 3 proofs) is not.
        if (code !== 'unknown' || wait === undefined) {
          setState('error');
          setNote(code === 'unknown' ? W.failed : errorWords(code));
          return;
        }
        setState('retrying');
        if (!navigator.onLine) {
          setNote(W.waitOnline);
          await waitUntilOnline();
        } else {
          setNote(W.retrying(wait / 1000));
          await delay(wait);
        }
      }
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void pickPhoto(file);
  }

  function removePhoto() {
    setPicked(null);
    setNote(null);
    setState('idle');
  }

  function handleTryAgain() {
    if (picked) void sendProof(picked);
    else fileInputRef.current?.click();
  }

  const sent = state === 'done' || order.paymentStatus === 'pending';
  const sizeLine = picked
    ? W.sizeSaved(
        formatFileSize(picked.fromSize),
        formatFileSize(picked.blob.size),
        imageFormatName(picked.blob.type),
      )
    : '';

  return (
    <div id="receipt-proof-uploader" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{W.title}</h2>
        {proofs.length > 0 ? (
          <span className="text-xs text-muted-foreground tabular">
            {W.count(proofs.length, MAX_PROOFS)}
          </span>
        ) : null}
      </div>

      {isRejected && !sent ? (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>{W.rejectedTitle}</AlertTitle>
          <AlertDescription>
            {latestProof.rejectReason
              ? W.rejectedReason(latestProof.rejectReason)
              : W.rejectedNoReason}
          </AlertDescription>
        </Alert>
      ) : null}

      {sent ? (
        <Alert variant="info">
          <CheckCircle2 />
          <AlertTitle>{W.sentTitle}</AlertTitle>
          <AlertDescription>
            {W.sentText} {W.waiting}.
          </AlertDescription>
        </Alert>
      ) : isTooMany ? (
        <Alert variant="warning">
          <AlertCircle />
          <AlertTitle>{W.tooManyTitle(MAX_PROOFS)}</AlertTitle>
          <AlertDescription>{W.tooManyText}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label={W.upload}
            onChange={handleFileChange}
          />

          {state === 'uploading' || state === 'retrying' ? (
            <Attachment state={state === 'retrying' ? 'error' : 'uploading'} className="w-full">
              {picked ? (
                <AttachmentMedia variant="image" className="w-14">
                  <img src={picked.url} alt="" width={56} height={56} decoding="async" />
                </AttachmentMedia>
              ) : (
                <AttachmentMedia variant="icon">
                  <RotateCw className="size-4 text-primary motion-safe:animate-spin" />
                </AttachmentMedia>
              )}
              <AttachmentContent>
                <AttachmentTitle>{W.uploading}</AttachmentTitle>
                <AttachmentDescription>{note ?? W.keepOpen}</AttachmentDescription>
                {state === 'uploading' ? (
                  <Progress value={uploadProgress} className="progress-thin w-full" />
                ) : null}
              </AttachmentContent>
            </Attachment>
          ) : picked ? (
            // The photo before it is sent: how much smaller it got, and Remove.
            <Attachment state="done" className="w-full">
              <AttachmentMedia variant="image" className="w-14">
                <img src={picked.url} alt={W.photo} width={56} height={56} decoding="async" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{W.photo}</AttachmentTitle>
                <AttachmentDescription className="flex items-center gap-1 tabular">
                  {sizeLine}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  type="button"
                  size="icon"
                  className="size-11 rounded-full"
                  aria-label={W.remove}
                  onClick={removePhoto}
                >
                  <XIcon aria-hidden="true" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ) : (
            <Attachment state="idle" className="w-full">
              <AttachmentMedia>
                {state === 'compressing' ? (
                  <Spinner aria-hidden="true" />
                ) : (
                  <Camera aria-hidden="true" className="text-primary" />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {state === 'compressing' ? W.compressing : isRejected ? W.uploadAgain : W.upload}
                </AttachmentTitle>
                <AttachmentDescription>{isOnline ? W.pickHint : W.offline}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                id="receipt-upload-proof-button"
                type="button"
                aria-label={isRejected ? W.uploadAgain : W.upload}
                disabled={!isOnline || busy}
                onClick={() => fileInputRef.current?.click()}
              />
            </Attachment>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={refInputId} className="text-sm text-muted-foreground">
              {W.reference}
            </Label>
            <Input
              id={refInputId}
              inputMode="numeric"
              autoComplete="off"
              placeholder={W.referencePlaceholder}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              disabled={busy}
              className="h-11 rounded-xl text-base tabular"
            />
          </div>

          {picked && state === 'ready' ? (
            <Button
              type="button"
              id="receipt-send-proof"
              size="lg"
              className="h-12 w-full gap-2 rounded-full text-base font-semibold"
              disabled={!isOnline}
              onClick={() => void sendProof(picked)}
            >
              <SendIcon aria-hidden="true" className="size-4" />
              {W.send}
            </Button>
          ) : null}

          {state === 'error' ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-2xl bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              <span className="min-w-0">{note ?? W.failed}</span>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 rounded-full px-4"
                onClick={handleTryAgain}
              >
                {W.tryAgain}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
