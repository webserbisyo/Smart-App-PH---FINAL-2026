import type { Announcement } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import { CircleAlertIcon, AlertTriangleIcon, CircleCheckIcon } from 'lucide-react';

export interface AnnouncementBannerProps {
  announcement: Announcement;
}

export function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const { text, tone } = announcement;
  if (!text) return null;

  if (tone === 'warning') {
    return (
      <Alert variant="warning" role="status">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertDescription className="font-medium break-words">{text}</AlertDescription>
      </Alert>
    );
  }

  if (tone === 'success') {
    return (
      <Alert variant="success" role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertDescription className="font-medium break-words">{text}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="info" role="status">
      <CircleAlertIcon aria-hidden="true" />
      <AlertDescription className="font-medium break-words">{text}</AlertDescription>
    </Alert>
  );
}
