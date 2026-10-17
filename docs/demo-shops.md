# Demo shops (seed input)

Five demo shops for mocks, screenshots, demos and later the database seed. All people, phone numbers and handles are fictional: never call, text or message them. Streets and landmarks are real places; house numbers are made up. Check each pin in Google Maps before it goes into the database.

Prices here are in pesos for reading. Store them as centavos (₱149 = `14900`). The owner password is never written here; the seed script reads `DEMO_PASSWORD`.

## Shared shape (becomes `DemoShopSchema` in `packages/core`)

`slug, name, kind (food|retail), tagline, description, owner {name, email}, phone, address {line1, barangay, city, province, zip}, landmark, geo {lat, lng}, hours [day, open, close], orderTypes, payments, deliveryZones [name, fee], brandColor, stampRule {earn, goal, reward}, categories [name, items [name, price, variants?, note?]]`

## Summary

| # | Shop | Slug | Kind | City | Owner login |
| --- | --- | --- | --- | --- | --- |
| 1 | Kanto Smash Burgers | `kanto-smash` | food | Marikina | `morales.juanmiguel0729+burger@gmail.com` |
| 2 | AquaLinis Water Refilling Station | `aqualinis` | retail | Las Piñas | `morales.juanmiguel0729+water@gmail.com` |
| 3 | Tala Apparel | `tala-apparel` | retail | Cebu City | `morales.juanmiguel0729+tala@gmail.com` |
| 4 | Kapé Juan Coffee | `kape-juan` | food | Quezon City | `morales.juanmiguel0729+cafe@gmail.com` |
| 5 | Panaderya ni Lola Remy | `lola-remy` | food | Malolos | `morales.juanmiguel0729+bakery@gmail.com` |

Gmail "+" addresses all land in the founder's inbox, so codes and resets can be tested.

---

## 1. Kanto Smash Burgers (`kanto-smash`, food)

- Tagline: Smashed fresh, served hot sa kanto.
- Description: Thin, crispy-edged smash burgers on toasted potato buns, made to order. Born as a weekend stall, now the barkada's late-night stop in Marikina.
- Owner: Paolo Reyes · Phone: 0917 801 2201
- Address: 28 Bayan-Bayanan Ave., Brgy. Concepcion Uno, Marikina City, Metro Manila 1807 · Landmark: near the Concepcion Uno barangay hall · Pin: 14.6430, 121.1010
- Hours: Mon to Thu 11:00 AM to 10:00 PM; Fri to Sun 11:00 AM to 12:00 MN
- Order types: walk-in, pickup, delivery · Payments: cash, COD, GCash, Maya
- Delivery zones: Concepcion Uno and Dos ₱40 · Marikina Heights, Parang ₱60 · rest of Marikina ₱80
- Brand colour: `#D7372F` (ketchup red) · Stamps: 1 per order of ₱250 or more; 8 stamps = free Classic Smash (single)

| Category | Items |
| --- | --- |
| Smash Burgers | Classic Smash (single ₱149, double ₱209) · Cheesy Bacon Smash ₱229 · Kanto Spicy Smash, sriracha mayo and jalapeño ₱199 · Mushroom Swiss Smash ₱219 |
| Chicken and Rice | Crispy Chicken Sandwich ₱179 · Burger Steak with Rice ₱129 |
| Sides | Kanto Fries (regular ₱69, large ₱99) · Cheese Fries ₱119 · Onion Rings ₱99 |
| Combos | Smash Combo: Classic Smash, regular fries, iced tea ₱219 |
| Drinks | House Iced Tea (16 oz ₱45, 22 oz ₱65) · Calamansi Juice ₱55 · Soda in can ₱55 |
| Add-ons | Extra patty ₱60 · Cheese slice ₱20 · Bacon ₱40 · Egg ₱20 |

## 2. AquaLinis Water Refilling Station (`aqualinis`, retail)

- Tagline: Malinis, malamig, hatid sa pinto.
- Description: Purified, alkaline and mineral water refills with 8-stage filtration, tested monthly. Free delivery within the Pamplona barangays for 2 gallons or more.
- Owner: Ramon Dizon · Phone: 0928 455 3302
- Address: Unit 3, 145 Alabang–Zapote Road, Brgy. Pamplona Dos, Las Piñas City, Metro Manila 1740 · Landmark: 5 minutes from Las Piñas City Hall · Pin: 14.4510, 120.9840
- Hours: Mon to Sat 6:00 AM to 8:00 PM; Sun 7:00 AM to 5:00 PM
- Order types: walk-in, pickup, delivery · Payments: cash, COD, GCash
- Delivery zones: Pamplona Uno, Dos, Tres ₱0 (owner note: 2 gallons minimum) · Talon, Almanza ₱20 · rest of Las Piñas ₱40
- Brand colour: `#0E7AC4` (water blue) · Stamps: 1 per order; 10 stamps = 1 free round 5-gallon refill

| Category | Items |
| --- | --- |
| Refills (5 gallons) | Purified, round ₱30 · Purified, slim with faucet ₱30 · Alkaline, round ₱45 · Mineral, round ₱40 |
| New containers | Round 5-gallon with cap ₱250 · Slim 5-gallon with faucet ₱280 · Replacement faucet ₱60 |
| Bottled water | 500 mL × 24 case ₱180 · 1 L × 12 case ₱180 |
| Ice | Tube ice 2 kg ₱50 |

