# Demo shops (seed input)

Five demo shops for mocks, screenshots, demos and later the database seed. The data lives in `packages/core/src/demo/packs/` (one shop pack per slug, decision N28); menus, rewards and stamp rules follow Demo Shop Assets v1.2 (`docs/prompts/ref/demo-menus.md`). All people, phone numbers and handles are fictional: never call, text or message them. Streets and landmarks are real places; house numbers are made up. Check each pin in Google Maps before it goes into the database.

Prices here are in pesos for reading. Store them as centavos (₱149 = `14900`). The owner password is never written here; the seed script reads `DEMO_PASSWORD`.

## Shared shape (becomes `DemoShopSchema` in `packages/core`)

`slug, name, kind (food|retail), tagline, description, owner {name, email}, phone, address {line1, barangay, city, province, zip}, landmark, geo {lat, lng}, hours [day, open, close], orderTypes, payments, deliveryZones [name, fee], brandColor, stampRule {earn, goal, reward}, categories [name, items [name, price, variants?, note?]]`

## Summary

| #   | Shop                              | Slug           | Kind   | City        | Owner login                               |
| --- | --------------------------------- | -------------- | ------ | ----------- | ----------------------------------------- |
| 1   | Kanto Smash Burgers               | `kanto-smash`  | food   | Marikina    | `morales.juanmiguel0729+burger@gmail.com` |
| 2   | AquaLinis Water Refilling Station | `aqualinis`    | retail | Las Piñas   | `morales.juanmiguel0729+water@gmail.com`  |
| 3   | Tala Apparel                      | `tala-apparel` | retail | Cebu City   | `morales.juanmiguel0729+tala@gmail.com`   |
| 4   | Kapé Juan Coffee                  | `kape-juan`    | food   | Quezon City | `morales.juanmiguel0729+cafe@gmail.com`   |
| 5   | Panaderya ni Lola Remy            | `lola-remy`    | food   | Malolos     | `morales.juanmiguel0729+bakery@gmail.com` |

Gmail "+" addresses all land in the founder's inbox, so codes and resets can be tested.

---

## 1. Kanto Smash Burgers (`kanto-smash`, food)

- Tagline: Smashed fresh, served hot sa kanto.
- Description: Thin, crispy-edged smash burgers on toasted potato buns, made to order. Born as a weekend stall, now the barkada's late-night stop in Marikina.
- Owner: Paolo Reyes · Phone: 0917 801 2201
- Address: 28 Bayan-Bayanan Ave., Brgy. Concepcion Uno, Marikina City, Metro Manila 1807 · Landmark: near the Concepcion Uno barangay hall · Pin: 14.6430, 121.1010
- Hours: Mon to Thu 9:00 AM to 10:00 PM; Fri to Sun 9:00 AM to 12:00 MN
- Order types: walk-in, pickup, delivery
- Payments: cash, COD (limit ₱3,000), GCash, Maya. Sample accounts: GCash 0917 000 0001, Maya 0917 000 0002 (fake, labelled "Sample").
- Delivery: distance 0–3 km ₱49, 3–5 km ₱79; zones Concepcion Uno and Dos ₱40 · Marikina Heights and Parang ₱60 · Rest of Marikina ₱80.
- Brand colour: `#D7372F` (ketchup red) · dark page, no page colour
- Stamps: 1 per order of ₱250 or more (max 1 a day); 8 stamps = free Classic Smash (Single).

Menu:

