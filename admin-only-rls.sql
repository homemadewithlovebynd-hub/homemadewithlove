-- homemadewithlove: secure admin-only product management
-- Run this ONCE in Supabase SQL Editor.

-- Keep public read access so customers can see both available and out-of-stock products.
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
DROP POLICY IF EXISTS "Public can view all products" ON public.products;
DROP POLICY IF EXISTS "Admin can view all products" ON public.products;
CREATE POLICY "Public can view all products"
ON public.products FOR SELECT TO anon, authenticated
USING (true);

-- Remove the old/generic authenticated write policies.
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin can update products" ON public.products;
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;

-- ONLY this exact Supabase Auth user may add/edit/delete products.
CREATE POLICY "Admin can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

CREATE POLICY "Admin can update products"
ON public.products FOR UPDATE TO authenticated
USING (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid)
WITH CHECK (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

CREATE POLICY "Admin can delete products"
ON public.products FOR DELETE TO authenticated
USING (auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

-- New Arrival flag (safe if already present).
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS new_arrival boolean NOT NULL DEFAULT false;

-- Product image writes must also be admin-only.
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;

CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

CREATE POLICY "Admin can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid)
WITH CHECK (bucket_id = 'product-images' AND auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);

CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND auth.uid() = 'a7ebcd42-0d22-43cd-b8b3-06e131d7cbed'::uuid);
