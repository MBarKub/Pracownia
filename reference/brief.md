# Pracownia — brief do forka na własną domenę

Ten dokument przenosi kontekst do nowego wątku. Załącz go razem z plikiem `pracownia-zrodlo-v4.html` (pełny kod obecnej wersji).

## Cel

Zrobić **fork** osobistej aplikacji „Pracownia” i rozwinąć go w samodzielną aplikację webową na **odrębnej domenie**.

- Oryginalna Pracownia (artefakt na claude.ai) zostaje bez zmian jako narzędzie do mojej pracy. Nie publikujemy nic pod jej adresem i nie zmieniamy jej bazy.
- Fork ma działać bez claude.ai: własny hosting, własne logowanie, własna baza.

## Co dziś umie Pracownia (wersja 4)

- **Projekty:** karty z postępem, status (pomysł / w toku / wstrzymany / zakończony), termin, kolor i ikona, klient, stawka godzinowa, opis w edytorze blokowym.
- **Zadania:** status (do zrobienia / w toku / zrobione), priorytet 0–3, termin, projekt, podzadania, notatka; widoki lista (grupy: zaległe, dziś, jutro, 7 dni, później, bez terminu) i kanban z przeciąganiem.
- **Notatki:** edytor blokowy (akapit, H1–H3, listy, checklisty, cytat, wyróżnienie, kod, separator, schemat Mermaid), menu „/”, skróty Markdown, przeciąganie bloków, tagi, przypinanie, wyszukiwanie; punkt z checklisty → zadanie jednym kliknięciem.
- **Schematy Mermaid:** blok z trybami podgląd / obok / kod, 7 szablonów, kolory ze skórki, eksport SVG/PNG, generowanie i poprawianie schematu przez Claude z opisu słownego.
- **Czas pracy:** stoper (jeden aktywny, widoczny w panelu bocznym), wpisy ręczne (`1:30`, `1,5h`, `90m`), widok z sumami, wykresem tygodnia i podziałem na projekty, stawki projektu lub domyślna.
- **Raporty PDF:** dla projektu, klienta lub wszystkiego; okresy, zaokrąglanie, kwoty, lista wpisów; jsPDF + autotable z osadzoną czcionką Figtree (podzbiór z polskimi znakami).
- **Ekran Start:** zadania na dziś, najbliższe 7 dni, aktywne projekty, ostatnie notatki.
- **Wygląd:** 7 skórek (tokeny CSS), własne skórki z edytorem kolorów, kroje pisma, zaokrąglenie, gęstość; eksport i import skórek.
- **Import i eksport:** kopia JSON (wszystkie kolekcje + ustawienia), eksport Markdown, import plików .md (wiele naraz, przeciąganie, front matter, tagi, bloki Mermaid).
- **Telefon:** układ responsywny, dolne zakładki, pasek typów bloków nad klawiaturą.
- **Skróty:** `N` nowy element, `Ctrl/Cmd+K` wyszukiwarka, `Esc` zamyka okna.

## Obecna architektura

- Jeden plik HTML, czysty JavaScript (bez frameworka), renderowanie szablonami tekstowymi i delegacją zdarzeń (`data-act`).
- Dane w bazie artefaktu claude.ai (`window.claude.use('db')`), dokumenty JSON w kolekcjach, subskrypcje na żywo, zapis z opóźnieniem i ochroną przed nadpisaniem własnych zmian.
- Inne możliwości platformy: `sample` (zapytania do Claude z poziomu strony), `downloads` (zapis plików).
- Biblioteki ładowane na żądanie: Mermaid 11.4.1 (jsDelivr), jsPDF 2.5.1 i jspdf-autotable 3.8.2 (cdnjs). Fonty: Bricolage Grotesque, Figtree, Literata, IBM Plex Sans, Atkinson Hyperlegible, JetBrains Mono (Google Fonts).

### Model danych (kolekcje)

- `projects`: name, icon, color, status, due, client, rate, blocks[], createdAt
- `tasks`: title, status, priority, due, projectId, subtasks[{id,text,done}], notes, createdAt, doneAt
- `notes`: title, projectId, tags[], pinned, blocks[], createdAt, updatedAt
- `time`: projectId, taskId, note, date, minutes, start, end, running, billable, createdAt
- `settings/app`: skinId, customSkins[], radius, density, labels{task, project, priority}, time{currency, defaultRate, rounding, me}
- Blok: `{id, type, text}` (+ `checked`, `taskId` dla `todo`); typy: p, h1, h2, h3, ul, ol, todo, quote, callout, code, mermaid, hr.

## Co trzeba zastąpić przy wyjściu z claude.ai

| Dziś (artefakt) | W forku |
|---|---|
| `claude.use('db')` | własny backend z bazą i synchronizacją na żywo |
| prywatność artefaktu | logowanie i uprawnienia (konta, przestrzenie robocze) |
| `claude.use('sample')` | własny endpoint serwerowy do Claude API (klucz tylko po stronie serwera, limity) |
| `claude.use('downloads')` | zwykłe pobieranie plików w przeglądarce |
| hosting claude.ai | hosting + domena + HTTPS |

## Proponowany kierunek (do potwierdzenia w nowym wątku)

- **Frontend:** Vite + TypeScript, podział kodu na moduły; framework do decyzji (np. Svelte lub React) albo zostanie przy czystym JS.
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Realtime, Storage) albo alternatywa.
- **AI:** funkcja serwerowa (edge function) wołająca Claude API dla generowania schematów.
- **Hosting:** Vercel, Netlify lub Cloudflare Pages + własna domena.
- **Kod:** repozytorium na GitHubie.
- **Migracja danych:** import kopii JSON z obecnej Pracowni.

### Szkic etapów

1. Repozytorium i port 1:1 dla jednego użytkownika na nowym backendzie (te same funkcje, ten sam wygląd).
2. Konta, przestrzenie robocze i uprawnienia.
3. Współpraca: udostępnianie projektów, wiele osób w przestrzeni.
4. Domena, wdrożenie produkcyjne, kopie zapasowe, monitoring.
5. Opcjonalnie: PWA i tryb offline, płatności, wersja angielska.

## Pytania otwarte

- Dla kogo ma być wersja na domenie: tylko dla mnie, dla zespołu, czy jako publiczny produkt (SaaS)?
- Nazwa i domena.
- Czy płatne konta lub subskrypcje?
- Kto płaci za użycie AI (mój klucz z limitami czy klucz użytkownika)?
- Język interfejsu: tylko polski czy też angielski?
- Czy potrzebny tryb offline?

## Prompt startowy do nowego wątku

> Robimy fork mojej aplikacji „Pracownia” (załączony kod i brief) i rozwijamy go w samodzielną aplikację webową na własnej domenie. Oryginału nie zmieniamy. Przeczytaj brief, zadaj mi najważniejsze pytania z sekcji „Pytania otwarte”, a potem zaproponuj architekturę i plan pierwszego etapu.