| Category         | Item                    | Choices and price                                             | Add-on groups                        | Note            |
| ---------------- | ----------------------- | ------------------------------------------------------------- | ------------------------------------ | --------------- |
| Smash Burgers    | Classic Smash           | Patty: Single ₱149, Double ₱209, Triple ₱269                  | Extras, Sauce, Make it a meal        | Triple is new   |
| Smash Burgers    | Cheesy Bacon Smash      | Patty: Single ₱229, Double ₱289                               | Extras, Sauce, Make it a meal        | Double is new   |
| Smash Burgers    | Kanto Spicy Smash       | ₱199                                                          | Extras, Sauce, Make it a meal        |                 |
| Smash Burgers    | Mushroom Swiss Smash    | ₱219                                                          | Extras, Sauce, Make it a meal        |                 |
| Smash Burgers    | Kanto Overload          | ₱329 (three patties, bacon, egg, double cheese)               | Extras, Sauce                        | New, hero item  |
| Chicken and Rice | Crispy Chicken Sandwich | ₱179                                                          | Extras, Sauce, Make it a meal        |                 |
| Chicken and Rice | Chicken Nuggets         | Pieces: 6 pcs ₱119, 10 pcs ₱179                               | Dip (required)                       | New             |
| Chicken and Rice | Burger Steak with Rice  | ₱129                                                          | Extra rice                           |                 |
| Sides            | Kanto Fries             | Size: Regular ₱69, Large ₱99                                  | Sauce                                |                 |
| Sides            | Cheese Fries            | ₱119                                                          |                                      |                 |
| Sides            | Onion Rings             | ₱99                                                           | Sauce                                |                 |
| Sides            | Loaded Bacon Fries      | ₱149                                                          |                                      | New             |
| Combos           | Smash Combo             | ₱219: Classic Smash, regular fries, iced tea                  | Upgrade your side, Choose your drink |                 |
| Combos           | Barkada Bucket          | ₱899: 4 Classic Smash, 2 large fries, 10 nuggets, 4 iced teas | Dip (required)                       | New, for groups |
| Drinks           | House Iced Tea          | Size: 16 oz ₱45, 22 oz ₱65                                    |                                      |                 |
| Drinks           | Calamansi Juice         | ₱55                                                           |                                      |                 |
| Drinks           | Soda in Can             | ₱55                                                           |                                      |                 |
| Drinks           | Thick Shake             | Flavour: Vanilla, Chocolate, Ube, all ₱129                    |                                      | New             |

Add-on groups (shared library):

| Group             | Rule                                             | Options                                                                                                 |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Extras            | Optional, up to 6                                | Extra patty +₱60 · Cheese slice +₱20 · Bacon +₱40 · Egg +₱20 · Caramelised onions +₱15 · Jalapeños +₱15 |
| Sauce             | Optional, up to 2                                | Kanto sauce (default) · Sriracha mayo +₱10 · Garlic aioli +₱10 · Cheese sauce dip +₱25                  |
| Make it a meal    | Optional, choose 1                               | Regular fries and iced tea +₱70                                                                         |
| Upgrade your side | Optional, choose 1                               | Cheese fries +₱40 · Onion rings +₱25                                                                    |
| Choose your drink | Required, choose 1                               | House iced tea (default) · Calamansi juice +₱10 · Soda in can +₱10                                      |
| Dip               | Required, choose 1 (nuggets) or up to 4 (bucket) | BBQ · Honey mustard · Sweet chili · Garlic aioli                                                        |
| Extra rice        | Optional, up to 2                                | Extra rice +₱20                                                                                         |

## 2. AquaLinis Water Refilling Station (`aqualinis`, retail)

- Tagline: Malinis, malamig, hatid sa pinto.
- Description: Purified, alkaline and mineral water refills with 8-stage filtration, tested monthly. Free delivery within the Pamplona barangays for 2 gallons or more.
- Owner: Ramon Dizon · Phone: 0928 455 3302
- Address: Unit 3, 145 Alabang–Zapote Road, Brgy. Pamplona Dos, Las Piñas City, Metro Manila 1740 · Landmark: 5 minutes from Las Piñas City Hall · Pin: 14.4510, 120.9840
- Hours: Mon to Sat 6:00 AM to 9:00 PM; Sun 7:00 AM to 9:00 PM
- Order types: walk-in, pickup, delivery
- Payments: cash, COD, GCash. Sample account: GCash 0928 000 0001 (fake, labelled "Sample").
- Delivery: zones only. Pamplona Uno, Dos and Tres ₱0 (owner note: 2 gallons minimum) · Talon and Almanza ₱20 · Rest of Las Piñas ₱40.
- Brand colour: `#0E7AC4` (water blue) · page `#E2F1FD` (sky)
- Stamps: 1 per order (max 1 a day); 10 stamps = ₱100 off.

Menu:

