# Pracownia

**Adres:** https://pracownia-2ac.pages.dev

Samodzielna wersja Pracowni (projekty, zadania, notatki blokowe, czas pracy, raporty PDF) na własnej domenie. Fork artefaktu z claude.ai, który zostaje bez zmian.

- **Frontend:** SvelteKit 3 (Svelte 5, TypeScript) w trybie SPA, adapter-static
- **Backend:** Supabase: Postgres, logowanie linkiem e-mail, Row Level Security, Realtime
- **Hosting:** Cloudflare Pages

Kontekst i decyzje: `reference/brief.md`. Pełny kod oryginału, z którego przenosimy widoki: `reference/pracownia-v6.html`.

## Stan prac (etap 1: port 1:1)

| Część                                                                    | Stan                              |
| ------------------------------------------------------------------------ | --------------------------------- |
| Schemat bazy, RLS, przestrzeń tworzona przy rejestracji                  | gotowe, testy w `npm run test:db` |
| Logowanie linkiem (konta na zaproszenie)                                 | gotowe                            |
| Warstwa danych: wczytanie, zapis z opóźnieniem, Realtime                 | gotowe                            |
| Import i eksport kopii JSON (także z Pracowni na claude.ai)              | gotowe                            |
| Powłoka, nawigacja, skórki (presety), ekran Start (podgląd)              | gotowe                            |
| Zadania: lista, kanban z przeciąganiem, okno zadania, Start              | gotowe                            |
| Projekty, Notatki, edytor blokowy (menu „/”, skróty, przeciąganie)       | gotowe                            |
| Schematy Mermaid i mapy myśli w edytorze                                 | gotowe                            |
| Status zadania „Wstrzymane”                                              | gotowe                            |
| Czas pracy: stoper, wpisy, okresy, wykres, raporty PDF                   | gotowe                            |
| Okno Wygląd (własne skórki), wyszukiwarka, szybkie dodawanie, import .md | do przeniesienia                  |
| Czas w oknie zadania i na stronie projektu                               | gotowe                            |

## Schematy i mapy myśli

Moduł z Pracowni v6, bez generowania przez AI. Kod w `src/lib/diagrams/` (logika) i `src/lib/ui/diagrams/` (komponenty).

- **Bloki:** `mermaid` (kod Mermaid) i `mindmap` (konspekt Markdown rysowany przez Markmap). Opcjonalne pola bloku `mermaid`: `layout` (`elk` domyślnie albo `dagre`) i `look` (`classic` albo `handDrawn`).
- **Edytor blokowy** (`src/lib/ui/editor/Editor.svelte`) renderuje bloki `mermaid` i `mindmap` przez `DiagramBlock`. Komponent sam zamienia stare mapy Mermaid `mindmap` na konspekt.
- **Menu „/”:** dodaj „Mapa myśli” (`mindmap`) i „Schemat (Mermaid)” (`mermaid`); skrót ` ```mermaid ` + spacja tworzy blok `mermaid`.
- **Mapa z notatki:** `blocksToOutline(tytuł, bloki)` z `outline.ts` buduje konspekt z nagłówków i list.
- **Eksport Markdown:** `diagramBlockToMarkdown(b)` (mapy jako Mermaid `mindmap`, czytelne w Obsidianie).
- **Biblioteki** (ładowane dopiero przy pierwszym schemacie): `mermaid`, `@mermaid-js/layout-elk`, `markmap-view`, `markmap-common`, `d3`.

## Uruchomienie

### 1. Projekt Supabase

1. Na [supabase.com](https://supabase.com) utwórz projekt w regionie w UE (Pracownia: North EU, Sztokholm).
2. Schemat bazy: **Settings → Integrations → GitHub**, repozytorium `MBarKub/Pracownia`, katalog roboczy `.`, włączone **Deploy to production** z gałęzią `main`. Każdy push na `main` wgrywa nowe migracje z `supabase/migrations`. Bez integracji: wklej plik migracji do **SQL Editor** i uruchom.
3. **Authentication → Sign In / Providers → Email**: włącz logowanie e-mailem. W ustawieniach ogólnych wyłącz **Allow new users to sign up**, bo konta są tylko na zaproszenie.
4. **Authentication → URL Configuration**: w _Site URL_ wpisz adres aplikacji (lokalnie `http://localhost:5173`), a w _Redirect URLs_ dodaj także adres z Cloudflare Pages.
5. **Authentication → Users → Invite user**: zaproś siebie. Przy pierwszym logowaniu powstanie Twoja przestrzeń „Moja pracownia”.
6. **Project Settings → API Keys**: skopiuj klucz _publishable_ (nigdy _secret_).

### 2. Lokalnie

```sh
cp .env.example .env    # wpisz VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Bez pliku `.env` aplikacja pokazuje przycisk **Wypróbuj bez logowania**: tryb próbny, w którym nic się nie zapisuje.

### 3. Przeniesienie danych

W Pracowni na claude.ai: **Ustawienia → Kopia zapasowa (JSON)**. Tutaj: **Ustawienia → Wczytaj kopię (JSON)**. Identyfikatory zostają te same, więc import można powtórzyć bez duplikatów.

### 4. Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, repozytorium `MBarKub/Pracownia`:

- Build command: `npm run build`
- Build output directory: `build`
- Zmienne środowiskowe: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (klucz _publishable_ `sb_publishable_…` albo starszy _anon_), `NODE_VERSION=22`

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
