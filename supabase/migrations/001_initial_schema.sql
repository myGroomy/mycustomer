create extension if not exists pgcrypto;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  pin text not null,
  role text not null check (role in ('owner', 'admin', 'kasir')),
  branch text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone_normalized text not null,
  name text not null,
  first_order_date date not null,
  created_at timestamptz not null default now(),
  version text,
  branch text,
  order_count integer not null default 0,
  description text,
  age_range text,
  usia text,
  gender text,
  jenis_kelamin text,
  aliases jsonb not null default '[]'::jsonb,
  branch_memberships jsonb not null default '[]'::jsonb,
  is_followed_up boolean not null default false,
  followed_up_at timestamptz,
  constraint customers_phone_normalized_not_blank check (length(trim(phone_normalized)) > 0)
);

create unique index if not exists customers_phone_normalized_unique
  on public.customers (phone_normalized);
create index if not exists customers_branch_idx on public.customers (branch);
create index if not exists customers_name_idx on public.customers (lower(name));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_date date not null,
  channel text not null,
  raw_phone_input text,
  created_at timestamptz not null default now(),
  branch text,
  is_followed_up boolean not null default false,
  followed_up_at timestamptz
);

create index if not exists orders_customer_date_idx
  on public.orders (customer_id, order_date desc);
create index if not exists orders_branch_date_idx
  on public.orders (branch, order_date desc);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

alter table public.branches enable row level security;
alter table public.app_users enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.app_settings enable row level security;
