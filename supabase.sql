-- 1) Create the products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Chocolates','Snacks','Cookies','Other')),
  price numeric(10,2) not null check (price >= 0),
  description text default '',
  image_url text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Turn on Row Level Security
alter table public.products enable row level security;

-- Anyone can see available products on the shop
create policy "Public can view available products"
on public.products for select
to anon, authenticated
using (available = true);

-- Authenticated admins can manage products.
-- IMPORTANT: this simple version assumes only the admin account is able to sign in.
create policy "Authenticated users can insert products"
on public.products for insert
to authenticated
with check (true);

create policy "Authenticated users can update products"
on public.products for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete products"
on public.products for delete
to authenticated
using (true);

-- 3) Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