| Category       | Item                      | Choices and price                                                                                                | Add-on groups | Note                                |
| -------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------- |
| Refills        | 5-Gallon Refill           | Water: Purified, Alkaline, Mineral × Container: Round, Slim with faucet. Purified ₱30, Mineral ₱40, Alkaline ₱45 | Refill care   | Merged into one item with 2 choices |
| Refills        | Family Week Pack          | ₱110: 4 purified round refills                                                                                   | Refill care   | New bundle                          |
| New Containers | Round 5-Gallon with Cap   | ₱250                                                                                                             |               |                                     |
| New Containers | Slim 5-Gallon with Faucet | ₱280                                                                                                             |               |                                     |
| New Containers | Replacement Faucet        | ₱60                                                                                                              |               |                                     |
| New Containers | Manual Water Pump         | ₱180                                                                                                             |               | New                                 |
| Bottled Water  | Bottled Water Case        | Size: 350 mL × 24 ₱160, 500 mL × 24 ₱180, 1 L × 12 ₱180                                                          |               | Merged into one item; 350 mL is new |
| Ice            | Tube Ice                  | Weight: 2 kg ₱50, 5 kg ₱110                                                                                      |               | 5 kg is new                         |

Add-on groups (shared library):

| Group       | Rule              | Options                                                              |
| ----------- | ----------------- | -------------------------------------------------------------------- |
| Refill care | Optional, up to 2 | Sanitise my container (free, default) · New cap seal (free, default) |

## 3. Tala Apparel (`tala-apparel`, retail)

- Tagline: Everyday Filipino-made pieces na may kislap.
- Description: Small-batch clothing and accessories sewn in Cebu, with woven and abaca details from local makers. Sizes S to XL; try-on at the studio by appointment.
- Owner: Bea Villanueva · Phone: 0995 230 4403
- Address: 2/F, 88 Salinas Drive, Brgy. Lahug, Cebu City, Cebu 6000 · Landmark: two blocks from JY Square Mall · Pin: 10.3310, 123.8990
- Hours: daily 9:00 AM to 9:00 PM
- Order types: pickup, delivery
- Payments: COD, GCash, Bank, QR Ph. Sample accounts: GCash 0995 000 0001, BPI 0000 0000 01 (fake, labelled "Sample").
- Delivery: zones only. Cebu City ₱80 · Mandaue ₱120 · Lapu-Lapu and Talisay ₱150. Shipping is not in A.
- Brand colour: `#C9A227` (kislap gold) on a dark page `#253475` (midnight indigo, like the logo), decision R52
- Stamps: 1 per order of ₱1,000 or more (max 1 a day); 5 stamps = Kislap Limited Edition Tee, only 100 pieces.

Menu:

| Category    | Item                  | Choices and price                                     | Add-on groups      | Note             |
| ----------- | --------------------- | ----------------------------------------------------- | ------------------ | ---------------- |
| Tops        | Tala Basic Tee        | Size: S, M, L, XL × Colour: Black, White, Sand · ₱450 | Gift wrap          | Photo per colour |
| Tops        | Linen Button-down     | Size: S to XL × Colour: Natural, Indigo · ₱899        | Gift wrap          | Photo per colour |
| Tops        | Cropped Knit Top      | Size: S to XL × Colour: Cream, Terracotta · ₱599      | Gift wrap          |                  |
| Tops        | Terno-sleeve Blouse   | Size: S to XL · ₱1,199                                | Gift wrap          | New              |
| Bottoms     | Wide-leg Trousers     | Size: S to XL × Colour: Black, Olive · ₱1,099         | Hemming, Gift wrap |                  |
| Bottoms     | Pleated Midi Skirt    | Size: S to XL · ₱899                                  | Gift wrap          |                  |
| Bottoms     | Denim Shorts          | Size: S to XL · ₱699                                  | Gift wrap          |                  |
| Dresses     | Habi-print Midi Dress | Size: S to XL · ₱1,299                                | Gift wrap          |                  |
| Sets        | Weekend Set           | Linen Button-down and Wide-leg Trousers · ₱1,799      | Hemming, Gift wrap | New bundle       |
| Accessories | Abaca Tote Bag        | ₱650                                                  | Gift wrap          |                  |
| Accessories | Capiz Shell Earrings  | ₱350                                                  | Gift wrap          |                  |
| Accessories | Woven Bucket Hat      | ₱450                                                  | Gift wrap          |                  |
| Accessories | Beaded Phone Strap    | ₱199                                                  | Gift wrap          |                  |
| Accessories | Piña-blend Scarf      | ₱799                                                  | Gift wrap          | New              |

