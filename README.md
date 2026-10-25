# Pracownia

Samodzielna wersja Pracowni (projekty, zadania, notatki blokowe, czas pracy, raporty PDF) na własnej domenie. Fork artefaktu z claude.ai, który zostaje bez zmian.

- **Frontend:** SvelteKit 3 (Svelte 5, TypeScript) w trybie SPA, adapter-static
- **Backend:** Supabase: Postgres, logowanie linkiem e-mail, Row Level Security, Realtime
- **Hosting:** Cloudflare Pages

Kontekst i decyzje: `reference/brief.md`. Pełny kod oryginału, z którego przenosimy widoki: `reference/pracownia-v4.html`.

## Stan prac (etap 1: port 1:1)

| Część                                                                    | Stan                              |
| ------------------------------------------------------------------------ | --------------------------------- |
| Schemat bazy, RLS, przestrzeń tworzona przy rejestracji                  | gotowe, testy w `npm run test:db` |
| Logowanie linkiem (konta na zaproszenie)                                 | gotowe                            |
| Warstwa danych: wczytanie, zapis z opóźnieniem, Realtime                 | gotowe                            |
| Import i eksport kopii JSON (także z Pracowni na claude.ai)              | gotowe                            |
| Powłoka, nawigacja, skórki (presety), ekran Start (podgląd)              | gotowe                            |
| Zadania (lista, kanban), Projekty, Notatki z edytorem blokowym           | do przeniesienia                  |
| Schematy Mermaid (bez generowania przez AI)                              | do przeniesienia                  |
| Czas pracy, raporty PDF                                                  | do przeniesienia                  |
| Okno Wygląd (własne skórki), wyszukiwarka, szybkie dodawanie, import .md | do przeniesienia                  |

## Uruchomienie

### 1. Projekt Supabase

1. Na [supabase.com](https://supabase.com) utwórz projekt w regionie **Central EU (Frankfurt)**.
2. **SQL Editor** → wklej i uruchom całość `supabase/migrations/20261025000000_init.sql`.
3. **Authentication → Sign In / Providers → Email**: włącz logowanie e-mailem. W ustawieniach ogólnych wyłącz **Allow new users to sign up**, bo konta są tylko na zaproszenie.
4. **Authentication → URL Configuration**: w _Site URL_ wpisz adres aplikacji (lokalnie `http://localhost:5173`), a w _Redirect URLs_ dodaj także adres z Cloudflare Pages.
5. **Authentication → Users → Invite user**: zaproś siebie. Przy pierwszym logowaniu powstanie Twoja przestrzeń „Moja pracownia”.
6. **Project Settings → API**: skopiuj _Project URL_ i klucz _anon public_.

### 2. Lokalnie

```sh
cp .env.example .env    # wpisz VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Przeniesienie danych

W Pracowni na claude.ai: **Ustawienia → Kopia zapasowa (JSON)**. Tutaj: **Ustawienia → Wczytaj kopię (JSON)**. Identyfikatory zostają te same, więc import można powtórzyć bez duplikatów.

### 4. Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, repozytorium `MBarKub/Pracownia`:

- Build command: `npm run build`
- Build output directory: `build`
- Zmienne środowiskowe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Każda gałąź dostaje własny adres podglądu. Własna domena w etapie 4.

## Polecenia

|                   |                                                 |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | serwer deweloperski                             |
| `npm run check`   | sprawdzenie typów                               |
| `npm run lint`    | Prettier + ESLint                               |
| `npm run test:db` | schemat i polityki RLS na wbudowanym Postgresie |
| `npm run build`   | wersja produkcyjna do `build/`                  |

## Architektura w skrócie

- **`src/lib/model.ts`**: typy danych w tym samym kształcie co v4, żeby widoki dało się przenosić 1:1.
- **`src/lib/mappers.ts`**: zamiana model ↔ wiersz bazy.
- **`src/lib/store.svelte.ts`**: stan aplikacji, kolejka zapisu (`save(kolekcja, id, opóźnienie)`), Realtime. Echo własnych zmian jest ignorowane dla dokumentów z niezapisanymi lokalnymi zmianami. Konflikty rozstrzyga reguła „ostatni zapis wygrywa” na poziomie całego dokumentu.
- **`src/lib/skins.ts`**: skórki i podział ustawień na osobiste (`user_settings`) i wspólne dla przestrzeni (`workspaces.settings`).
- **`src/lib/backup.ts`**: kopia JSON i import kopii z v4.
- **`supabase/migrations/`**: schemat; każda tabela danych ma `workspace_id`, a RLS wpuszcza tylko członków przestrzeni. Wpisy czasu widzą wszyscy członkowie, ale zmienia je tylko autor. Jeden działający stoper na osobę pilnuje unikalny indeks.
