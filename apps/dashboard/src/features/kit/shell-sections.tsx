import { useState, type ReactNode } from 'react';
import {
  ChevronDownIcon,
  HouseIcon,
  PaintbrushIcon,
  ReceiptTextIcon,
  SettingsIcon,
  UsersIcon,
  UtensilsIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@smartapp/ui/components/breadcrumb';
import { Button } from '@smartapp/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@smartapp/ui/components/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@smartapp/ui/components/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@smartapp/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@smartapp/ui/components/item';
import { Separator } from '@smartapp/ui/components/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@smartapp/ui/components/sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@smartapp/ui/components/sidebar';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import { BottomDock } from '@smartapp/ui/compositions/bottom-dock';
import { NavDrawer } from '@smartapp/ui/compositions/nav-drawer';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { ResponsiveDialog } from '@smartapp/ui/compositions/responsive-dialog';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useKeyboardOpen } from '@smartapp/ui/hooks/use-keyboard-open';
import { useIsMobile } from '@smartapp/ui/hooks/use-mobile';
import type { NavItem } from '@smartapp/ui/lib/nav';

function KitSection({
  title,
  library,
  path,
  usedIn,
  children,
}: {
  title: string;
  library: string;
  path: string;
  usedIn: string;
  children: ReactNode;
}) {
  return (
    <>
      <Separator />
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Library: {library} · Path: {path} · Used in: {usedIn}
          </p>
        </div>
        {children}
      </section>
    </>
  );
}

// Demo items; links point at # so the kit never leaves the page.
function demoItem(id: string, label: string, icon: ReactNode, active = false, count?: number) {
  const item: NavItem = { id, label, icon, link: <a href="#kit-nav" />, active };
  return count === undefined ? item : { ...item, count };
}

const DOCK_ITEMS: NavItem[] = [
  demoItem('home', 'Home', <HouseIcon />, true),
  demoItem('orders', 'Orders', <ReceiptTextIcon />, false, 3),
  demoItem('catalog', 'Menu', <UtensilsIcon />),
  demoItem('members', 'Members', <UsersIcon />),
];

const MORE_ITEMS: NavItem[] = [
  demoItem('editor', 'Editor', <PaintbrushIcon />),
  demoItem('settings', 'Settings', <SettingsIcon />, false, 1),
];

const TAB_ITEMS: NavItem[] = [
  demoItem('items', 'Items', null, true),
  demoItem('categories', 'Categories', null),
  demoItem('add-ons', 'Add-ons', null, false, 2),
];

const shadcn = 'shadcn (base-nova)';

