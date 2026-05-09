-- =============================================================
-- Seed-данные для демонстрации CRM
--
-- Запустите ПОСЛЕ schema.sql и migrations/0001_activities.sql,
-- и ПОСЛЕ того как зарегистрировали хотя бы одного пользователя
-- (тогда в public.profiles будет хотя бы одна строка).
--
-- Скрипт идемпотентен по простому правилу: если в clients уже
-- есть хотя бы одна запись — мы ничего не делаем. Это защищает
-- ваши настоящие данные от перезаписи.
-- =============================================================

do $$
declare
  v_actor uuid;
  v_client_anna uuid := uuid_generate_v4();
  v_client_petr uuid := uuid_generate_v4();
  v_client_sergey uuid := uuid_generate_v4();
  v_client_olga uuid := uuid_generate_v4();
  v_client_dmitry uuid := uuid_generate_v4();
  v_property_sokolniki uuid := uuid_generate_v4();
  v_property_tverskaya uuid := uuid_generate_v4();
  v_property_house uuid := uuid_generate_v4();
  v_property_office uuid := uuid_generate_v4();
  v_property_studio uuid := uuid_generate_v4();
  v_deal_anna uuid := uuid_generate_v4();
  v_deal_petr uuid := uuid_generate_v4();
  v_deal_sergey uuid := uuid_generate_v4();
  v_deal_dmitry uuid := uuid_generate_v4();
