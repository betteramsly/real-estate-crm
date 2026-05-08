-- =============================================================
-- Real Estate CRM — Seed
-- ВАЖНО: Сначала создай в Supabase двух пользователей вручную
-- (Authentication → Users → Add user):
--   admin@demo.local / demo1234
--   agent@demo.local / demo1234
-- Затем запусти этот скрипт. Он:
--   1. Поставит роль admin для admin@demo.local
--   2. Создаст демо-клиентов, объекты, сделки, задачи
-- Безопасно перезапускать: использует ON CONFLICT DO NOTHING.
-- =============================================================

-- 1) Назначить роли
update public.profiles
   set role = 'admin', full_name = coalesce(full_name, 'Admin Demo')
 where id = (select id from auth.users where email = 'admin@demo.local');

update public.profiles
   set role = 'agent', full_name = coalesce(full_name, 'Agent Demo')
 where id = (select id from auth.users where email = 'agent@demo.local');

-- 2) Получим id демо-юзеров в CTE для удобства
with
  admin_user as (select id from auth.users where email = 'admin@demo.local'),
  agent_user as (select id from auth.users where email = 'agent@demo.local'),
  ids as (
    select
      (select id from admin_user) as admin_id,
      (select id from agent_user) as agent_id
  )

-- 3) Клиенты
insert into public.clients
  (id, full_name, phone, email, source, status, budget_min, budget_max,
   deal_type, notes, assigned_to, created_by)
select
  '11111111-1111-1111-1111-000000000001'::uuid,
  'Алексей Смирнов', '+7 (903) 111-22-33', 'alex@example.com',
  'referral', 'in_progress', 12000000, 16000000,
  'buy', 'Ищет 2-комн. в районе м. Сокольники, до 16 млн.',
  ids.agent_id, ids.agent_id
from ids
on conflict (id) do nothing;

insert into public.clients
  (id, full_name, phone, email, source, status, budget_min, budget_max,
   deal_type, notes, assigned_to, created_by)
select
  '11111111-1111-1111-1111-000000000002'::uuid,
  'Мария Иванова', '+7 (905) 222-33-44', 'maria@example.com',
  'cian', 'new', null, null, 'rent_in', 'Снять 1-комн. в центре.',
  ids.agent_id, ids.agent_id
from (select admin_id, agent_id from
        (select (select id from auth.users where email='admin@demo.local') as admin_id,
                (select id from auth.users where email='agent@demo.local') as agent_id) t) ids
on conflict (id) do nothing;

insert into public.clients
  (id, full_name, phone, email, source, status, budget_min, budget_max,
   deal_type, notes, assigned_to, created_by)
select
  '11111111-1111-1111-1111-000000000003'::uuid,
  'Игорь Петров', '+7 (916) 555-66-77', 'igor@example.com',
  'instagram', 'won', 25000000, 35000000,
  'buy', 'Купил квартиру у нас в марте.',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.clients
  (id, full_name, phone, email, source, status, budget_min, budget_max,
   deal_type, notes, assigned_to, created_by)
select
  '11111111-1111-1111-1111-000000000004'::uuid,
  'Елена Кузнецова', '+7 (909) 777-88-99', 'elena@example.com',
  'avito', 'in_progress', 5000000, 7000000,
  'buy', 'Студия для инвестиции.',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.clients
  (id, full_name, phone, email, source, status, budget_min, budget_max,
   deal_type, notes, assigned_to, created_by)
select
  '11111111-1111-1111-1111-000000000005'::uuid,
  'Сергей Соколов', '+7 (926) 333-44-55', 'sergey@example.com',
  'other', 'lost', null, null, 'sell', 'Передумал продавать.',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

-- 4) Объекты
insert into public.properties
  (id, title, property_type, listing_type, status, price, area, rooms,
   address, city, district, description, cover_url, assigned_to, created_by)
select
  '22222222-2222-2222-2222-000000000001'::uuid,
  '2-комн. на Сокольнической', 'apartment', 'sale', 'active',
  14500000, 56, 2,
  'ул. Русаковская, 24', 'Москва', 'Сокольники',
  'Светлая квартира, евроремонт, рядом метро.',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.properties
  (id, title, property_type, listing_type, status, price, area, rooms,
   address, city, district, description, cover_url, assigned_to, created_by)
select
  '22222222-2222-2222-2222-000000000002'::uuid,
  'Студия в центре', 'apartment', 'rent', 'active',
  60000, 28, 1,
  'ул. Тверская, 10', 'Москва', 'Тверской',
  'Аренда, мебель, на длительный срок.',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.properties
  (id, title, property_type, listing_type, status, price, area, rooms,
   address, city, district, description, cover_url, assigned_to, created_by)
select
  '22222222-2222-2222-2222-000000000003'::uuid,
  'Загородный дом', 'house', 'sale', 'reserved',
  32000000, 220, 5,
  'кп. Новорижский, ул. Лесная, 5', 'Московская обл.', 'Истринский',
  'Дом 220 м² на 12 сотках, готов к проживанию.',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.properties
  (id, title, property_type, listing_type, status, price, area, rooms,
   address, city, district, description, cover_url, assigned_to, created_by)
