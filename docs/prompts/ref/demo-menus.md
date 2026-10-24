<!-- prettier-ignore-start -->
# Demo shop menus v1.2 (data for T03)

Source: Demo Shop Assets v1.2 (Google Doc, approved A1 to A9 on 20 and 23 Oct 2026). This replaces the menus, rewards and stamp rules in `docs/demo-shops.md`; addresses, owners, phones, hours, pins and zones stay as they are in `demo-shops.md`. Prices in pesos for reading; store centavos. "New" items are part of the demo on purpose (they show sizes, 2-axis variants, required add-ons, combos and bundles).

## Rewards and stamp rules (A2, A7)

| Shop | Reward type | Rule |
| --- | --- | --- |
| Kanto Smash Burgers | Free item | 8 stamps (1 per order of ₱250 or more) = free Classic Smash (Single). Same as today. |
| AquaLinis Water Refilling Station | Discount | 10 stamps (1 per order) = ₱100 off. Changed from the free refill so the demo shows all three reward types. |
| Tala Apparel | Custom prize | 5 stamps (1 per order of ₱1,000 or more) = Kislap Limited Edition Tee, numbered, only 100 pieces (limited reward quantity, decided for MVP A; the card stops by itself at 0). Changed from ₱300 off. |
| Kapé Juan Coffee | Custom prize | 10 stamps (1 per order of ₱150 or more) = Kapé Juan Suki Tumbler (limited). Changed from "any 16 oz drink", because a free-item reward is one specific item and size; changed from "1 per drink order" (A7), because counting drinks needs extra logic. |
| Panaderya ni Lola Remy | Free item | 10 stamps (1 per order of ₱150 or more) = free Ube Cheese Pandesal, pack of 10. Same idea as today, now a pack size. |

Every shop: max 1 earned stamp per member per day (S24 default), 1 welcome stamp on join (P2), stamp card status On. Tala and Kapé Juan prizes are limited: Tala 100 pieces (show "23 left" style counts), Kapé Juan 50 pieces (mock value; the doc says "limited" without a number).

## Kanto Smash Burgers (`kanto-smash`)

Food · Marikina · "Smashed fresh, served hot sa kanto." · Late-night Filipino street food with attitude: crispy lacy patty edges, melting cheese, steam, a little neon glow. Loud but clean.

Brand colours (first row is the brand colour for `shopPalette()`):

| Colour | Hex |
| --- | --- |
| Ketchup red (brand) | #D7372F |
| Charcoal | #1E1B1A |
| Mustard yellow | #F2B705 |
| Bun cream | #F6E7CF |

Menu:

| Category | Item | Choices and price | Add-on groups | Note |
| --- | --- | --- | --- | --- |
| Smash Burgers | Classic Smash | Patty: Single ₱149, Double ₱209, Triple ₱269 | Extras, Sauce, Make it a meal | Triple is new |
| Smash Burgers | Cheesy Bacon Smash | Patty: Single ₱229, Double ₱289 | Extras, Sauce, Make it a meal | Double is new |
| Smash Burgers | Kanto Spicy Smash | ₱199 | Extras, Sauce, Make it a meal |   |
| Smash Burgers | Mushroom Swiss Smash | ₱219 | Extras, Sauce, Make it a meal |   |
| Smash Burgers | Kanto Overload | ₱329 (three patties, bacon, egg, double cheese) | Extras, Sauce | New, hero item |
| Chicken and Rice | Crispy Chicken Sandwich | ₱179 | Extras, Sauce, Make it a meal |   |
| Chicken and Rice | Chicken Nuggets | Pieces: 6 pcs ₱119, 10 pcs ₱179 | Dip (required) | New |
| Chicken and Rice | Burger Steak with Rice | ₱129 | Extra rice |   |
| Sides | Kanto Fries | Size: Regular ₱69, Large ₱99 | Sauce |   |
| Sides | Cheese Fries | ₱119 |   |   |
| Sides | Onion Rings | ₱99 | Sauce |   |
| Sides | Loaded Bacon Fries | ₱149 |   | New |
| Combos | Smash Combo | ₱219: Classic Smash, regular fries, iced tea | Upgrade your side, Choose your drink |   |
| Combos | Barkada Bucket | ₱899: 4 Classic Smash, 2 large fries, 10 nuggets, 4 iced teas | Dip (required) | New, for groups |
| Drinks | House Iced Tea | Size: 16 oz ₱45, 22 oz ₱65 |   |   |
| Drinks | Calamansi Juice | ₱55 |   |   |
| Drinks | Soda in Can | ₱55 |   |   |
| Drinks | Thick Shake | Flavour: Vanilla, Chocolate, Ube, all ₱129 |   | New |

