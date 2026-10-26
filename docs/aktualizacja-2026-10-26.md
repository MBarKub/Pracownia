# Aktualizacja z Pracowni v6 (26.10.2026)

Zmiany przeniesione z osobistej Pracowni (artefakt na claude.ai) do forka. Pełny kod oryginału: `reference/pracownia-v6.html`.

## 1. Status zadania „Wstrzymane” (`paused`) — gotowe

- Migracja `supabase/migrations/20261026000000_task_paused.sql` rozszerza ograniczenie `tasks_status_check` o `paused`. Wgrywa się sama po pushu na `main` (integracja Supabase z GitHubem).
- Model, etykiety (domyślnie „Wstrzymane”, edytowalne), kopia JSON, wiersz zadania (przerywane kółko z pauzą, wyszarzony tytuł, etykieta), panel zadania (4 statusy), lista (osobna grupa pod otwartymi), kanban (4. kolumna).
- `activeTasks()` w `ops.ts`: otwarte bez wstrzymanych. Używane przez Start, liczniki filtrów i licznik w panelu bocznym, więc wstrzymane zadania nie trafiają do planu dnia ani zaległych.
- Test bazy (`npm run test:db`) wczytuje teraz wszystkie migracje po kolei i sprawdza nowy status.
- W sejfie Obsidiana „Studio” odpowiada mu status `czeka`.

## 2. Schematy Mermaid i mapy myśli — komponenty gotowe do wpięcia

Edytor blokowy notatek nie jest jeszcze przeniesiony, więc moduł jest gotowy, ale nie jest jeszcze nigdzie wyświetlany. Przy porcie edytora wystarczy go podpiąć (instrukcja w README, sekcja „Schematy i mapy myśli”).

**Mermaid (`MermaidBlock.svelte`)**

- Tryby Podgląd / Obok / Kod, 7 szablonów (w tym „Mapa myśli”, który zmienia blok na `mindmap`).
- Kolory i krój pisma ze skórki, odświeżane przy zmianie skórki lub motywu systemu.
- Dopracowany wygląd: zaokrąglone węzły, cienie, grubsze linie, większe odstępy.
- Menu „Styl”: układ ELK (domyślny dla schematów blokowych, stanów, ER) albo standardowy; wygląd klasyczny albo „szkic”.
- Przybliżanie (przyciski, Ctrl/⌘ + kółko, szczypanie), przesuwanie po przybliżeniu, pełny ekran (Esc zamyka).
- Komunikat błędu z ostatnim poprawnym podglądem, eksport SVG i PNG.

**Mapa myśli (`MindmapBlock.svelte`, Markmap)**

- Treść to konspekt: `# temat`, `## gałęzie`, `- punkty`, wcięcie o 2 spacje = poziom niżej.
- Kolorowe gałęzie w barwach skórki, zwijanie węzłów kliknięciem, przyciski Zwiń / 2 poziomy / Całość.
- Pełny ekran z przybliżaniem i przesuwaniem, eksport SVG/PNG przycięty do treści.

**Pominięte celowo:** generowanie i poprawianie schematów przez Claude („Opisz słowami”, „Popraw z Claude”), bo fork na razie nie ma funkcji AI.

## Sprawdzone

- `npm run check`: 0 błędów, 0 ostrzeżeń; `npm run lint` czysto; `npm run build` przechodzi.
- `npm run test:db`: wszystkie testy RLS + 2 nowe dla statusu.
- W Chromium (tryb próbny, jasny 1280 px i ciemny 420 px): wszystkie szablony Mermaid rysują się bez błędów, styl „szkic” i ELK działają, przybliżanie, pełny ekran z Esc, konwersja starej mapy Mermaid na konspekt, eksport SVG i PNG; zadania: 4 statusy w panelu, grupa „Wstrzymane” na liście, kolumna na kanbanie, bez błędów w konsoli.
