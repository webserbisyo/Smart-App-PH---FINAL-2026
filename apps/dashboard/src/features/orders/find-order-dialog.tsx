import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CameraIcon, SearchIcon, SearchXIcon } from 'lucide-react';
import type { BoardOrder } from '@smartapp/core';
import { errorWords, normalizeFindCode, ordersWords, parseFindInput } from '@smartapp/core';
import { errorCodeOf, useFindOrder } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { Notice } from '@/app/notice';
import { barcodeDetector, scanQr } from '@/app/orders/barcode-scan';
import { OrderTicket } from '@/app/orders/order-ticket';
import { useNow } from '@/app/orders/use-now';

export interface FindOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}

/** Find order (O5): the 4-character pickup code from the customer's receipt, the order number, or a scan. */
export function FindOrderDialog({ open, onOpenChange, slug }: FindOrderDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={ordersWords.find.title}
      description={ordersWords.find.desc}
      scroll
    >
      {open && <FindOrderForm slug={slug} onClose={() => onOpenChange(false)} />}
    </ResponsiveDialog>
  );
}

type Problem = 'none' | 'not_found' | 'camera' | null;

function FindOrderForm({ slug, onClose }: { slug: string; onClose: () => void }) {
  const navigate = useNavigate();
  const now = useNow(30_000);
  const [text, setText] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [problem, setProblem] = React.useState<Problem>(null);
  const [scanning, setScanning] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canScan = React.useMemo(() => barcodeDetector() !== null, []);

  const { data: matches, isFetching, isError, error } = useFindOrder(slug, query);

  const openOrder = React.useCallback(
    (order: BoardOrder) => {
      onClose();
      void navigate({
        to: '/orders/$orderId',
        params: { orderId: order.id },
        search: { view: 'now' },
      });
    },
    [navigate, onClose],
  );

  // One match opens the order at once; its next step (Start, Mark ready, Complete) is ready there.
  const only = matches?.length === 1 ? matches[0] : undefined;
  React.useEffect(() => {
    if (only) openOrder(only);
  }, [only, openOrder]);

  const search = React.useCallback(
    (raw: string) => {
      const parsed = parseFindInput(raw);
      if (!parsed) {
        setQuery('');
        setProblem('none');
        return;
      }
      if (parsed.kind === 'receipt') {
        // Another shop's receipt is Not found (rule 12); the server checks it again.
        if (parsed.slug !== slug) {
          setQuery('');
          setProblem('not_found');
          return;
        }
        setProblem(null);
        setQuery(parsed.token);
        return;
      }
      setProblem(null);
      setQuery(normalizeFindCode(raw));
    },
    [slug],
  );

  React.useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;
    const controller = new AbortController();
    scanQr(video, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setScanning(false);
        if (value) search(value);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setScanning(false);
        setProblem('camera');
      });
    return () => controller.abort();
  }, [scanning, search]);

  const showNone = problem === 'none' || (query !== '' && !isFetching && matches?.length === 0);

  return (
    <div className="space-y-4 pb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(text);
        }}
        className="space-y-3"
      >
        <Field>
          <FieldLabel htmlFor="find-order-code">{ordersWords.find.label}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="find-order-code"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setProblem(null);
              }}
              placeholder={ordersWords.find.placeholder}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              autoFocus
              className="h-11 flex-1 text-base uppercase"
            />
            <Button type="submit" className="h-11 gap-1.5 px-4" disabled={text.trim() === ''}>
              <SearchIcon className="size-4" aria-hidden="true" />
              {ordersWords.find.search}
            </Button>
          </div>
          {scanning && <FieldDescription>{ordersWords.find.scanning}</FieldDescription>}
        </Field>
      </form>

      {canScan &&
        (scanning ? (
          <div className="space-y-2">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-square w-full rounded-xl bg-muted object-cover"
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => setScanning(false)}
            >
              {ordersWords.find.stopScan}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => {
              setProblem(null);
              setScanning(true);
            }}
          >
            <CameraIcon className="size-4" aria-hidden="true" />
            {ordersWords.find.scan}
          </Button>
        ))}

      {problem === 'camera' && (
        <Notice tone="warning" icon={<CameraIcon className="size-4" />}>
          {ordersWords.find.cameraBlocked}
        </Notice>
      )}
      {problem === 'not_found' && (
        <Notice tone="error" icon={<SearchXIcon className="size-4" />}>
          {ordersWords.find.notFound}
        </Notice>
      )}

      {query !== '' && isFetching && <Skeleton className="h-24 w-full rounded-xl" />}
      {query !== '' && isError && (
        <Notice tone="error" icon={<SearchXIcon className="size-4" />}>
          {errorWords(errorCodeOf(error))}
        </Notice>
      )}
      {showNone && problem !== 'not_found' && (
        <Notice tone="info" icon={<SearchXIcon className="size-4" />}>
          {ordersWords.find.none}
        </Notice>
      )}

      {!isFetching && matches && matches.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {ordersWords.find.many(matches.length)}
          </p>
          {matches.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              size="card"
              now={now}
              onClick={() => openOrder(order)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