Add-on groups (shared library):

| Group     | Rule               | Options                                        |
| --------- | ------------------ | ---------------------------------------------- |
| Gift wrap | Optional, up to 2  | Abaca gift wrap +₱60 · Handwritten card (free) |
| Hemming   | Optional, choose 1 | Hem to my length, write it in the note (free)  |

## 4. Kapé Juan Coffee (`kape-juan`, food)

- Tagline: Barako-strong coffee, isang tasa at a time.
- Description: A neighbourhood café on Maginhawa serving Batangas barako, tablea and Benguet arabica, with ensaymada and sandwiches from small bakers. Wi-Fi and outlets for study sessions.
- Owner: Juan Santos · Phone: 0918 672 5504
- Address: 61 Maginhawa St., Brgy. Teachers Village East, Quezon City, Metro Manila 1101 · Landmark: near the corner of Matatag St. · Pin: 14.6460, 121.0610
- Hours: daily 7:00 AM to 10:00 PM
- Order types: walk-in, pickup, delivery
- Payments: cash, GCash, Maya. Sample accounts: GCash 0918 000 0001, Maya 0918 000 0002 (fake, labelled "Sample").
- Delivery: distance 0–2 km ₱39, 2–4 km ₱59 (no zones). Closed 1 Nov (All Saints’ Day) as the closure demo.
- Brand colour: `#6F4E37` (coffee brown) · page `#EEE2CF` (latte)
- Stamps: 1 per order of ₱150 or more (max 1 a day); 10 stamps = Kapé Juan Suki Tumbler (limited, 50 pieces in the mock).

Menu:

| Category     | Item                       | Choices and price                              | Add-on groups                            | Note               |
| ------------ | -------------------------- | ---------------------------------------------- | ---------------------------------------- | ------------------ |
| Espresso     | Americano                  | Size: 12 oz ₱110, 16 oz ₱130 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level | Temp choice is new |
| Espresso     | Café Latte                 | Size: 12 oz ₱140, 16 oz ₱160 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |                    |
| Espresso     | Spanish Latte              | Size: 12 oz ₱160, 16 oz ₱180 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |                    |
| Espresso     | Caramel Macchiato          | Size: 12 oz ₱170, 16 oz ₱190 × Temp: Hot, Iced | Sugar level, Milk, Extra shot, Ice level |                    |
| Kapeng Pinoy | Barako Brew                | ₱95                                            | Sugar level                              |                    |
| Kapeng Pinoy | Iced Barako with Muscovado | ₱130                                           | Sugar level, Ice level, Toppings         |                    |
| Kapeng Pinoy | Tablea Mocha               | ₱165                                           | Sugar level, Milk, Toppings              |                    |
| Kapeng Pinoy | Sea Salt Barako Cream      | ₱150                                           | Sugar level, Ice level                   | New                |
| Non-coffee   | Matcha Latte               | ₱170                                           | Sugar level, Milk, Ice level             |                    |
| Non-coffee   | Ube Latte                  | ₱170                                           | Sugar level, Milk, Ice level             |                    |
| Non-coffee   | Tablea Hot Chocolate       | ₱140                                           | Sugar level, Toppings                    |                    |
| Non-coffee   | Calamansi Honey Fizz       | ₱120                                           | Sugar level                              | New                |
| Food         | Ensaymada                  | ₱85                                            | Warm it up                               |                    |
| Food         | Banana Bread Slice         | ₱75                                            | Warm it up                               |                    |
| Food         | Chicken Pesto Sandwich     | ₱185                                           | Warm it up                               |                    |
| Food         | Longganisa Pandesal        | ₱145                                           | Warm it up                               | New                |
| Food         | Ube Cheesecake Slice       | ₱160                                           |                                          | New                |
| Beans        | Barako Beans 250 g         | Grind: Whole bean, Drip, Espresso · ₱380       |                                          | New retail item    |

Add-on groups (shared library):

