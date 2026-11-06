import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, editorWords } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { dashboardOrigin, dataSource } from '@/env';
import { PreviewApp } from '@/features/preview/components/preview-app';

interface PreviewPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

// Never in search results; the headers in next.config.ts also stop any page but the dashboard framing it.
export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  return {
    title: editorWords.preview.title(shop?.storefront.info.name ?? slug),
    robots: { index: false, follow: false },
  };
}

async function PreviewContent({ params }: PreviewPageProps) {
  const { shop: slug } = await params;
  // What customers see now. The Editor sends the draft over postMessage; with the API, a short-lived
  // preview token reads the draft here instead (createPreviewToken, phase 4).
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();
  return <PreviewApp initialShop={shop} dashboardOrigin={dashboardOrigin} source={dataSource} />;
}

function PreviewSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

// The Editor's live preview (decision T72): the real Home, outside the shop frame's layout, so the colours,
// logo and parts can follow the owner's draft as they type.
export default function PreviewPage(props: PreviewPageProps) {
  return (
    <Suspense fallback={<PreviewSkeleton />}>
      <PreviewContent {...props} />
    </Suspense>
  );
}
