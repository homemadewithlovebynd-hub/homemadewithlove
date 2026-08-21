# Homemade Goodness — free-hosted product catalogue

A simple mobile-friendly homemade-products shop with:
- Product catalogue
- Categories
- Prices in INR
- WhatsApp ordering
- Admin login
- Add/edit/delete products
- Product image upload
- Supabase database + storage

## Free hosting stack

- Cloudflare Pages for hosting
- Supabase Free for database, authentication and image storage

Both have free tiers. Check current provider limits before launching a busy commercial store.

## 1. Create Supabase project

Create a free Supabase project.

Open SQL Editor and run the complete contents of `supabase.sql`.

Then create your admin account:
Authentication → Users → Add user.

Use the email/password you want for the admin dashboard.

## 2. Configure the website

Copy:

`config.example.js` → `config.js`

Then fill:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- WHATSAPP_NUMBER

The WhatsApp number must include the country code, without + or spaces.
Example: `919876543210`

Never put a Supabase `service_role` key in this website.

## 3. Test locally

You need a local web server (because browser modules/auth can behave differently from file://).

For example with Python:

`python -m http.server 8000`

Then open:

`http://localhost:8000`

## 4. Deploy to Cloudflare Pages

Create a GitHub repository and upload these files.

In Cloudflare Pages:
- Create application
- Pages → Connect to Git
- Select the repository
- Framework preset: None
- Build command: leave empty
- Output directory: `/`

Cloudflare will give you a free `*.pages.dev` URL.

## 5. Important security note

This demo uses Supabase Auth plus RLS. For a single-owner shop, create only your own admin user.

For a larger admin team, replace the broad authenticated policies with a dedicated `admin_users` table and role-based policies.

## WhatsApp

The customer does not pay on the site. Clicking "Order on WhatsApp" opens WhatsApp with the selected product and price already filled in.


## Security and mobile grid fix
- `admin-only-rls.sql` makes product insert/update/delete and product-image writes admin-only for the configured admin UUID.
- `admin.js` also blocks non-admin Supabase accounts from opening the admin dashboard.
- Mobile product cards use a two-column grid instead of collapsing to one column.

## Inventory + order reservation

1. In Supabase SQL Editor, run `inventory.sql` after the existing `admin-only-rls.sql`.
2. In Admin, enter the real available stock for every product. Existing products will have stock 0 after the migration, so set their actual stock before publishing.
3. Customers can add only up to the current stock.
4. Clicking **Order all on WhatsApp** creates a pending order and atomically reserves/decrements stock. The WhatsApp message contains the order ID.
5. In Admin > Orders, **Confirm** keeps the reserved stock consumed. **Cancel** returns the reserved quantities to inventory.
6. A product automatically displays **Out of Stock** when stock reaches 0.

Important: because WhatsApp is an external service, the site cannot know whether the customer actually sent the WhatsApp message. The pending/confirm/cancel workflow prevents that ambiguity from permanently consuming stock.

### Inventory SQL correction
The included `inventory.sql` creates/replaces the order RPC functions before granting function permissions. This avoids the `42883 function ... does not exist` error that can occur when running the migration on a fresh or partially migrated database. It is also safe to re-run after a partial migration.
