'use client';

import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import { Spinner } from '@smartapp/ui/components/spinner';
import { useKitShop } from '../kit-shop.js';

export function Pattern() {
  const shop = useKitShop();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setLoading((prev) => !prev), 2000); // Toggle loading state every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <Avatar>
        <AvatarImage src={shop.face(0)} alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
          <Spinner className="text-primary" />
        </div>
      )}
    </div>
  );
}
