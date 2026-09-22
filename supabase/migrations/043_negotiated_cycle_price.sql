-- 043_negotiated_cycle_price.sql
--
-- AZ ÜGYFÉLENKÉNT ALKUDOTT CIKLUSDÍJ.
--
-- A rendszer eddig egyetlen árat ismert: a havidíjat, és az éves összeget
-- ebből számolta (`havidíj × 12`). A valóságban viszont az éves előre
-- fizetésnél ügyfelenként MÁS kedvezmény születik — az egyiknél 165 000, a
-- másiknál 149 000 forint lett a 178 800 forintos listaár helyett.
--
-- Miért nem a `monthly_price` átírása a megoldás: a 149 000 / 12 = 12 416,67
-- forint. Ez tört szám, ami így jelenne meg a számlán és az ügyfélkapun,
-- ráadásul elveszne belőle, hogy mennyi kedvezményt kapott — a listaár és a
-- fizetett ár különbsége maga az információ.
--
-- Ezért a kettő szétválik:
--
--   `monthly_price`   — a megállapodott HAVI ár. Ebből dolgozik a listaár,
--                       az MRR-vetítés és a kivásárlási beszámítás.
--   `billing_amount`  — amit egy ciklusban TÉNYLEGESEN utal. Ha üres, a
--                       rendszer a régi módon számol (havidíj × ciklus),
--                       tehát minden meglévő sor változatlanul viselkedik.
--
-- A kedvezmény ebből már származtatható, nem kell külön tárolni:
--   kedvezmény = monthly_price × hónapok − billing_amount

alter table public.client_projects
  add column if not exists billing_amount integer;

comment on column public.client_projects.billing_amount is
  'Amit az ügyfél egy számlázási ciklusban ténylegesen fizet. NULL = a havidíjból számolt összeg. Éves előre fizetésnél itt él az egyénileg alkudott kedvezményes ár.';

alter table public.client_projects drop constraint if exists client_projects_billing_amount_check;
alter table public.client_projects add constraint client_projects_billing_amount_check
  check (billing_amount is null or (billing_amount > 0 and billing_amount <= 10000000));

notify pgrst, 'reload schema';
