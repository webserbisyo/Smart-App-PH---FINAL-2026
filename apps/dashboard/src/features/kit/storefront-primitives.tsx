import { useState } from 'react';
import {
  BellIcon,
  BikeIcon,
  BoldIcon,
  FileImageIcon,
  ItalicIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@smartapp/ui/components/alert-dialog';
import { AspectRatio } from '@smartapp/ui/components/aspect-ratio';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@smartapp/ui/components/attachment';
import {
  Banner,
  BannerContent,
  BannerDescription,
  BannerIcon,
  BannerTitle,
} from '@smartapp/ui/components/banner';
import { Button } from '@smartapp/ui/components/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@smartapp/ui/components/carousel';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import {
  CheckboxGroup,
  CheckboxGroupDescription,
  CheckboxGroupItem,
  CheckboxGroupLabel,
  CheckboxGroupList,
} from '@smartapp/ui/components/checkbox-group';
import { CircularProgressCombined } from '@smartapp/ui/components/circular-progress';
import { ClientOnly } from '@smartapp/ui/components/client-only';
import { DirectionProvider } from '@smartapp/ui/components/direction';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@smartapp/ui/components/input-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@smartapp/ui/components/input-otp';
import { Label } from '@smartapp/ui/components/label';
import { Marker, MarkerContent, MarkerIcon } from '@smartapp/ui/components/marker';
import { MaskInput } from '@smartapp/ui/components/mask-input';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from '@smartapp/ui/components/message';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Pending } from '@smartapp/ui/components/pending';
import { Progress, ProgressLabel, ProgressValue } from '@smartapp/ui/components/progress';
import { QRCode, QRCodeSkeleton, QRCodeSvg } from '@smartapp/ui/components/qr-code';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Rating, RatingItem } from '@smartapp/ui/components/rating';
import { Scroller } from '@smartapp/ui/components/scroller';
import { SkipNav } from '@smartapp/ui/components/skip-nav';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Status, StatusIndicator, StatusLabel } from '@smartapp/ui/components/status';
import { Switch } from '@smartapp/ui/components/switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@smartapp/ui/components/table';
import { Textarea } from '@smartapp/ui/components/textarea';
import { notify } from '@smartapp/ui/compositions/notify';
import { Toggle } from '@smartapp/ui/components/toggle';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { VisuallyHiddenInput } from '@smartapp/ui/components/visually-hidden-input';
import { KitSection } from './kit-section.js';

const SHADCN = 'shadcn (base-nova)';
const DICE = 'DiceUI';
const P = (name: string) => `packages/ui/src/components/${name}.tsx`;

const HOURS = [
  { day: 'Mon to Fri', time: '10:00 AM to 9:00 PM' },
  { day: 'Saturday', time: '10:00 AM to 10:00 PM' },
  { day: 'Sunday', time: 'Closed' },
] as const;

const ADD_ONS = [
  { value: 'cheese', label: 'Extra cheese', price: '+₱25' },
  { value: 'bacon', label: 'Bacon', price: '+₱35' },
  { value: 'egg', label: 'Fried egg', price: '+₱20' },
] as const;

const CHIPS = ['Burgers', 'Chicken', 'Rice meals', 'Fries', 'Combos', 'Drinks', 'Shakes', 'Sides'];

