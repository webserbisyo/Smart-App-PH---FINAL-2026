import { useState } from 'react';
import { Card, CardContent } from '@smartapp/ui/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { BikeIcon, ShoppingBagIcon, StoreIcon } from 'lucide-react';

export function Pattern() {
  const [how, setHow] = useState('pickup');

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-6">
      <Tabs value={how} onValueChange={setHow}>
        <TabsList className="w-full">
          <TabsTrigger value="walk_in" className="gap-1.5">
            <StoreIcon className="size-4" />
            Walk-in
          </TabsTrigger>
          <TabsTrigger value="pickup" className="gap-1.5">
            <ShoppingBagIcon className="size-4" />
            Pickup
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-1.5">
            <BikeIcon className="size-4" />
            Delivery
          </TabsTrigger>
        </TabsList>
        <TabsContent value="walk_in">
          <Card>
            <CardContent className="text-center">
              <p className="text-3xl font-bold">Now</p>
              <p className="mt-1 text-sm text-muted-foreground">Order at the counter</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pickup">
          <Card>
            <CardContent className="text-center">
              <p className="text-3xl font-bold">20 min</p>
              <p className="mt-1 text-sm text-muted-foreground">Ready for pickup</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delivery">
          <Card>
            <CardContent className="text-center">
              <p className="text-3xl font-bold">₱49</p>
              <p className="mt-1 text-sm text-muted-foreground">Delivery fee</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