## 3. Tala Apparel (`tala-apparel`, retail)

- Tagline: Everyday Filipino-made pieces na may kislap.
- Description: Small-batch clothing and accessories sewn in Cebu, with woven and abaca details from local makers. Sizes S to XL; try-on at the studio by appointment.
- Owner: Bea Villanueva · Phone: 0995 230 4403
- Address: 2/F, 88 Salinas Drive, Brgy. Lahug, Cebu City, Cebu 6000 · Landmark: two blocks from JY Square Mall · Pin: 10.3310, 123.8990
- Hours: Tue to Sun 10:00 AM to 7:00 PM; closed Monday
- Order types: pickup, delivery · Payments: GCash, Maya, bank (BPI), COD within Cebu City
- Delivery zones: Cebu City ₱80 · Mandaue ₱120 · Lapu-Lapu, Talisay ₱150
- Brand colour: `#2E3A87` (midnight indigo) · Stamps: 1 per order of ₱1,000 or more; 5 stamps = ₱300 off

| Category | Items |
| --- | --- |
| Tops | Tala Basic Tee ₱450 (S, M, L, XL; black, white, sand) · Linen Button-down ₱899 · Cropped Knit Top ₱599 |
| Bottoms | Wide-leg Trousers ₱1,099 · Pleated Midi Skirt ₱899 · Denim Shorts ₱699 |
| Dresses | Habi-print Midi Dress ₱1,299 |
| Accessories | Abaca Tote Bag ₱650 · Capiz Shell Earrings ₱350 · Woven Bucket Hat ₱450 · Beaded Phone Strap ₱199 |

## 4. Kapé Juan Coffee (`kape-juan`, food)

- Tagline: Barako-strong coffee, isang tasa at a time.
- Description: A neighbourhood café on Maginhawa serving Batangas barako, tablea and Benguet arabica, with ensaymada and sandwiches from small bakers. Wi-Fi and outlets for study sessions.
- Owner: Juan Santos · Phone: 0918 672 5504
- Address: 61 Maginhawa St., Brgy. Teachers Village East, Quezon City, Metro Manila 1101 · Landmark: near the corner of Matatag St. · Pin: 14.6460, 121.0610
- Hours: daily 7:00 AM to 10:00 PM
- Order types: walk-in, pickup, delivery · Payments: cash, GCash, Maya, bank (BDO)
- Delivery zones: Teachers Village, UP Village ₱40 · Diliman ₱60 · Cubao, Kamuning ₱90
- Brand colour: `#6F4E37` (coffee brown) · Stamps: 1 per drink order; 10 stamps = any 16 oz drink free

| Category | Items |
| --- | --- |
| Espresso | Americano (12 oz ₱110, 16 oz ₱130) · Café Latte (₱140, ₱160) · Spanish Latte (₱160, ₱180) · Caramel Macchiato (₱170, ₱190) |
| Kapeng Pinoy | Barako Brew ₱95 · Iced Barako with Muscovado ₱130 · Tablea Mocha ₱165 |
| Non-coffee | Matcha Latte ₱170 · Ube Latte ₱170 · Tablea Hot Chocolate ₱140 |
| Food | Ensaymada ₱85 · Banana Bread slice ₱75 · Chicken Pesto Sandwich ₱185 |
| Add-ons | Oat milk ₱40 · Extra shot ₱40 · Sugar level (0, 25, 50, 100%) free |

## 5. Panaderya ni Lola Remy (`lola-remy`, food)

- Tagline: Mainit na pandesal since 1987.
- Description: A family bakeshop in Malolos baking pandesal twice a day (5 AM and 3 PM), Ensaymada Malolos and Bulacan pasalubong from Lola Remy's recipes, now run by her apo.
- Owner: Carla Bautista · Phone: 0906 318 6605
- Address: 214 Paseo del Congreso, City of Malolos, Bulacan 3000 (barangay to confirm on the map) · Landmark: 5 minutes' walk from Barasoain Church · Pin: 14.8470, 120.8120
- Hours: daily 5:00 AM to 8:00 PM
- Order types: walk-in, pickup, delivery · Payments: cash, COD, GCash
- Delivery zones: Malolos proper ₱50 · nearby barangays ₱80
- Brand colour: `#C27C2C` (golden crust) · Stamps: 1 per order of ₱150 or more; 10 stamps = 10 free Ube Cheese Pandesal

| Category | Items |
| --- | --- |
| Pandesal and bread | Classic Pandesal ₱5 each (pack of 10 ₱50) · Ube Cheese Pandesal ₱15 · Spanish Bread ₱10 · Pan de Coco ₱12 · Monay ₱10 |
| Ensaymada and pastries | Classic Ensaymada ₱35 · Ube Ensaymada ₱45 · Cheese Roll ₱25 · Hopia Ube (6) ₱90 |
| Cakes | Chocolate Moist Cake 8" ₱650 · Ube Macapuno Cake 8" ₱750 · Mamon (box of 6) ₱180 |
| Pasalubong | Ensaymada Malolos (box of 6) ₱360 · Inipit (box of 10) ₱180 |
| Drinks | Brewed Coffee ₱40 · Sago't Gulaman ₱35 |
