import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

// Unknown paths are dynamic by nature: marking it lets the layout's metadata read params.
async function Unknown(): Promise<never> {
  await connection();
  notFound();
}

// Any path the shop doesn't have, and any path under an unknown shop, is Not found.
export default function UnknownShopPage() {
  return (
    <Suspense>
      <Unknown />
    </Suspense>
  );
}