Add-on groups (shared library):

| Group | Rule | Options |
| --- | --- | --- |
| Extras | Optional, up to 6 | Extra patty +₱60 · Cheese slice +₱20 · Bacon +₱40 · Egg +₱20 · Caramelised onions +₱15 · Jalapeños +₱15 |
| Sauce | Optional, up to 2 | Kanto sauce (default) · Sriracha mayo +₱10 · Garlic aioli +₱10 · Cheese sauce dip +₱25 |
| Make it a meal | Optional, choose 1 | Regular fries and iced tea +₱70 |
| Upgrade your side | Optional, choose 1 | Cheese fries +₱40 · Onion rings +₱25 |
| Choose your drink | Required, choose 1 | House iced tea (default) · Calamansi juice +₱10 · Soda in can +₱10 |
| Dip | Required, choose 1 (nuggets) or up to 4 (bucket) | BBQ · Honey mustard · Sweet chili · Garlic aioli |
| Extra rice | Optional, up to 2 | Extra rice +₱20 |

## AquaLinis Water Refilling Station (`aqualinis`)

Retail · Las Piñas · "Malinis, malamig, hatid sa pinto." · Clean, cold and trustworthy: bright high-key studio light, water droplets and soft light patterns from water.

Brand colours (first row is the brand colour for `shopPalette()`):

| Colour | Hex |
| --- | --- |
| Water blue (brand) | #0E7AC4 |
| Aqua | #7FD3F7 |
| White | #FFFFFF |
| Fresh green (alkaline) | #3BB273 |

Menu:

| Category | Item | Choices and price | Add-on groups | Note |
| --- | --- | --- | --- | --- |
| Refills | 5-Gallon Refill | Water: Purified, Alkaline, Mineral × Container: Round, Slim with faucet. Purified ₱30, Mineral ₱40, Alkaline ₱45 | Refill care | Merged into one item with 2 choices |
| Refills | Family Week Pack | ₱110: 4 purified round refills | Refill care | New bundle |
| New Containers | Round 5-Gallon with Cap | ₱250 |   |   |
| New Containers | Slim 5-Gallon with Faucet | ₱280 |   |   |
| New Containers | Replacement Faucet | ₱60 |   |   |
| New Containers | Manual Water Pump | ₱180 |   | New |
| Bottled Water | Bottled Water Case | Size: 350 mL × 24 ₱160, 500 mL × 24 ₱180, 1 L × 12 ₱180 |   | Merged into one item; 350 mL is new |
| Ice | Tube Ice | Weight: 2 kg ₱50, 5 kg ₱110 |   | 5 kg is new |

Add-on groups (shared library):

| Group | Rule | Options |
| --- | --- | --- |
| Refill care | Optional, up to 2 | Sanitise my container (free, default) · New cap seal (free, default) |

## Tala Apparel (`tala-apparel`)

Retail · Cebu City · "Everyday Filipino-made pieces na may kislap." · Calm, editorial, Filipino-made: natural fibres, warm window light, a small spark of gold.

Brand colours (first row is the brand colour for `shopPalette()`):

