import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getStorefrontForServer } from '@smartapp/data/server';
import ShopNotFound from '../not-found';

interface UnknownPageProps {
  params: Promise<{ shop: string }>;
}

// A path the shop doesn't have is never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Unknown paths are dynamic by nature: marking it lets the layout's metadata read params. Inside a known
// shop the frame has already streamed, so the page draws the shop's Not found itself; throwing notFound()
// there made the browser redraw that part and report React error #419 (the frame is server-drawn since
// decision R50). An unknown shop still throws: nothing has been drawn yet, so it answers 404.
async function Unknown({ params }: UnknownPageProps) {
  await connection();
  const { shop } = await params;
  if (!getStorefrontForServer(shop)) notFound();
  return <ShopNotFound />;
}

// Any path the shop doesn't have, and any path under an unknown shop, is Not found.
export default function UnknownShopPage(props: UnknownPageProps) {
  return (
    <Suspense>
      <Unknown {...props} />
    </Suspense>
  );
}
