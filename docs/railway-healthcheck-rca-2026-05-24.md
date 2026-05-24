# Railway Deploy RCA – Healthcheck `/health` fails (2026-05-24)

## Kontext
Build-Logs zeigen erfolgreiches Image-Building und Push, aber Runtime-Healthcheck schlägt 8x fehl (`service unavailable`) bis Timeout.

## Reproduzierbare Befunde im Repo
1. Railway nutzt `npm start` und prüft `/health`. (`railway.json`)
2. `npm start` startet `next start`. (`package.json`)
3. Der App Router hat `src/app/health/route.ts` und sollte auf `GET /health` JSON 200 liefern.
4. In `src/app/layout.tsx` werden drei `next/font/google` Fonts genutzt (`Geist`, `Geist_Mono`, `Figtree`).

## Primäre Root-Cause-Hypothese
**Wahrscheinlichste Ursache ist ein Runtime-Startproblem von `next start` im Ziel-Environment, nicht ein fehlender Health-Endpoint.**

Warum:
- Der Health-Endpoint ist im Code vorhanden und minimal.
- Healthcheck-Fehler ist `service unavailable` (typisch bei Prozess nicht erreichbar / CrashLoop / Port nicht gebunden), nicht 404.
- Das Projekt hängt an `next/font/google`; bei restriktiver Egress/Netzwerk-Policy oder Build/Runtime-Inkonsistenz können Next 16 + Turbopack Font-Artefakte instabil sein.

## Gegenannahmen (kritische Evaluation)
### Gegenannahme A: `/health` Route fehlt oder falscher Pfad
- **Widerlegt** durch `src/app/health/route.ts`.
- Wenn Route fehlen würde, wäre eher 404 von laufendem Service sichtbar als wiederholtes `service unavailable`.

### Gegenannahme B: Startcommand ist falsch
- `npm start` -> `next start` ist grundsätzlich korrekt für Next-Deploys.
- **Aber**: Wenn Build-Artefakte nicht im finalen Layer landen, kann `next start` direkt beenden. Das passt zu `service unavailable`.

### Gegenannahme C: Upstream-API/FUFIRE down
- `/health` in Next-Route ist unabhängig von FUFIRE-Upstream.
- Daher kann FUFIRE-Ausfall den Healthcheck auf `/health` nicht direkt verursachen.

### Gegenannahme D: Port-Mismatch
- Railway setzt i.d.R. `PORT`; `next start` bindet darauf.
- Niedrigere Wahrscheinlichkeit, aber verifizierbar via Runtime-Logs (`Listening on ...`).

## Wahrscheinlichkeitsranking
1. **Finales Container-Layer enthält inkonsistente oder fehlende Next-Artefakte** (z. B. durch späte `copy / /app`-Schritte). 45%
2. **`next start` crasht beim Boot in Railway-Umgebung** (Node/Next 16 Edge-Case). 30%
3. **Font-/Asset-bezogene Build/Runtime-Inkonsistenz (Google Fonts/Turbopack)**. 20%
4. **Port/infra-konfigurationsbedingte Ursache**. 5%

## Konkrete Verifikation (als Nächstes in Railway)
1. Deploy-Logs ab Prozessstart prüfen: `next start` Banner, Crash-Stacktrace, Exit code.
2. Temporär Startcommand auf explizit setzen:
   - `PORT=$PORT node_modules/.bin/next start -p $PORT`
3. Smoke im Container:
   - `curl -i localhost:$PORT/health`
4. Falls Crash vor Listen:
   - Fonts testweise auf lokale/self-hosted Fonts umstellen oder Font-Imports deaktivieren.
5. Falls Artefaktproblem vermutet:
   - sicherstellen, dass nach `npm run build` kein Schritt `.next` überschreibt/entfernt.

## Remediation-Vorschlag (niedriges Risiko)
- Kurzfristig: Healthcheck auf minimal unabhängigen Pfad belassen (`/health`, bereits ok), Runtime-Logs erzwingen.
- Mittelfristig: Google Fonts lokal hosten (`next/font/local`) oder feste Font-Dateien versionieren.
- Mittelfristig: Deploy-Image vereinfachen (keine späten Full-Copy-Schritte, die Build-Outputs beeinträchtigen können).