| Colour | Hex |
| --- | --- |
| Midnight indigo (brand) | #2E3A87 |
| Sand | #E8DCC4 |
| Kislap gold | #C9A227 |
| Abaca natural | #CBB48B |

Menu:

| Category | Item | Choices and price | Add-on groups | Note |
| --- | --- | --- | --- | --- |
| Tops | Tala Basic Tee | Size: S, M, L, XL × Colour: Black, White, Sand · ₱450 | Gift wrap | Photo per colour |
| Tops | Linen Button-down | Size: S to XL × Colour: Natural, Indigo · ₱899 | Gift wrap | Photo per colour |
| Tops | Cropped Knit Top | Size: S to XL × Colour: Cream, Terracotta · ₱599 | Gift wrap |   |
| Tops | Terno-sleeve Blouse | Size: S to XL · ₱1,199 | Gift wrap | New |
| Bottoms | Wide-leg Trousers | Size: S to XL × Colour: Black, Olive · ₱1,099 | Hemming, Gift wrap |   |
| Bottoms | Pleated Midi Skirt | Size: S to XL · ₱899 | Gift wrap |   |
| Bottoms | Denim Shorts | Size: S to XL · ₱699 | Gift wrap |   |
| Dresses | Habi-print Midi Dress | Size: S to XL · ₱1,299 | Gift wrap |   |
| Sets | Weekend Set | Linen Button-down and Wide-leg Trousers · ₱1,799 | Hemming, Gift wrap | New bundle |
| Accessories | Abaca Tote Bag | ₱650 | Gift wrap |   |
| Accessories | Capiz Shell Earrings | ₱350 | Gift wrap |   |
| Accessories | Woven Bucket Hat | ₱450 | Gift wrap |   |
| Accessories | Beaded Phone Strap | ₱199 | Gift wrap |   |
| Accessories | Piña-blend Scarf | ₱799 | Gift wrap | New |

Add-on groups (shared library):

| Group | Rule | Options |
| --- | --- | --- |
| Gift wrap | Optional, up to 2 | Abaca gift wrap +₱60 · Handwritten card (free) |
| Hemming | Optional, choose 1 | Hem to my length, write it in the note (free) |

## Kapé Juan Coffee (`kape-juan`)

Food · Quezon City · "Barako-strong coffee, isang tasa at a time." · A cosy neighbourhood café for study sessions: warm wood, morning window light, real Filipino coffee.

Brand colours (first row is the brand colour for `shopPalette()`):

| Colour | Hex |
| --- | --- |
| Coffee brown (brand) | #6F4E37 |
| Cream | #F3E9DC |
| Muscovado | #A0522D |
| Ube | #7B5BA6 |

Menu:

| Category | Item | Choices and price | Add-on groups | Note |
| --- | --- | --- | --- | --- |
| Espresso | Americano | Size: 12 oz ₱110, 16 oz ₱130 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level | Temp choice is new |
| Espresso | Café Latte | Size: 12 oz ₱140, 16 oz ₱160 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |   |
| Espresso | Spanish Latte | Size: 12 oz ₱160, 16 oz ₱180 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |   |
| Espresso | Caramel Macchiato | Size: 12 oz ₱170, 16 oz ₱190 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |   |
| Kapeng Pinoy | Barako Brew | ₱95 | Sugar level |   |
| Kapeng Pinoy | Iced Barako with Muscovado | ₱130 | Sugar level, Ice level, Toppings |   |
| Kapeng Pinoy | Tablea Mocha | ₱165 | Sugar level, Milk, Toppings |   |
| Kapeng Pinoy | Sea Salt Barako Cream | ₱150 | Sugar level, Ice level | New |
| Non-coffee | Matcha Latte | ₱170 | Sugar level, Milk, Ice level |   |
| Non-coffee | Ube Latte | ₱170 | Sugar level, Milk, Ice level |   |
| Non-coffee | Tablea Hot Chocolate | ₱140 | Sugar level, Toppings |   |
| Non-coffee | Calamansi Honey Fizz | ₱120 | Sugar level | New |
| Food | Ensaymada | ₱85 | Warm it up |   |
| Food | Banana Bread Slice | ₱75 | Warm it up |   |
| Food | Chicken Pesto Sandwich | ₱185 | Warm it up |   |
| Food | Longganisa Pandesal | ₱145 | Warm it up | New |
| Food | Ube Cheesecake Slice | ₱160 |   | New |
| Beans | Barako Beans 250 g | Grind: Whole bean, Drip, Espresso · ₱380 |   | New retail item |

