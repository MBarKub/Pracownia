-- Status zadania „Wstrzymane” (paused): zadanie otwarte, ale odłożone.
-- Nie trafia do planu dnia ani liczników, ma własną kolumnę na kanbanie.
-- Odpowiada statusowi `czeka` w sejfie Obsidiana Studio.

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check check (status in ('todo', 'doing', 'paused', 'done'));
