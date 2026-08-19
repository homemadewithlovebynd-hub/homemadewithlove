-- Run this in Supabase SQL Editor.
-- This migration supports customer sign-up/login, out-of-stock display,
-- and an admin-controlled New Arrival banner.

-- 1) Add the new-arrival flag if it doesn't exist.
alter table public.products
add column if not exists new_arrival boolean not null default false;

-- 2) Customers should be able to SEE all products so out-of-stock items can be displayed.
drop policy if exists "Public can view available products" on public.products;
drop policy if exists "Admin can view all products" on public.products;

create policy "Public can view all products"
on public.products
for select
to anon, authenticated
using (true);

-- 3) IMPORTANT: customers may sign up, so only YOUR admin UUID may modify products.
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

create policy "Admin can insert products"
on public.products
for insert
to authenticated
with check (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

create policy "Admin can update products"
on public.products
for update
to authenticated
using (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid)
with check (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

create policy "Admin can delete products"
on public.products
for delete
to authenticated
using (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

-- 4) Customer sign-up/login uses Supabase Auth.
-- No customer profile table is required for this version.
-- If email confirmation is enabled in Supabase Auth, new customers will receive a confirmation email.

-- 5) Keep product image storage admin-only for uploads/updates/deletes.
drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;

create policy "Admin can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid
);

create policy "Admin can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid)
with check (bucket_id = 'product-images' and auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

create policy "Admin can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);
