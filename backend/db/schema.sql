-- RoomVAI — схема базы данных (Supabase / PostgreSQL)
-- Применить в Supabase Dashboard → SQL Editor.
--
-- Таблицы: profiles, generations, generation_results, subscriptions, consents
-- + триггеры, RLS-политики, storage bucket.

-- ============================================================================
-- 1. PROFILES — дополнение к auth.users
-- ============================================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    free_generations_used int not null default 0,
    is_anonymous boolean not null default false,
    created_at timestamptz not null default now()
);

-- Автосоздание профиля при регистрации.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. GENERATIONS — один прогон пользователя
-- ============================================================================
create table if not exists public.generations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    anonymous_id uuid,
    source_image_path text,
    room_type text not null default 'other',
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'failed')),
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists idx_generations_user_id on public.generations(user_id);
create index if not exists idx_generations_created_at on public.generations(created_at desc);

-- ============================================================================
-- 3. GENERATION_RESULTS — результаты по стилям + стоимость (unit-экономика)
-- ============================================================================
create table if not exists public.generation_results (
    id uuid primary key default gen_random_uuid(),
    generation_id uuid not null references public.generations(id) on delete cascade,
    style text not null,
    status text not null default 'pending'
        check (status in ('pending', 'processing', 'completed', 'failed')),
    result_image_path text,
    replicate_prediction_id text,
    cost_usd numeric(10, 4),
    error text,
    created_at timestamptz not null default now()
);

create index if not exists idx_results_generation_id on public.generation_results(generation_id);
create index if not exists idx_results_prediction_id on public.generation_results(replicate_prediction_id);

-- View: агрегация стоимости по дням (контроль unit-экономики, раздел 4).
create or replace view public.api_cost_daily as
select
    date_trunc('day', created_at) as day,
    count(*) as generations_count,
    sum(cost_usd) as total_cost_usd
from public.generation_results
where status = 'completed'
group by day
order by day desc;

-- ============================================================================
-- 4. SUBSCRIPTIONS — синхронизация из RevenueCat webhook
-- ============================================================================
create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    revenuecat_user_id text,
    entitlement text not null default 'premium',
    plan text check (plan in ('weekly', 'monthly', 'yearly')),
    status text not null default 'active'
        check (status in ('active', 'expired', 'cancelled')),
    expires_at timestamptz,
    updated_at timestamptz not null default now(),
    unique (user_id)
);

-- ============================================================================
-- 5. CONSENTS — согласие на обработку фото (GDPR / 152-ФЗ)
-- ============================================================================
create table if not exists public.consents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade,
    photo_processing_consent boolean not null default false,
    consented_at timestamptz not null default now(),
    policy_version text not null default '1.0'
);

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.generation_results enable row level security;
alter table public.subscriptions enable row level security;
alter table public.consents enable row level security;

-- Profiles: пользователь видит только свой профиль.
create policy "Профиль: владелец" on public.profiles
    for select using (auth.uid() = id);
create policy "Профиль: обновление владельцем" on public.profiles
    for update using (auth.uid() = id);

-- Generations: пользователь видит/создаёт только свои (+ анонимные по anonymous_id).
create policy "Генерации: чтение владельцем" on public.generations
    for select using (auth.uid() = user_id);
create policy "Генерации: создание" on public.generations
    for insert with check (auth.uid() = user_id or user_id is null);

-- Results: чтение через принадлежность к generation.
create policy "Результаты: чтение владельцем" on public.generation_results
    for select using (
        exists (
            select 1 from public.generations g
            where g.id = generation_id and g.user_id = auth.uid()
        )
    );

-- Subscriptions: только свои.
create policy "Подписки: чтение владельцем" on public.subscriptions
    for select using (auth.uid() = user_id);

-- Consents: только свои.
create policy "Согласия: чтение владельцем" on public.consents
    for select using (auth.uid() = user_id);
create policy "Согласия: создание" on public.consents
    for insert with check (auth.uid() = user_id or user_id is null);

-- ============================================================================
-- 7. STORAGE BUCKETS
-- ============================================================================
-- Исходные фото и сгенерированные изображения.
-- Bucket 'source-images' — приватный (доступ по подписанным URL).
-- Bucket 'result-images' — приватный.

insert into storage.buckets (id, name, public)
values ('source-images', 'source-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('result-images', 'result-images', false)
on conflict (id) do nothing;

-- Политики storage: пользователь работает только со своими файлами (папка user_id).
create policy "Source: загрузка владельцем" on storage.objects
    for insert with check (
        bucket_id = 'source-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Source: чтение владельцем" on storage.objects
    for select using (
        bucket_id = 'source-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Result-images: бэкенд (service role) записывает, пользователь читает.
create policy "Result: чтение владельцем" on storage.objects
    for select using (
        bucket_id = 'result-images'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- ГОТОВО. Таблицы, RLS, storage buckets созданы.
-- Следующий шаг: указать EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_ANON_KEY в .env
-- ============================================================================
