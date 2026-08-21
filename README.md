# homemadewithlove by Neha

Updated package includes:
- Admin-only product management and RLS
- Inventory / stock tracking
- Automatic Out of Stock when stock reaches zero
- Order reservation / confirm / cancel inventory flow
- 2-column product grid on mobile
- New Arrival and Out of Stock badges permanently visible over product images (not hover-only)

Keep the existing `config.js` values. The database migration in `inventory.sql` has already been successfully executed if you are updating from the previous inventory-fixed package; do not run it again unless needed.


Badge fix: New Arrival and Out of Stock badges are forced permanently visible, including on mobile and desktop, independent of hover state.
