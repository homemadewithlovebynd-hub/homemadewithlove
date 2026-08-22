# handmadewithlove by Neha — refined storefront

This package updates the storefront and admin product form while keeping the existing Supabase/inventory/order logic intact.

## Important

**Keep your existing working `config.js`.** It contains your Supabase URL, anon key and WhatsApp number. This package intentionally does not include `config.js` so you do not accidentally overwrite your working configuration.

Do not run `inventory.sql` again if inventory is already working.

## Included changes

- Warm cream / maroon storefront design
- Single Cormorant Garamond font throughout the UI
- Smaller sidebar close (X) button
- Admin link at the bottom of the sidebar
- Hero carousel with previous/next controls and three local food illustrations
- No decorative heart overlay in the hero image area
- Category section and New Arrival filter retained
- Product, cart, authentication, WhatsApp ordering and Supabase integration retained
- More professional Add Product form in Admin
- Existing Site Content editor retained
- Existing inventory/order SQL files are unchanged

## Deploy

Replace the website files in your GitHub repository with this package, but **leave your existing `config.js` in place**.
