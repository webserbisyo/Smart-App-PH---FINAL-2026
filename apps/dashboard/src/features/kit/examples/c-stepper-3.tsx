'use client';

import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@smartapp/ui/components/reui/stepper';
import { CheckIcon, LoaderCircleIcon } from 'lucide-react';

const steps = [1, 2, 3];

export function Pattern() {
  return (
    <Stepper
      className="w-full max-w-md"
      defaultValue={2}
      indicators={{
        completed: <CheckIcon className="size-3.5" />,
        loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
      }}
    >
      <StepperNav className="mb-5">
        {steps.map((step) => (
          <StepperItem key={step} step={step} loading={step === 2}>
            <StepperTrigger>
              <StepperIndicator className="size-5 border-2 state-active:border-primary state-active:bg-primary state-active:text-primary-foreground state-completed:border-success state-completed:bg-success state-completed:text-success-foreground state-inactive:border-muted">
                <span className="hidden size-1.5 rounded-full bg-primary-foreground group-state-active/step:block"></span>
              </StepperIndicator>
            </StepperTrigger>
            {steps.length > step && (
              <StepperSeparator className="group-state-completed/step:bg-success" />
            )}
          </StepperItem>
        ))}
      </StepperNav>

      <StepperPanel className="text-sm">
        {steps.map((step) => (
          <StepperContent
            className="flex w-full items-center justify-center"
            key={step}
            value={step}
          >
            Step {step} content
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