Add-on groups (shared library):

| Group | Rule | Options |
| --- | --- | --- |
| Sugar level | Required, choose 1 | 0% · 25% · 50% · 100% (default) |
| Milk | Optional, choose 1 | Oat milk +₱40 |
| Extra shot | Optional, up to 2 | Extra shot +₱40 |
| Ice level | Optional, choose 1 | Regular ice (default) · Less ice |
| Toppings | Optional, up to 2 | Sea salt cream +₱30 · Cinnamon dust (free) |
| Warm it up | Optional, choose 1 | Warm it up (free) |

## Panaderya ni Lola Remy (`lola-remy`)

Food · Malolos · "Mainit na pandesal since 1987." · Nostalgic family bakeshop: warm 5 AM light, woven bilao trays, banana leaves and flour dust.

Brand colours (first row is the brand colour for `shopPalette()`):

| Colour | Hex |
| --- | --- |
| Golden crust (brand) | #C27C2C |
| Flour cream | #FFF4E2 |
| Ube | #6B3FA0 |
| Banana leaf | #4E7D3A |

Menu:

| Category | Item | Choices and price | Add-on groups | Note |
| --- | --- | --- | --- | --- |
| Pandesal and Bread | Classic Pandesal | Pack: 1 pc ₱5, 10 pcs ₱50, 20 pcs ₱95 |   | 20 pcs is new |
| Pandesal and Bread | Ube Cheese Pandesal | Pack: 1 pc ₱15, 10 pcs ₱140 |   | Pack is new |
| Pandesal and Bread | Spanish Bread | ₱10 |   |   |
| Pandesal and Bread | Pan de Coco | ₱12 |   |   |
| Pandesal and Bread | Monay | ₱10 |   |   |
| Pandesal and Bread | Kababayan | ₱12 |   | New |
| Ensaymada and Pastries | Classic Ensaymada | ₱35 |   |   |
| Ensaymada and Pastries | Ube Ensaymada | ₱45 |   |   |
| Ensaymada and Pastries | Cheese Roll | ₱25 |   |   |
| Ensaymada and Pastries | Hopia Ube (6) | ₱90 |   |   |
| Cakes | Chocolate Moist Cake | Size: 6" ₱450, 8" ₱650 | Cake extras | 6" is new |
| Cakes | Ube Macapuno Cake | Size: 6" ₱520, 8" ₱750 | Cake extras | 6" is new |
| Cakes | Mamon (box of 6) | ₱180 |   |   |
| Pasalubong | Ensaymada Malolos (box of 6) | ₱360 | Pasalubong wrap |   |
| Pasalubong | Inipit (box of 10) | ₱180 | Pasalubong wrap |   |
| Pasalubong | Lola's Pasalubong Box | ₱499: ensaymada, inipit, hopia, mamon | Pasalubong wrap | New |
| Drinks | Brewed Coffee | ₱40 |   |   |
| Drinks | Sago't Gulaman | ₱35 |   |   |
| Drinks | Tsokolate | ₱45 |   | New |

Add-on groups (shared library):

| Group | Rule | Options |
| --- | --- | --- |
| Cake extras | Optional, up to 3 | "Happy Birthday" topper +₱30 · Candles +₱20 · Write a short greeting in the note (free) |
| Pasalubong wrap | Optional, choose 1 | Banana-leaf and twine wrap +₱20 |

<!-- prettier-ignore-end -->