begin
  if exists (select 1 from public.clients limit 1) then
    raise notice 'Seed пропущен: в таблице clients уже есть данные.';
    return;
  end if;

  select id into v_actor from public.profiles
    order by created_at asc limit 1;

  if v_actor is null then
    raise exception 'Seed остановлен: создайте хотя бы одного пользователя через /register перед запуском seed.sql';
  end if;

  -- ---------- clients ----------
  insert into public.clients
    (id, full_name, phone, email, source, status, deal_type,
     budget_min, budget_max, notes, assigned_to, created_by, created_at, updated_at)
  values
    (v_client_anna, 'Анна Соколова', '+7 (916) 234-56-78', 'anna.s@example.com',
     'cian', 'in_progress', 'buy', 4500000, 6500000,
     'Ищет 2-комнатную квартиру у метро. Готова смотреть по выходным.',
     v_actor, v_actor, now() - interval '12 days', now() - interval '2 days'),
    (v_client_petr, 'Пётр Иванов', '+7 (903) 111-22-33', 'petr.ivanov@example.com',
     'referral', 'new', 'rent_in', 60000, 90000,
     'Срочный поиск аренды на год.',
     v_actor, v_actor, now() - interval '3 days', now() - interval '3 days'),
    (v_client_sergey, 'Сергей Михайлов', '+7 (925) 998-76-54', null,
     'avito', 'in_progress', 'sell', null, null,
     'Хочет продать квартиру родителей в Сокольниках.',
     v_actor, v_actor, now() - interval '20 days', now() - interval '15 days'),
    (v_client_olga, 'Ольга Кузнецова', '+7 (909) 444-55-66', 'olga.k@example.com',
     'instagram', 'new', 'buy', 8000000, 12000000,
     'Хочет дом в Подмосковье, бюджет до 12 млн.',
     v_actor, v_actor, now() - interval '25 days', now() - interval '25 days'),
    (v_client_dmitry, 'Дмитрий Зайцев', '+7 (985) 333-44-55', 'd.zaytsev@example.com',
     'other', 'won', 'buy', 15000000, 20000000,
     'Покупка офиса в центре. Сделка завершена.',
     v_actor, v_actor, now() - interval '60 days', now() - interval '5 days');

  -- ---------- properties ----------
  insert into public.properties
    (id, title, property_type, listing_type, status, price,
     area, rooms, address, city, district, description, cover_url,
     assigned_to, created_by, created_at, updated_at)
  values
    (v_property_sokolniki, '2-комн. в Сокольниках, 5 мин. до метро',
     'apartment', 'sale', 'active', 5800000, 54.2, 2,
     'ул. Русаковская, 24', 'Москва', 'Сокольники',
     'Светлая 2-комнатная квартира в кирпичном доме. Хороший ремонт, балкон, тихий двор.',
     null, v_actor, v_actor, now() - interval '15 days', now() - interval '3 days'),
    (v_property_tverskaya, 'Студия на Тверской, для аренды',
     'apartment', 'rent', 'active', 75000, 28.0, 1,
     'Тверская, 12', 'Москва', 'Тверской',
     'Стильная студия в самом центре. Подходит для пары или одного человека.',
     null, v_actor, v_actor, now() - interval '10 days', now() - interval '1 days'),
    (v_property_house, 'Загородный дом в Барвихе',
     'house', 'sale', 'active', 18500000, 220.0, 5,
     'пос. Барвиха, ул. Лесная, 8', 'Барвиха', null,
     'Двухэтажный дом с террасой и участком 12 соток. Сауна, гараж на 2 авто.',
     null, v_actor, v_actor, now() - interval '30 days', now() - interval '2 days'),
    (v_property_office, 'Офис 80 м² в БЦ "Красная Пресня"',
     'commercial', 'sale', 'sold', 17500000, 80.0, null,
     'Пресненская набережная, 12', 'Москва', 'Пресненский',
     'Офисное помещение open-space с панорамными окнами.',
     null, v_actor, v_actor, now() - interval '50 days', now() - interval '5 days'),
    (v_property_studio, 'Уютная студия рядом с метро',
     'apartment', 'sale', 'active', 4200000, 25.0, 1,
     'ул. Профсоюзная, 88', 'Москва', 'Академический',
     'Хороший вариант под аренду или первое жильё.',
     null, v_actor, v_actor, now() - interval '5 days', now() - interval '5 days');

  -- ---------- deals ----------
  insert into public.deals
    (id, title, client_id, property_id, stage, amount, commission,
     expected_close_date, closed_at, notes,
     assigned_to, created_by, created_at, updated_at)
  values
    (v_deal_anna, 'Покупка 2-комн. — Анна Соколова',
     v_client_anna, v_property_sokolniki, 'negotiation', 5800000, 174000,
     (now() + interval '14 days')::date, null,
     'Обсуждаем условия с продавцом. Готова к показу 10 мая.',
     v_actor, v_actor, now() - interval '8 days', now() - interval '2 days'),
    (v_deal_petr, 'Аренда студии — Пётр Иванов',
     v_client_petr, v_property_tverskaya, 'viewing', 75000, 75000,
     (now() + interval '7 days')::date, null,
     'Завтра показ в 18:00.',
     v_actor, v_actor, now() - interval '2 days', now() - interval '1 days'),
    (v_deal_sergey, 'Продажа квартиры — Сергей Михайлов',
     v_client_sergey, null, 'new', null, null,
     null, null,
     'Только начали — делаем фотосъёмку.',
     v_actor, v_actor, now() - interval '15 days', now() - interval '15 days'),
    (v_deal_dmitry, 'Покупка офиса — Дмитрий Зайцев',
     v_client_dmitry, v_property_office, 'closed_won', 17500000, 525000,
     (now() - interval '5 days')::date, now() - interval '5 days',
     'Сделка прошла успешно.',
     v_actor, v_actor, now() - interval '60 days', now() - interval '5 days');

  -- ---------- tasks ----------
  insert into public.tasks
    (title, description, status, priority, due_at,
     client_id, deal_id, property_id, assigned_to, created_by)
  values
    ('Перезвонить Анне по второму варианту',
     'Уточнить, готова ли поднять бюджет до 7 млн.',
     'todo', 'high',
     now() + interval '1 day',
     v_client_anna, v_deal_anna, null, v_actor, v_actor),
    ('Показ студии на Тверской',
     'Встреча с Петром в 18:00 у подъезда.',
     'todo', 'high',
     now() + interval '1 day' + interval '6 hours',
     v_client_petr, v_deal_petr, v_property_tverskaya, v_actor, v_actor),
    ('Заказать фотосессию квартиры',
     'Позвонить фотографу, договориться на пятницу.',
     'in_progress', 'medium',
     now() + interval '3 days',
     v_client_sergey, v_deal_sergey, null, v_actor, v_actor),
    ('Подготовить подборку домов для Ольги',
     '3-4 варианта в бюджете до 12 млн в Подмосковье.',
     'todo', 'medium',
     now() + interval '2 days',
     v_client_olga, null, null, v_actor, v_actor),
    ('Закрыть сделку с Дмитрием',
     'Подписать акт приёма-передачи.',
     'done', 'high',
     now() - interval '5 days',
     v_client_dmitry, v_deal_dmitry, v_property_office, v_actor, v_actor),
    ('Просроченная: проверить документы',
     'Уже надо было сделать вчера.',
     'todo', 'high',
     now() - interval '1 day',
     v_client_olga, null, null, v_actor, v_actor);

  raise notice 'Seed выполнен. Создано клиентов: 5, объектов: 5, сделок: 4, задач: 6.';
end $$;
