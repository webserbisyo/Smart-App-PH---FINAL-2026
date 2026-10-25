import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@smartapp/ui/components/input-otp';
import { RefreshCwIcon } from 'lucide-react';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your login</CardTitle>
          <CardDescription>
            Enter the verification code we sent to your email address:{' '}
            <span className="font-medium text-foreground">m@example.com</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="otp-verification">Verification code</FieldLabel>
                <Button variant="outline" size="xs">
                  <RefreshCwIcon data-icon="inline-start" />
                  Resend Code
                </Button>
              </div>
              <InputOTP maxLength={6} id="otp-verification" required>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-9 w-11 text-xl" />
                  <InputOTPSlot index={1} className="h-9 w-11 text-xl" />
                  <InputOTPSlot index={2} className="h-9 w-11 text-xl" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-9 w-11 text-xl" />
                  <InputOTPSlot index={4} className="h-9 w-11 text-xl" />
                  <InputOTPSlot index={5} className="h-9 w-11 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </Field>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full">
            Verify
          </Button>
          <div className="text-muted-foreground">
            Having trouble signing in?{' '}
            <a
              href="#"
              className="text-primary underline-offset-4 transition-colors hover:underline"
            >
              Contact support
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
