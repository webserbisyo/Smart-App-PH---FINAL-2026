import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEMO_SHOP_SLUGS, words } from '@smartapp/core';
import { getStorefrontForServer } from '@smartapp/data/server';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { PrivacyNotice } from '@/features/legal/components/privacy-notice';

interface PrivacyPageProps {
  params: Promise<{ shop: string }>;
}

export function generateStaticParams() {
  return DEMO_SHOP_SLUGS.map((shop) => ({ shop }));
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { shop: slug } = await params;
  const shop = getStorefrontForServer(slug);
  if (!shop) return {};
  const name = shop.storefront.info.name;
  return { title: words.privacy.metaTitle(name), description: words.privacy.intro(name) };
}

// Static per shop (T14): the same notice for everyone, cached with the shop.
async function CachedPrivacy({ slug }: { slug: string }) {
  'use cache';
  const shop = getStorefrontForServer(slug);
  if (!shop) notFound();
  return <PrivacyNotice storefront={shop.storefront} />;
}

async function PrivacyContent({ params }: PrivacyPageProps) {
  const { shop: slug } = await params;
  return <CachedPrivacy slug={slug} />;
}

export default function PrivacyPage(props: PrivacyPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pt-2 pb-6" aria-hidden="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <PrivacyContent {...props} />
    </Suspense>
  );
}