export function StorefrontPrimitiveSections() {
  const [otp, setOtp] = useState('');
  const [addOns, setAddOns] = useState<string[]>(['cheese']);
  const [rating, setRating] = useState(4);
  const [pending, setPending] = useState(false);
  const [phone, setPhone] = useState('');
  const [notifyMe, setNotifyMe] = useState(true);

  function fakeSubmit(): void {
    setPending(true);
    window.setTimeout(() => setPending(false), 1500);
  }

  return (
    <>
      <KitSection title="Input OTP" library={SHADCN} path={P('input-otp')} usedIn="kit">
        <div className="flex flex-col gap-3">
          <InputOTP maxLength={6} value={otp} onChange={setOtp} inputMode="numeric">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          <InputOTP maxLength={6} disabled>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </KitSection>

      <KitSection title="Textarea" library={SHADCN} path={P('textarea')} usedIn="kit">
        <div className="grid max-w-md gap-3">
          <Textarea placeholder="Note for the shop (up to 120 characters)" maxLength={120} />
          <Textarea disabled defaultValue="Disabled" />
          <Textarea aria-invalid="true" defaultValue="Too long" />
        </div>
      </KitSection>

      <KitSection title="Radio group" library={SHADCN} path={P('radio-group')} usedIn="kit">
        <RadioGroup defaultValue="pickup" className="max-w-xs">
          {['pickup', 'delivery', 'dine-in'].map((v) => (
            <div key={v} className="flex items-center gap-3">
              <RadioGroupItem value={v} id={`kit-radio-${v}`} />
              <Label htmlFor={`kit-radio-${v}`} className="capitalize">
                {v.replace('-', ' ')}
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <RadioGroupItem value="none" id="kit-radio-disabled" disabled />
            <Label htmlFor="kit-radio-disabled">Shipping (not available)</Label>
          </div>
        </RadioGroup>
      </KitSection>

      <KitSection title="Checkbox" library={SHADCN} path={P('checkbox')} usedIn="kit">
        <div className="flex flex-col gap-3">
          <Label className="flex items-center gap-3">
            <Checkbox defaultChecked /> Remember my details
          </Label>
          <Label className="flex items-center gap-3">
            <Checkbox /> Send me order updates
          </Label>
          <Label className="flex items-center gap-3">
            <Checkbox disabled /> Disabled
          </Label>
        </div>
      </KitSection>

      <KitSection title="Toggle" library={SHADCN} path={P('toggle')} usedIn="kit">
        <div className="flex gap-2">
          <Toggle aria-label="Bold">
            <BoldIcon />
          </Toggle>
          <Toggle variant="outline" aria-label="Italic" defaultPressed>
            <ItalicIcon />
          </Toggle>
          <Toggle disabled aria-label="Disabled">
            <BoldIcon />
          </Toggle>
        </div>
      </KitSection>

      <KitSection title="Toggle group" library={SHADCN} path={P('toggle-group')} usedIn="kit">
        <ToggleGroup defaultValue={['m']} variant="outline">
          {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
            <ToggleGroupItem
              key={size}
              value={size.toLowerCase()}
              disabled={size === 'XL'}
              className="min-w-11"
            >
              {size}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </KitSection>

      <KitSection title="Table" library={SHADCN} path={P('table')} usedIn="kit">
        <Table className="max-w-md">
          <TableCaption>Opening hours</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HOURS.map((row) => (
              <TableRow key={row.day}>
                <TableCell>{row.day}</TableCell>
                <TableCell className="text-right">{row.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KitSection>

      <KitSection title="Progress" library={SHADCN} path={P('progress')} usedIn="kit">
        <div className="grid max-w-md gap-4">
          <Progress value={65}>
            <ProgressLabel>Time left to pay</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={100}>
            <ProgressLabel>Done</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      </KitSection>

      <KitSection title="Spinner" library={SHADCN} path={P('spinner')} usedIn="kit">
        <div className="flex items-center gap-4">
          <Spinner />
          <Spinner className="size-6 text-shop-10" />
          <Button disabled>
            <Spinner /> Placing order
          </Button>
        </div>
      </KitSection>

      <KitSection
        title="Aspect ratio"
        library={SHADCN}
        path={P('aspect-ratio')}
        usedIn="shop-image, kit"
      >
        <div className="grid max-w-md grid-cols-2 gap-3">
          <AspectRatio ratio={1} className="rounded-lg bg-muted" />
          <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted" />
        </div>
      </KitSection>

      <KitSection title="Native select" library={SHADCN} path={P('native-select')} usedIn="kit">
        <div className="grid max-w-xs gap-3">
          <NativeSelect defaultValue="1215" aria-label="Pickup time">
            <NativeSelectOption value="1215">Today, 12:15 PM</NativeSelectOption>
            <NativeSelectOption value="1230">Today, 12:30 PM</NativeSelectOption>
            <NativeSelectOption value="1245">Today, 12:45 PM</NativeSelectOption>
          </NativeSelect>
          <NativeSelect disabled aria-label="Disabled">
            <NativeSelectOption value="">Closed now</NativeSelectOption>
          </NativeSelect>
        </div>
      </KitSection>

      <KitSection title="Switch" library={SHADCN} path={P('switch')} usedIn="kit">
        <div className="flex flex-col gap-3">
          <Label className="flex items-center gap-3">
            <Switch checked={notifyMe} onCheckedChange={setNotifyMe} /> Notify me (
            {notifyMe ? 'on' : 'off'})
          </Label>
          <Label className="flex items-center gap-3">
            <Switch disabled /> Use my reward (none ready)
          </Label>
        </div>
      </KitSection>

      <KitSection title="Message" library={SHADCN} path={P('message')} usedIn="kit">
        <MessageGroup className="max-w-md">
          <Message>
            <MessageContent>
              <MessageHeader>Kanto Smash</MessageHeader>
              Your rider is on the way.
              <MessageFooter>12:42 PM</MessageFooter>
            </MessageContent>
          </Message>
          <Message align="end">
            <MessageContent>
              <MessageHeader>You</MessageHeader>
              Sent proof of payment.
              <MessageFooter>12:40 PM</MessageFooter>
            </MessageContent>
          </Message>
        </MessageGroup>
      </KitSection>

      <KitSection title="Marker" library={SHADCN} path={P('marker')} usedIn="kit">
        <div className="grid max-w-md gap-3">
          <Marker>
            <MarkerIcon>
              <BellIcon />
            </MarkerIcon>
            <MarkerContent>Order placed · 12:31 PM</MarkerContent>
          </Marker>
          <Marker variant="separator">
            <MarkerContent>Today</MarkerContent>
          </Marker>
          <Marker variant="border">
            <MarkerIcon>
              <BikeIcon />
            </MarkerIcon>
            <MarkerContent>Out for delivery</MarkerContent>
          </Marker>
        </div>
      </KitSection>

      <KitSection
        title="Toast"
        library={SHADCN}
        path="packages/ui/src/compositions/app-toaster.tsx"
        usedIn="every storefront toast (notify), kit"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              notify({
                title: 'Classic Smash added',
                tone: 'success',
                action: { label: 'View basket', onClick: () => undefined },
              })
            }
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              notify({
                title: 'Could not place your order',
                description: 'Check your connection and try again.',
                tone: 'error',
              })
            }
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              notify({
                title: 'Kitchen closes in 15 minutes',
                description: 'Order now to get it today.',
                tone: 'warning',
              })
            }
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() => notify({ title: 'You are back online', tone: 'info' })}
          >
            Info
          </Button>
        </div>
      </KitSection>

      <KitSection title="Alert dialog" library={SHADCN} path={P('alert-dialog')} usedIn="kit">
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            Clear basket
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear your basket?</AlertDialogTitle>
              <AlertDialogDescription>This removes all 3 items.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </KitSection>

      <KitSection title="Attachment" library={SHADCN} path={P('attachment')} usedIn="kit">
        <AttachmentGroup>
          <Attachment state="done">
            <AttachmentMedia>
              <FileImageIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>gcash-receipt.jpg</AttachmentTitle>
              <AttachmentDescription>184 KB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <Attachment state="error">
            <AttachmentMedia>
              <FileImageIcon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>proof.png</AttachmentTitle>
              <AttachmentDescription>Upload failed. Try again.</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        </AttachmentGroup>
      </KitSection>

      <KitSection
        title="Carousel"
        library={SHADCN}
        path={P('carousel')}
        usedIn="banner-carousel, kit"
      >
        <div className="mx-auto w-full max-w-xs px-12">
          <Carousel>
            <CarouselContent>
              {[1, 2, 3].map((n) => (
                <CarouselItem key={n}>
                  <AspectRatio
                    ratio={1}
                    className="flex items-center justify-center rounded-lg bg-muted text-2xl font-semibold"
                  >
                    {n}
                  </AspectRatio>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </KitSection>

      <KitSection title="Input group" library={SHADCN} path={P('input-group')} usedIn="kit">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Search the menu" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label="Clear search" size="icon-xs">
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </KitSection>

      <KitSection title="Hitbox" library={DICE} path={P('hitbox')} usedIn="banner-carousel, kit">
        <div className="flex items-center gap-6">
          <Hitbox
            debug
            size="lg"
            radius="full"
            render={
              <button
                type="button"
                aria-label="Small dot"
                className="size-3 rounded-full bg-shop-10"
              />
            }
          />
          <span className="text-sm text-muted-foreground">
            The dashed area is the 44 px touch target.
          </span>
        </div>
      </KitSection>

      <KitSection title="Pending" library={DICE} path={P('pending')} usedIn="kit">
        <Pending isPending={pending} render={<Button onClick={fakeSubmit} />}>
          {pending ? <Spinner /> : null}
          {pending ? 'Placing order' : 'Place order'}
        </Pending>
      </KitSection>

      <KitSection title="Scroller" library={DICE} path={P('scroller')} usedIn="kit">
        <Scroller orientation="horizontal" withNavigation className="max-w-md">
          <div className="flex gap-2 py-1">
            {CHIPS.map((chip) => (
              <span key={chip} className="shrink-0 rounded-full border bg-card px-4 py-2 text-sm">
                {chip}
              </span>
            ))}
          </div>
        </Scroller>
      </KitSection>

      <KitSection title="Status" library={DICE} path={P('status')} usedIn="kit">
        <div className="flex flex-wrap gap-2">
          <Status className="border-success/20 bg-success-soft text-success-soft-foreground">
            <StatusIndicator className="bg-success!" />
            <StatusLabel>Open now</StatusLabel>
          </Status>
          <Status className="border-warning/20 bg-warning-soft text-warning-soft-foreground">
            <StatusIndicator className="bg-warning!" />
            <StatusLabel>Busy</StatusLabel>
          </Status>
          <Status>
            <StatusIndicator />
            <StatusLabel>Closed</StatusLabel>
          </Status>
        </div>
      </KitSection>

      <KitSection title="Mask input" library={DICE} path={P('mask-input')} usedIn="kit">
        <Field className="max-w-xs">
          <FieldLabel htmlFor="kit-phone">Mobile number</FieldLabel>
          <MaskInput
            id="kit-phone"
            mask={{ pattern: '####-###-####' }}
            placeholder="0917-000-0000"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onValueChange={(masked) => setPhone(masked)}
          />
        </Field>
      </KitSection>

      <KitSection
        title="Circular progress"
        library={DICE}
        path={P('circular-progress')}
        usedIn="storefront Rewards (stamps) and receipt pay timer, kit"
      >
        <div className="flex items-center gap-6">
          <CircularProgressCombined
            value={6}
            max={10}
            size={64}
            getValueText={(v, _min, max) => `${v}/${max}`}
          />
          <CircularProgressCombined
            value={10}
            max={10}
            size={64}
            getValueText={(v, _min, max) => `${v}/${max}`}
          />
          <CircularProgressCombined value={null} size={40} />
        </div>
      </KitSection>

      <KitSection title="QR code" library={DICE} path={P('qr-code')} usedIn="kit">
        <div className="flex items-center gap-6">
          <QRCode
            value="https://shop.webserbisyo.com/kanto-smash/o/demo-placed-transfer"
            size={128}
          >
            <QRCodeSkeleton />
            <QRCodeSvg />
          </QRCode>
        </div>
      </KitSection>

      <KitSection title="Checkbox group" library={DICE} path={P('checkbox-group')} usedIn="kit">
        <CheckboxGroup value={addOns} onValueChange={setAddOns} className="max-w-xs">
          <CheckboxGroupLabel>Add-ons (pick up to 2)</CheckboxGroupLabel>
          <CheckboxGroupList>
            {ADD_ONS.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm">
                <CheckboxGroupItem
                  value={option.value}
                  disabled={addOns.length >= 2 && !addOns.includes(option.value)}
                />
                <span className="flex-1">{option.label}</span>
                <span className="text-muted-foreground tabular-nums">{option.price}</span>
              </label>
            ))}
          </CheckboxGroupList>
          <CheckboxGroupDescription>{addOns.length} of 2 picked</CheckboxGroupDescription>
        </CheckboxGroup>
      </KitSection>

      <KitSection title="Rating" library={DICE} path={P('rating')} usedIn="kit">
        <div className="flex flex-col gap-3">
          <Rating value={rating} onValueChange={setRating} aria-label="Rate your order">
            {[1, 2, 3, 4, 5].map((n) => (
              <RatingItem key={n} />
            ))}
          </Rating>
          <Rating defaultValue={3} readOnly aria-label="Read-only rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <RatingItem key={n} />
            ))}
          </Rating>
        </div>
      </KitSection>

      <KitSection title="Banner" library={DICE} path={P('banner')} usedIn="kit">
        <Banner
          variant="default"
          className="max-w-md border bg-warning-soft text-warning-soft-foreground"
        >
          <BannerIcon>
            <BellIcon />
          </BannerIcon>
          <BannerContent>
            <BannerTitle>You&apos;re offline</BannerTitle>
            <BannerDescription>
              Your basket is saved. We&apos;ll reconnect when you&apos;re back.
            </BannerDescription>
          </BannerContent>
        </Banner>
      </KitSection>

      <KitSection title="Client only" library={DICE} path={P('client-only')} usedIn="kit">
        <ClientOnly fallback={<span className="text-sm text-muted-foreground">…</span>}>
          <span className="text-sm">Basket count: 3 (rendered only in the browser)</span>
        </ClientOnly>
      </KitSection>

      <KitSection title="Skip nav" library={DICE} path={P('skip-nav')} usedIn="kit">
        <div className="relative h-14 rounded-lg border p-2">
          <SkipNav href="#kit-skip-target">Skip to content</SkipNav>
          <span className="text-sm text-muted-foreground">Press Tab here to see the link.</span>
          <span id="kit-skip-target" />
        </div>
      </KitSection>

      <KitSection
        title="Direction · Visually hidden input"
        library={DICE}
        path={`${P('direction')}, ${P('visually-hidden-input')}`}
        usedIn="rating, checkbox-group (internal), kit"
      >
        <DirectionProvider direction="ltr">
          <form className="flex items-center gap-3 text-sm" onSubmit={(e) => e.preventDefault()}>
            <span>Form value sent by a hidden input:</span>
            <span className="font-mono">rating={rating}</span>
            <VisuallyHiddenInput control={null} name="kit-rating" value={String(rating)} />
          </form>
        </DirectionProvider>
      </KitSection>
    </>
  );
}
