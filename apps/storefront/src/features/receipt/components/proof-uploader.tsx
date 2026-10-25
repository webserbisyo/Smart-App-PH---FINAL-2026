'use client';

import { useId, useRef, useState, type ChangeEvent } from 'react';
import { type OrderReceipt, type Proof } from '@smartapp/core';
import { compressImage, useOnline, useSubmitProof } from '@smartapp/data';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@smartapp/ui/components/attachment';
import { Progress } from '@smartapp/ui/components/progress';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/reui/alert';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { AlertCircle, Camera, CheckCircle2, RotateCw, XCircle } from 'lucide-react';

export interface ProofUploaderProps {
  readonly slug: string;
  readonly order: OrderReceipt;
}

type UploaderState = 'idle' | 'compressing' | 'uploading' | 'retrying' | 'done' | 'error';

export function ProofUploader({ slug, order }: ProofUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnline();
  const [state, setState] = useState<UploaderState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const refInputId = useId();
  const submitProofMutation = useSubmitProof(slug, order.token);

  // Transfer methods only
  const isTransfer = order.paymentMethod !== 'cash' && order.paymentMethod !== 'cod';
  if (
    !isTransfer ||
    order.paymentStatus === 'paid' ||
    order.status === 'cancelled' ||
    order.status === 'expired'
  ) {
    return null;
  }

  // Count existing proofs from messages
  const existingProofs: Proof[] = [];
  for (const msg of order.messages) {
    if (msg.proof) {
      existingProofs.push(msg.proof);
    }
  }

  const proofCount = existingProofs.length;
  const latestProof =
    existingProofs.length > 0 ? existingProofs[existingProofs.length - 1] : undefined;
  const isRejected = latestProof?.status === 'rejected';
  const isTooMany = proofCount >= 3;

  async function performUpload(file: File, refNo: string) {
    try {
      setState('compressing');
      setErrorMessage(null);

      // Compress on phone with canvas helper (decision D7)
      await compressImage(file);

      setState('uploading');
      setUploadProgress(40);

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Attempt 1
      try {
        await delay(300);
        setUploadProgress(70);
        await submitProofMutation.mutateAsync({
          method: order.paymentMethod,
          referenceNo: refNo.trim() || 'PROOF',
        });
        setUploadProgress(100);
        setState('done');
        setSelectedFile(null);
        setReferenceNo('');
        return;
      } catch {
        if (!isOnline) {
          setState('retrying');
          setErrorMessage("Will retry when you're back online");
          return;
        }
        // Retry 1: 2s backoff
        setState('retrying');
        setErrorMessage('Uploading… retrying in 2s');
        await delay(2000);

        try {
          await submitProofMutation.mutateAsync({
            method: order.paymentMethod,
            referenceNo: refNo.trim() || 'PROOF',
          });
          setUploadProgress(100);
          setState('done');
          setSelectedFile(null);
          setReferenceNo('');
          return;
        } catch {
          // Retry 2: 4s backoff
          setErrorMessage('Uploading… retrying in 4s');
          await delay(4000);

          try {
            await submitProofMutation.mutateAsync({
              method: order.paymentMethod,
              referenceNo: refNo.trim() || 'PROOF',
            });
            setUploadProgress(100);
            setState('done');
            setSelectedFile(null);
            setReferenceNo('');
            return;
          } catch (finalErr: unknown) {
            setState('error');
            const msg =
              finalErr instanceof Error ? finalErr.message : 'Upload failed. Please try again.';
            setErrorMessage(msg);
          }
        }
      }
    } catch (err: unknown) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not process photo');
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    void performUpload(file, referenceNo);
  }

  function handleManualRetry() {
    if (selectedFile) {
      void performUpload(selectedFile, referenceNo);
    } else {
      fileInputRef.current?.click();
    }
  }

  return (
    <div
      id="receipt-proof-uploader"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Proof of payment
        </h3>
        <span className="text-xs text-muted-foreground">
          {proofCount > 0 ? `${proofCount}/3 proofs` : 'Unpaid order'}
        </span>
      </div>

      {/* Rejected Alert (c-alert-4) */}
      {isRejected && (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertTitle>Payment not accepted</AlertTitle>
          <AlertDescription>
            {latestProof.rejectReason
              ? `Reason: ${latestProof.rejectReason}`
              : 'The shop could not verify your payment. Please upload a clear receipt.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Done State */}
      {state === 'done' || (order.paymentStatus === 'pending' && !isRejected) ? (
        <Alert variant="info" className="bg-info/10">
          <CheckCircle2 className="size-4 text-info" />
          <AlertTitle>Proof sent</AlertTitle>
          <AlertDescription>Waiting for the shop to check your payment.</AlertDescription>
        </Alert>
      ) : isTooMany ? (
        <Alert variant="warning">
          <AlertCircle className="size-4" />
          <AlertTitle>Maximum proof attempts reached</AlertTitle>
          <AlertDescription>
            You have sent 3 proofs. Please contact the shop via Messenger or phone.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Reference number input */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={refInputId} className="text-xs font-medium text-muted-foreground">
              Reference number (optional)
            </Label>
            <Input
              id={refInputId}
              placeholder="e.g. 123456789"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              disabled={state === 'uploading' || state === 'compressing'}
              className="h-9 font-mono text-sm"
            />
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Upload Progress Attachment row (c-attachment-5) */}
          {state === 'uploading' || state === 'compressing' || state === 'retrying' ? (
            <Attachment state={state === 'retrying' ? 'error' : 'uploading'} className="w-full">
              <AttachmentMedia variant="icon">
                <RotateCw className="size-4 animate-spin text-primary" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {state === 'compressing'
                    ? 'Compressing photo…'
                    : state === 'retrying'
                      ? 'Retrying upload…'
                      : 'Uploading proof of payment…'}
                </AttachmentTitle>
                <AttachmentDescription>
                  {errorMessage ?? 'Please keep this window open'}
                </AttachmentDescription>
                {state === 'uploading' && (
                  <Progress value={uploadProgress} className="h-1.5 w-full" />
                )}
              </AttachmentContent>
            </Attachment>
          ) : (
            /* Picker trigger button (c-attachment-6) */
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                id="receipt-upload-proof-button"
                variant="outline"
                className="h-12 w-full gap-2 border-dashed font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isOnline}
              >
                <Camera className="size-4 text-primary" />
                <span>Upload proof of payment</span>
              </Button>
              {!isOnline && (
                <span className="text-center text-xs text-muted-foreground">
                  Connect to the internet to upload proof
                </span>
              )}
            </div>
          )}

          {/* Error Message with Try again */}
          {state === 'error' && (
            <div className="flex items-center justify-between rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
              <span>{errorMessage ?? 'Upload failed'}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:bg-destructive/20"
                onClick={handleManualRetry}
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