// T05: shell components, compositions and hooks.
export function ShellKitSections() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [responsiveOpen, setResponsiveOpen] = useState(false);
  const formFactor = useFormFactor();
  const keyboardOpen = useKeyboardOpen();
  const isMobile = useIsMobile();

  return (
    <>
      <KitSection
        title="Avatar"
        library={shadcn}
        path="packages/ui/src/components/avatar.tsx"
        usedIn="sidebar, account-menu, kit"
      >
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>KS</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>TA</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>PR</AvatarFallback>
          </Avatar>
        </div>
      </KitSection>

      <KitSection
        title="Badge"
        library={shadcn}
        path="packages/ui/src/components/badge.tsx"
        usedIn="bottom-dock, nav-drawer, page-header, kit"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>3</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </KitSection>

      <KitSection
        title="Breadcrumb"
        library={shadcn}
        path="packages/ui/src/components/breadcrumb.tsx"
        usedIn="top-bar, kit"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#kit-nav">Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Order</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </KitSection>

      <KitSection
        title="Collapsible"
        library={shadcn}
        path="packages/ui/src/components/collapsible.tsx"
        usedIn="sidebar (installed with it), kit"
      >
        <Collapsible className="max-w-md space-y-2">
          <CollapsibleTrigger render={<Button variant="outline" />}>
            Show more
            <ChevronDownIcon />
          </CollapsibleTrigger>
          <CollapsibleContent className="text-sm text-muted-foreground">
            Hidden content shows here.
          </CollapsibleContent>
        </Collapsible>
      </KitSection>

      <KitSection
        title="Dialog"
        library={shadcn}
        path="packages/ui/src/components/dialog.tsx"
        usedIn="responsive-dialog, kit"
      >
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog</DialogTitle>
              <DialogDescription>A centred dialog for tablet and desktop.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </KitSection>

      <KitSection
        title="Drawer"
        library={shadcn}
        path="packages/ui/src/components/drawer.tsx"
        usedIn="nav-drawer, kit"
      >
        <Drawer showSwipeHandle>
          <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
          <DrawerContent className="pb-safe">
            <DrawerHeader>
              <DrawerTitle>Drawer</DrawerTitle>
              <DrawerDescription>A bottom drawer for phones.</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      </KitSection>

      <KitSection
        title="Dropdown menu"
        library={shadcn}
        path="packages/ui/src/components/dropdown-menu.tsx"
        usedIn="account-menu, kit"
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Account</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </KitSection>

      <KitSection
        title="Empty"
        library={shadcn}
        path="packages/ui/src/components/empty.tsx"
        usedIn="every empty page, kit"
      >
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon />
            </EmptyMedia>
            <EmptyDescription>No orders yet. New orders show here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </KitSection>

      <KitSection
        title="Item"
        library={shadcn}
        path="packages/ui/src/components/item.tsx"
        usedIn="settings, kit"
      >
        <ItemGroup className="max-w-md">
          <Item variant="outline">
            <ItemContent>
              <ItemTitle>Shop</ItemTitle>
              <ItemDescription>Name, contact number and address.</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </ItemActions>
          </Item>
        </ItemGroup>
      </KitSection>

      <KitSection
        title="Sheet"
        library={shadcn}
        path="packages/ui/src/components/sheet.tsx"
        usedIn="share-shop-sheet, tablet menu, sidebar, kit"
      >
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Sheet</SheetTitle>
              <SheetDescription>Opens over the page.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </KitSection>

      <KitSection
        title="Sidebar"
        library={shadcn}
        path="packages/ui/src/components/sidebar.tsx"
        usedIn="app-sidebar (from the sidebar-07 block), kit"
      >
        <SidebarProvider className="min-h-0">
          <Sidebar collapsible="none" className="rounded-xl border border-border">
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {DOCK_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton isActive={item.active} render={item.link}>
                        {item.icon}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.count ? <SidebarMenuBadge>{item.count}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </KitSection>

      <KitSection
        title="Skeleton"
        library={shadcn}
        path="packages/ui/src/components/skeleton.tsx"
        usedIn="sidebar (installed with it), kit"
      >
        <div className="flex max-w-md items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </KitSection>

      <KitSection
        title="Tabs"
        library={shadcn}
        path="packages/ui/src/components/tabs.tsx"
        usedIn="page-header, kit"
      >
        <Tabs defaultValue="board" className="max-w-md">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
          <TabsContent value="board">Board view</TabsContent>
          <TabsContent value="list">List view</TabsContent>
        </Tabs>
      </KitSection>

      <KitSection
        title="Tooltip"
        library={shadcn}
        path="packages/ui/src/components/tooltip.tsx"
        usedIn="sidebar rail, kit"
      >
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </KitSection>

      <KitSection
        title="Bottom dock"
        library="composition"
        path="packages/ui/src/compositions/bottom-dock.tsx"
        usedIn="dashboard shell (phone), kit"
      >
        <div
          id="kit-nav"
          className="relative h-28 transform-gpu overflow-hidden rounded-xl border border-border bg-muted"
        >
          <BottomDock label="Demo" items={DOCK_ITEMS} more={{ label: 'More', items: MORE_ITEMS }} />
        </div>
      </KitSection>

      <KitSection
        title="Nav drawer"
        library="composition"
        path="packages/ui/src/compositions/nav-drawer.tsx"
        usedIn="bottom-dock More, kit"
      >
        <Button variant="outline" onClick={() => setDrawerOpen(true)}>
          Open nav drawer
        </Button>
        <NavDrawer title="More" items={MORE_ITEMS} open={drawerOpen} onOpenChange={setDrawerOpen} />
      </KitSection>

      <KitSection
        title="Responsive dialog"
        library="composition"
        path="packages/ui/src/compositions/responsive-dialog.tsx"
        usedIn="share-shop-sheet, kit"
      >
        <Button variant="outline" onClick={() => setResponsiveOpen(true)}>
          Open responsive dialog
        </Button>
        <ResponsiveDialog
          open={responsiveOpen}
          onOpenChange={setResponsiveOpen}
          title="Responsive dialog"
          description="Dialog on tablet and desktop, bottom drawer on phone."
        >
          <Button className="h-11 w-full" onClick={() => setResponsiveOpen(false)}>
            Done
          </Button>
        </ResponsiveDialog>
      </KitSection>

      <KitSection
        title="Page header"
        library="composition"
        path="packages/ui/src/compositions/page-header.tsx"
        usedIn="every dashboard page, kit"
      >
        <div className="rounded-xl border border-border">
          <PageHeader title="Menu" tabs={TAB_ITEMS} actions={<Button size="sm">Add item</Button>} />
        </div>
      </KitSection>

      <KitSection
        title="Hooks"
        library="hook"
        path="packages/ui/src/hooks/use-form-factor.ts, use-keyboard-open.ts, use-mobile.ts"
        usedIn="app-shell, bottom-dock, sidebar"
      >
        <ul className="space-y-1 text-sm">
          <li>
            useFormFactor(): <span className="font-mono">{formFactor}</span>
          </li>
          <li>
            useKeyboardOpen(): <span className="font-mono">{String(keyboardOpen)}</span>
          </li>
          <li>
            useIsMobile(): <span className="font-mono">{String(isMobile)}</span>
          </li>
        </ul>
      </KitSection>
    </>
  );
}
