# handmadewithlove — Reference Landing Page (fixed)

This package fixes the three issues reported:

1. The left navigation is now genuinely collapsible on desktop and mobile. It is closed by default; the menu button opens it and X closes it.
2. The logo is smaller while keeping the same logo artwork.
3. The landing-page hero/category images are bundled with the package and product images have a safe fallback.

## IMPORTANT: keep your existing config.js

This package intentionally does NOT include `config.js` so that your working Supabase URL/key and WhatsApp number are not overwritten.

When copying the package into your existing GitHub repository, **keep your existing `config.js`**.

Do NOT run `inventory.sql` again.
Do NOT run any new SQL for this UI fix.

## Files

- `index.html` — landing page
- `styles.css` — layout/theme/sidebar fixes
- `app.js` — product loading/navigation fixes
- `brand-logo.png` — brand logo
- `hero-food.jpg` — hero image
- `cat-chocolates.jpg`
- `cat-cookies.jpg`
- `cat-snacks.jpg`
- `cat-new-arrivals.jpg`
- existing admin/inventory/site-content files retained
