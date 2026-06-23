create table if not exists public.pricing_catalogs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  service_domain text not null,
  source_file_name text,
  source_sheet_name text,
  pricing_year_label text,
  currency_code text not null default 'SGD',
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pricing_items (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.pricing_catalogs(id) on delete cascade,
  service_title text not null,
  category text,
  description text,

  legacy_price numeric(12, 2),
  furnished_surcharge numeric(12, 2),
  base_unfurnished_price numeric(12, 2),
  legacy_total_price numeric(12, 2),
  recommended_price numeric(12, 2) not null,

  unit_label text,
  source_row_number integer,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pricing_items_catalog_id_idx on public.pricing_items(catalog_id);
create index if not exists pricing_items_category_idx on public.pricing_items(category);
create index if not exists pricing_items_service_title_idx on public.pricing_items(service_title);

-- two pricing catalog: eps recommended, handyman recommended
insert into public.pricing_catalogs (
  code,
  name,
  service_domain,
  source_file_name,
  source_sheet_name,
  pricing_year_label,
  currency_code,
  is_active
)
values
  (
    'eps_recommended_pricing_2025_2026',
    'EPS Recommended Pricing 2025/2026',
    'eps_cleaning',
    'EPS_Recommended_Pricing_2025_2026.xlsx',
    'Recommended Pricing',
    '2025/2026',
    'SGD',
    true
  ),
  (
    'handyman_recommended_pricing_2025_2026',
    'Handyman Recommended Pricing 2025/2026',
    'handyman',
    'Handyman_Recommended_Pricing_2025_2026.xlsx',
    'Handyman Recommended Pricing',
    '2025/2026',
    'SGD',
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  service_domain = excluded.service_domain,
  source_file_name = excluded.source_file_name,
  source_sheet_name = excluded.source_sheet_name,
  pricing_year_label = excluded.pricing_year_label,
  currency_code = excluded.currency_code,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

-- pricing items
insert into public.pricing_items (
  catalog_id,
  service_title,
  category,
  description,
  furnished_surcharge,
  base_unfurnished_price,
  legacy_total_price,
  recommended_price,
  source_row_number,
  sort_order
) 
select 
  c.id,
  v.service_title,
  'handover_cleaning',
  'Imported from EPS Recommended Pricing workbook',
  v.furnished_surcharge,
  v.base_unfurnished_price,
  v.legacy_total_price,
  v.recommended_price,
  v.source_row_number,
  v.sort_order
from public.pricing_catalogs c
cross join (
    values
    ('Handover Cleaning - 1BR < 500sf', 70.00, 350.00, 420.00, 450.00, 3, 1),
    ('Handover Cleaning - 1BR < 700sf', 70.00, 400.00, 470.00, 500.00, 4, 2),
    ('Handover Cleaning - 2BR < 700sf', 50.00, 450.00, 500.00, 530.00, 5, 3),
    ('Handover Cleaning - 2BR < 900sf', 80.00, 500.00, 580.00, 630.00, 6, 4),
    ('Handover Cleaning - 3BR < 1100sf', 100.00, 520.00, 620.00, 680.00, 9, 5),
    ('Handover Cleaning - 4BR < 1500sf', 120.00, 650.00, 770.00, 830.00, 17, 6),
    ('Handover Cleaning - 4BR < 2500sf', 400.00, 980.00, 1380.00, 1430.00, 22, 7),
    ('Handover Cleaning - 4BR < 3000sf', 500.00, 1500.00, 2000.00, 2080.00, 23, 8)
) as v (
  service_title,
  furnished_surcharge,
  base_unfurnished_price,
  legacy_total_price,
  recommended_price,
  source_row_number,
  sort_order
)
where c.code = 'eps_recommended_pricing_2025_2026'
and not exists (
  select 1
  from public.pricing_items pi
  where pi.catalog_id = c.id
    and pi.service_title = v.service_title
);

insert into public.pricing_items (
  catalog_id,
  service_title,
  category,
  description,
  legacy_price,
  recommended_price,
  source_row_number,
  sort_order
)
select
  c.id,
  v.service_title,
  v.category,
  v.description,
  v.legacy_price,
  v.recommended_price,
  v.source_row_number,
  v.sort_order
from public.pricing_catalogs c
cross join (
  values
    (
      'Electrical Work - Assessment Fee Only',
      'Electric Work',
      'Electrical Work: to identify cause of electrical issue only',
      180.00,
      200.00,
      2,
      1
    ),
    (
      'Electrical Work - Replace Driver (LED)',
      'Electric Work',
      'Electrical Work: to check & replace driver (LED)',
      100.00,
      120.00,
      18,
      2
    ),
    (
      'Replace shower holder',
      'Plumbing Work',
      null,
      150.00,
      180.00,
      27,
      3
    ),
    (
      'Marble Work - Polish Marble Surface < 500sf',
      'Marble Work',
      'Marble Work: to provide labour & materials to polish marble surface (< 500sf)',
      980.00,
      1080.00,
      67,
      4
    ),
    (
      'Solid Top Work: Repair Chipped Surface (1)',
      'Solid Top',
      'Solid Top Work: to provide labour & materials to repair chipped surface (< 20sf)',
      380.00,
      420.00,
      75,
      5
    ),
    (
      'Timber Works - Repair, Sand & Varnish Door Frame (all) (1)',
      'Timber(Non Flooring)',
      'Timber Works: to provide labour & materials to repair, sand & varnish door frame (all)',
      280.00,
      320.00,
      80,
      6
    ),
    (
      'Carpentry Work - Replace Door Knob (1)',
      'Carpentry',
      'Carpentry Work: to supply & provide labour to replace door knob',
      180.00,
      200.00,
      86,
      7
    ),
    (
      'Other Handy Work - Replace Sliding Door Locket (round-twist type) (1)',
      'Others',
      'Other Handy Work: to supply & provide labour to replace sliding door locket (round-twist type)',
      180.00,
      200.00,
      94,
      8
    ),
    (
      'Acid Wash Per bathroom',
      'Cleaning',
      null,
      null,
      80.00,
      108,
      9
    ),
    (
      'Fabric Steam Cleaning - Mattress queen',
      'Steam Cleaning',
      null,
      null,
      80.00,
      109,
      10
    ),
    (
      'Aircon Steam Cleaning - Ducted Unit',
      'Ac Cleaning, Steam Cleaning',
      null,
      null,
      80.00,
      111,
      11
    ),
    (
      'To remove ac vents & reinstate surfaces',
      'Paint Work',
      '$180/vents',
      180.00,
      200.00,
      126,
      12
    ),
    (
      'Curtain Steam Cleaning- Open',
      'Curtain',
      'To steam clean curtain $35/pc.',
      35.00,
      45.00,
      131,
      13
    )
) as v(
  service_title,
  category,
  description,
  legacy_price,
  recommended_price,
  source_row_number,
  sort_order
)
where c.code = 'handyman_recommended_pricing_2025_2026'
and not exists (
  select 1
  from public.pricing_items pi
  where pi.catalog_id = c.id
    and pi.service_title = v.service_title
    and coalesce(pi.category, '') = coalesce(v.category, '')
);