create table if not exists public.saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text not null,
  price text,
  image text,
  source text,
  badge text,
  saved_at timestamptz not null default now()
);

create unique index if not exists saved_products_user_url_key
  on public.saved_products (user_id, url);

alter table public.saved_products enable row level security;

create policy "Users can view their own saved products"
  on public.saved_products
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved products"
  on public.saved_products
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved products"
  on public.saved_products
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved products"
  on public.saved_products
  for delete
  using (auth.uid() = user_id);
