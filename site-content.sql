-- handmadewithlove: editable storefront sections
-- Run this ONCE in Supabase SQL Editor. It does not change products or inventory.

create table if not exists public.site_content (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "Public can read site content" on public.site_content;
drop policy if exists "Admin can insert site content" on public.site_content;
drop policy if exists "Admin can update site content" on public.site_content;
drop policy if exists "Admin can delete site content" on public.site_content;

create policy "Public can read site content"
on public.site_content for select
to anon, authenticated
using (true);

create policy "Admin can insert site content"
on public.site_content for insert
to authenticated
with check (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

create policy "Admin can update site content"
on public.site_content for update
to authenticated
using (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid)
with check (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

create policy "Admin can delete site content"
on public.site_content for delete
to authenticated
using (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

insert into public.site_content (slug,title,body) values
('orders','Orders','Sign in to your account for a faster checkout. Your current cart can be opened from the Cart button above.'),
('track-order','Track your order','Enter your order details on WhatsApp and we will help you with an update on your order.'),
('about','Homemade is more than a recipe.','handmadewithlove by Neha is about the little things that make homemade food special — familiar flavours, thoughtful ingredients and the joy of sharing something made by hand.\n\nEvery batch is prepared with care so that what reaches you feels personal, warm and delicious.'),
('return-policy','Returns & refunds','Please contact us as soon as possible if there is an issue with your order. We will review it and help you with the next steps.'),
('contact-us',"We'd love to hear from you",'For questions, custom orders or order updates, please contact us on WhatsApp.'),
('shipping-policy','Delivery & shipping','Delivery details, timelines and charges will be shared when your order is confirmed.'),
('terms-of-service','Terms of service','Please contact us if you have any questions about ordering or using this website.')
on conflict (slug) do nothing;