select
  '22222222-2222-2222-2222-000000000004'::uuid,
  'Коммерция на 1 этаже', 'commercial', 'sale', 'active',
  45000000, 120, null,
  'Ленинский пр., 45', 'Москва', 'Гагаринский',
  'Готовый арендный бизнес, доход 350 тыс/мес.',
  'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.properties
  (id, title, property_type, listing_type, status, price, area, rooms,
   address, city, district, description, cover_url, assigned_to, created_by)
select
  '22222222-2222-2222-2222-000000000005'::uuid,
  'Участок в МО', 'land', 'sale', 'active',
  3500000, 1500, null,
  'д. Поповка', 'Московская обл.', 'Чеховский',
  'Участок ИЖС, газ, электричество.',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

-- 5) Сделки
insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000001'::uuid,
  'Покупка 2-комн. — Смирнов',
  '11111111-1111-1111-1111-000000000001'::uuid,
  '22222222-2222-2222-2222-000000000001'::uuid,
  'negotiation', 14300000, 430000,
  current_date + interval '14 days',
  'Обсуждаем скидку.',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000002'::uuid,
  'Аренда студии — Иванова',
  '11111111-1111-1111-1111-000000000002'::uuid,
  '22222222-2222-2222-2222-000000000002'::uuid,
  'viewing', 60000, 60000,
  current_date + interval '7 days',
  'Показ в субботу.',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, closed_at, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000003'::uuid,
  'Покупка дома — Петров',
  '11111111-1111-1111-1111-000000000003'::uuid,
  '22222222-2222-2222-2222-000000000003'::uuid,
  'closed_won', 31500000, 945000,
  current_date - interval '14 days',
  now() - interval '7 days',
  'Сделка успешно закрыта.',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000004'::uuid,
  'Студия для Кузнецовой',
  '11111111-1111-1111-1111-000000000004'::uuid,
  null,
  'new', 6500000, 195000,
  current_date + interval '30 days',
  'Подбираем варианты.',
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, closed_at, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000005'::uuid,
  'Продажа Соколова',
  '11111111-1111-1111-1111-000000000005'::uuid,
  null,
  'closed_lost', null, null,
  current_date - interval '20 days',
  now() - interval '20 days',
  'Клиент передумал продавать.',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.deals
  (id, title, client_id, property_id, stage, amount, commission,
   expected_close_date, notes, assigned_to, created_by)
select
  '33333333-3333-3333-3333-000000000006'::uuid,
  'Коммерция — Петров',
  '11111111-1111-1111-1111-000000000003'::uuid,
  '22222222-2222-2222-2222-000000000004'::uuid,
  'contract', 44000000, 1320000,
  current_date + interval '5 days',
  'Готовим договор.',
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

-- 6) Задачи
insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000001'::uuid,
  'Позвонить Смирнову', 'Обсудить размер скидки',
  'todo', 'high', now() + interval '4 hours',
  '11111111-1111-1111-1111-000000000001'::uuid,
  '33333333-3333-3333-3333-000000000001'::uuid,
  null,
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000002'::uuid,
  'Показ студии Ивановой', 'м. Тверская, 14:00',
  'todo', 'medium', now() + interval '2 days',
  '11111111-1111-1111-1111-000000000002'::uuid,
  '33333333-3333-3333-3333-000000000002'::uuid,
  '22222222-2222-2222-2222-000000000002'::uuid,
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000003'::uuid,
  'Подготовить договор',
  'Договор по коммерции на Ленинском',
  'in_progress', 'high', now() + interval '1 day',
  '11111111-1111-1111-1111-000000000003'::uuid,
  '33333333-3333-3333-3333-000000000006'::uuid,
  '22222222-2222-2222-2222-000000000004'::uuid,
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;

insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000004'::uuid,
  'Подобрать студии для Кузнецовой',
  'Бюджет до 7 млн, ЦАО',
  'todo', 'medium', now() + interval '3 days',
  '11111111-1111-1111-1111-000000000004'::uuid,
  '33333333-3333-3333-3333-000000000004'::uuid,
  null,
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000005'::uuid,
  'Обновить фото объекта',
  'Сделать новые фото 2-комн.',
  'todo', 'low', now() + interval '5 days',
  null, null,
  '22222222-2222-2222-2222-000000000001'::uuid,
  ids.agent_id, ids.agent_id
from (select (select id from auth.users where email='agent@demo.local') as agent_id) ids
on conflict (id) do nothing;

insert into public.tasks
  (id, title, description, status, priority, due_at,
   client_id, deal_id, property_id, assigned_to, created_by)
select
  '44444444-4444-4444-4444-000000000006'::uuid,
  'Поздравить Петрова',
  'Закрытие сделки',
  'done', 'low', now() - interval '5 days',
  '11111111-1111-1111-1111-000000000003'::uuid,
  '33333333-3333-3333-3333-000000000003'::uuid,
  null,
  ids.admin_id, ids.admin_id
from (select (select id from auth.users where email='admin@demo.local') as admin_id) ids
on conflict (id) do nothing;
