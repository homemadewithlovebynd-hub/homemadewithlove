# handmadewithlove reference landing page — corrected

This package fixes the previous landing-page issues:
- sidebar menu now reliably opens/closes;
- explicit Admin button links to `admin.html`;
- the JS no longer crashes because of a missing `#year` element;
- Supabase initialization is defensive;
- product image assets are included;
- sidebar logo is reduced in size.

## IMPORTANT
Keep your existing working `config.js` from your current GitHub project. Do NOT replace it with a placeholder. This package intentionally does not include secrets or a real Supabase key.

Do NOT rerun inventory SQL just for this frontend update.


## Final visual refinement
- Single Cormorant Garamond font throughout the storefront UI.
- Transparent logo artwork used in sidebar/footer to eliminate the visible rectangle.
- Admin link moved from the header to the footer.
- Logo sizing reduced slightly.