| Group       | Rule               | Options                                    |
| ----------- | ------------------ | ------------------------------------------ |
| Sugar level | Required, choose 1 | 0% · 25% · 50% · 100% (default)            |
| Milk        | Optional, choose 1 | Oat milk +₱40                              |
| Extra shot  | Optional, up to 2  | Extra shot +₱40                            |
| Ice level   | Optional, choose 1 | Regular ice (default) · Less ice           |
| Toppings    | Optional, up to 2  | Sea salt cream +₱30 · Cinnamon dust (free) |
| Warm it up  | Optional, choose 1 | Warm it up (free)                          |

## 5. Panaderya ni Lola Remy (`lola-remy`, food)

- Tagline: Mainit na pandesal since 1987.
- Description: A family bakeshop in Malolos baking pandesal twice a day (5 AM and 3 PM), Ensaymada Malolos and Bulacan pasalubong from Lola Remy's recipes, now run by her apo.
- Owner: Carla Bautista · Phone: 0906 318 6605
- Address: 214 Paseo del Congreso, City of Malolos, Bulacan 3000 (barangay to confirm on the map) · Landmark: 5 minutes' walk from Barasoain Church · Pin: 14.8470, 120.8120
- Hours: Mon to Sat 5:00 AM to 12:00 NN and 2:00 PM to 8:00 PM; Sun 5:00 AM to 12:00 NN (the closed-shop demo, decision R26)
- Order types: walk-in, pickup, delivery
- Payments: cash, COD, GCash, QR Ph. Sample account: GCash 0906 000 0001 (fake, labelled "Sample").
- Delivery: distance 0–3 km ₱40; zones Malolos proper ₱50 · Nearby barangays ₱80.
- Brand colour: `#C27C2C` (golden crust) · page `#FFF1C9` (butter)
- Stamps: 1 per order of ₱150 or more (max 1 a day); 10 stamps = free Ube Cheese Pandesal, pack of 10.

Menu:

| Category               | Item                         | Choices and price                     | Add-on groups   | Note          |
| ---------------------- | ---------------------------- | ------------------------------------- | --------------- | ------------- |
| Pandesal and Bread     | Classic Pandesal             | Pack: 1 pc ₱5, 10 pcs ₱50, 20 pcs ₱95 |                 | 20 pcs is new |
| Pandesal and Bread     | Ube Cheese Pandesal          | Pack: 1 pc ₱15, 10 pcs ₱140           |                 | Pack is new   |
| Pandesal and Bread     | Spanish Bread                | ₱10                                   |                 |               |
| Pandesal and Bread     | Pan de Coco                  | ₱12                                   |                 |               |
| Pandesal and Bread     | Monay                        | ₱10                                   |                 |               |
| Pandesal and Bread     | Kababayan                    | ₱12                                   |                 | New           |
| Ensaymada and Pastries | Classic Ensaymada            | ₱35                                   |                 |               |
| Ensaymada and Pastries | Ube Ensaymada                | ₱45                                   |                 |               |
| Ensaymada and Pastries | Cheese Roll                  | ₱25                                   |                 |               |
| Ensaymada and Pastries | Hopia Ube (6)                | ₱90                                   |                 |               |
| Cakes                  | Chocolate Moist Cake         | Size: 6" ₱450, 8" ₱650                | Cake extras     | 6" is new     |
| Cakes                  | Ube Macapuno Cake            | Size: 6" ₱520, 8" ₱750                | Cake extras     | 6" is new     |
| Cakes                  | Mamon (box of 6)             | ₱180                                  |                 |               |
| Pasalubong             | Ensaymada Malolos (box of 6) | ₱360                                  | Pasalubong wrap |               |
| Pasalubong             | Inipit (box of 10)           | ₱180                                  | Pasalubong wrap |               |
| Pasalubong             | Lola's Pasalubong Box        | ₱499: ensaymada, inipit, hopia, mamon | Pasalubong wrap | New           |
| Drinks                 | Brewed Coffee                | ₱40                                   |                 |               |
| Drinks                 | Sago't Gulaman               | ₱35                                   |                 |               |
| Drinks                 | Tsokolate                    | ₱45                                   |                 | New           |

Add-on groups (shared library):

| Group           | Rule               | Options                                                                                 |
| --------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Cake extras     | Optional, up to 3  | "Happy Birthday" topper +₱30 · Candles +₱20 · Write a short greeting in the note (free) |
| Pasalubong wrap | Optional, choose 1 | Banana-leaf and twine wrap +₱20                                                         |
