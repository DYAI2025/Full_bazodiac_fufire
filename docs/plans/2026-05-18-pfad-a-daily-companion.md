# Pfad A — Daily Companion (MVP Dev-Brief)

Datum: 2026-05-18
Status: Plan-Anker für `/goal` "Pfad A — Daily Companion MVP".

## 1. Projekt-Snapshot

**Outcome:** Pfad A wird als Daily Companion implementiert: FuFirE führt Nutzer täglich durch Signatur, Tagespuls, 24h-Experiment, Check-in, Musterverlauf und nächsten Tagesausblick.

**Ziel:** Nicht mehr nur "Analyse anzeigen", sondern einen wiederkehrenden Nutzungszyklus erzeugen: Signatur verstehen → heute anwenden → abends reflektieren → morgen Entwicklung sehen.

**Produktthese:** Retention entsteht durch tägliche persönliche Relevanz + praktische Handlung + Verlaufserkennung — nicht durch mehr Astro-Content. Markt-/Prozentwerte aus dem Quell-Artikel sind nicht extern verifiziert und werden als interne Strategie-Hypothesen behandelt.

### In-Scope

- Daily Companion Flow
- Tagespuls als Hauptseite für Wiederkehr
- "Heute neu" gegenüber gestern
- 24h Experiment mit Regelmatrix
- Check-in mit echter Auswertung
- Morgen-Teaser
- Score-Band für Kohärenz
- lokale Verlaufsspeicherung für MVP
- ethische Retention ohne manipulative Push-/Streak-Mechanik

### Out-of-Scope für diese Iteration

- Full Community, echtes Account-System, bezahlte Subscriptions
- KI-Chat/Eve, echte Push Notifications
- komplexe Luck-Pillar-/Dekadenlogik
- Soulmate Sketch oder deterministische Partnerprognosen
- NavBar-Extract (offen aus PR #15)
- Backend-Änderungen an `server.js`

### KPIs / Erfolgskriterien

| KPI | Ziel MVP |
|---|---|
| Time-to-Daily-Insight | < 30 Sekunden nach Seitenaufruf |
| Nutzer versteht Tagesfokus | in 1 Hero-Card |
| Check-in erzeugt Antwort | 100% nach Auswahl |
| Wiederkehrgrund sichtbar | Morgen-Teaser auf Daily-Seite |
| Keine leeren Content-Karten | 0 "nicht verfügbar" im Nutzerflow |
| Score erklärt | Kohärenz immer mit Band + Bedeutung |
| Nutzwert pro Daily | 1 konkrete Handlung pro Tag |

### Globale Definition of Done

- Daily Companion Flow funktioniert ohne Account.
- Check-in-Auswahl wird lokal gespeichert.
- Daily-Seite zeigt personalisierten Tagespuls, Handlung und Morgen-Teaser.
- Keine internen Labels wie `API` auf Nutzerseiten.
- Keine fatalistische Sprache.
- Alle neuen Komponenten haben Fallbacks.
- Tests bleiben grün.

## 2. Zielbild

**Kernversprechen:** Deine Signatur. Dein Tagesmuster. Dein nächster klarer Schritt.

**Loop:** Morgens Tagespuls → Tagsüber 24h-Experiment → Abends Check-in → Nächster Tag zeigt, was anders ist.

**Ethische Retention-Regel — erlaubt:** Antizipation, täglicher Rhythmus, Verlaufserkennung, personalisierte Experimente, milde Streak-Logik. **Nicht erlaubt:** Schuldmechanik, Schicksalsdrohung, rote Badges, "Du verpasst deine kosmische Chance", deterministische Beziehungs-/Finanz-/Gesundheitsaussagen.

## 3. Seiten- und Flow-Architektur

```
/overview     → Grundsignatur + Einstieg in Heute
/daily        → Daily Companion Hauptseite
/transits     → Wochenvorschau + Morgen-/Peak-Kontext
/love         → später: Tagespuls in Beziehung übersetzen
/career-finance → später: Tagespuls in Arbeit/Ressourcen übersetzen
```

### 3.2 Daily Companion auf `/daily` — sichtbare Reihenfolge

1. Persistent Signature Bar
2. Tageskopf mit Datum
3. TodayNewCard
4. DailyPulseHero
5. WesternImpulseCard
6. BaziImpulseCard
7. FusionSynthesisCard
8. ExperimentCard
9. CheckInCard
10. CheckInResultCard
11. TomorrowTeaserCard
12. Deep-Link Cards: Beziehung, Arbeit, Transite

## 4. Komponenten-Briefing (Kurz)

### 4.1 TodayNewCard
Zeigt, was heute gegenüber gestern anders ist (variable Belohnung mit Substanz). Datenquellen: heute/gestern aktive Häuser, Tageszweige/-stammrelation, dominante Tageskategorie, localStorage `fufire.dailyCheckins`. Fallback: Ersttag-Text. Max 3 Bullets. Kein leerer Zustand.

### 4.2 DailyPulseHero
Ein Satz, der den Tag sofort verständlich macht. Max 2 Sätze, kein "gleich verfügbar"-Platzhalter, aus echten Tagesdaten.

### 4.3 WesternImpulseCard
Befund → Chance → Achtung → Mikro-Impuls. Mind. ein aktiviertes Haus / Transitfaktor referenziert.

### 4.4 BaziImpulseCard
Day Master + Tagesrelation + Ressourcen-Hinweis + Risiko. Fachbegriff + Nutzerlabel kombiniert.

### 4.5 FusionSynthesisCard
Westlicher + BaZi-Bezug + Spannung + konkrete Balancehandlung.

### 4.6 ExperimentCard
24h-Handlung, beobachtbar, klein, nicht moralisch. Regelmatrix nach Haus/Element/Kohärenz, Reflexionsfrage Pflicht, `sourceReason` pro Pfad. Priorisierung: aktiviertes Haus > schwaches Element > Kohärenzband > Default.

### 4.7 CheckInCard
3 Chip-Fragen (Klarheit, Energie, Kontakt). Speichern in `fufire.dailyCheckins[YYYY-MM-DD]`. Auswahl persistiert nach Reload.

### 4.8 CheckInResultCard
Erscheint erst nach 3 Antworten. Bezug zu Tagesfaktor, nächster Schritt, Morgen-Use.

### 4.9 TomorrowTeaserCard
Antizipation aus Transit/Date+1. Kein Angst-Framing. Link zu `/transits`.

### 4.10 ScoreBandCard
Bands 0–39 / 40–69 / 70–89 / 90–100. "Hoch ≠ besser." Global auf Overview + Daily.

## 5. Backlog

| ID | Titel | DoD |
|---|---|---|
| A1 | Daily ViewModel | `buildDailyCompanionViewModel(profile, transits, date, history)` |
| A2 | TodayNewCard | Differenz oder Ersttag-Fallback, max 3 Punkte |
| A3 | DailyPulseHero ersetzen | Echte Tagesaussage, max 2 Sätze |
| A4 | West/BaZi/Fusion Cards standardisieren | Befund → Chance → Achtung → Handlung |
| A5 | Experiment Engine | Regelmatrix, mind. 8 Regelpfade |
| A6 | Check-in UI interaktiv | Chip-Selection + `fufire.dailyCheckins` |
| A7 | CheckInResultCard | Result nach 3 Antworten, Tagesbezug |
| A8 | TomorrowTeaserCard | Transit/Date+1 + Fallback + Link |
| A9 | ScoreBandCard global | Overview + Daily nutzen Band |
| A10 | Nutzerlabels statt API-Labels | Grep auf Nutzerseiten = 0 |
| A11 | Trust-Spine Microcopy | Eingabe + Daily + Overview |
| A12 | Tests aktualisieren | bestehende grün + neue für VM/Storage/Regeln |

## 6. Roadmap (6 Iterationen)

1. **iter-1-vm:** Daily ViewModel + Hero (A1, A3)
2. **iter-2-experiment:** Experiment Engine (A5)
3. **iter-3-checkin:** Check-in Loop + Storage (A6, A7)
4. **iter-4-rhythm:** TodayNew + TomorrowTeaser (A2, A8)
5. **iter-5-trust:** Score-Band + Trust Microcopy + Label-Sweep (A9, A10, A11, A4)
6. **iter-6-qa:** Tests, Copy-Review, Mobile, Regression (A12)

## 7. Datenmodell

### 7.1 Daily ViewModel

```ts
type DailyCompanionViewModel = {
  date: string;
  dateLabel: string;
  signature: {
    dayMasterLabel: string;
    sunSignLabel: string;
    coherenceScore: number | null;
    coherenceBand: "low" | "medium" | "high" | "very-high" | "unknown";
  };
  todayNew: { title: string; points: string[]; isFirstDay: boolean };
  western: {
    theme: string;
    activeHouses: Array<{ house: number; label: string; intensity?: number }>;
    chance: string; caution: string; microImpulse: string;
  };
  bazi: {
    dayMaster: string; coreEnergyLabel: string;
    dailyRelation: string; resourceHint: string; riskHint: string;
  };
  fusion: { synthesis: string; tension: string; balancingAction: string };
  experiment: {
    title: string; instruction: string; reflectionQuestion: string;
    tags: string[]; sourceReason: string;
  };
  checkIn?: {
    clarity?: "low" | "medium" | "high";
    energy?: "calm" | "active" | "exhausted";
    contact?: "open" | "withdrawn" | "mixed";
  };
  checkInResult?: {
    stateLabel: string; interpretation: string;
    nextStep: string; tomorrowUse: string;
  };
  tomorrow: { teaser: string; linkLabel: string; href: string };
};
```

### 7.2 localStorage

```ts
type DailyCheckinStore = Record<string, {
  clarity: "low" | "medium" | "high";
  energy: "calm" | "active" | "exhausted";
  contact: "open" | "withdrawn" | "mixed";
  experimentSeen: boolean;
  createdAt: string;
}>;
```

Key: `fufire.dailyCheckins`

## 8. Content-Regeln

**Verwenden:** kann sichtbar werden · deutet hin auf · nutze als Beobachtungsrahmen · heute könnte es hilfreich sein · dein Hebel liegt in

**Vermeiden:** du wirst · du musst · dein Schicksal · garantiert · perfekt kompatibel · finanzieller Erfolg · medizinische Wirkung

**Trust-Copy:**
- Daily: "Der Tagespuls ist kein Urteil. Er ist ein Beobachtungsrahmen für 24 Stunden."
- Check-in: "Dein Check-in verändert nicht deinen Geburtskern."
- Overview: "Kohärenz ist ein Index, keine Persönlichkeitsnote."

## 9. Testfälle (Auswahl)

- Erstbesuch Daily ohne localStorage → TodayNewCard zeigt Ersttag-Fallback
- Wiederbesuch mit Check-in gestern → TodayNewCard referenziert gestrigen Zustand
- Check-in unvollständig (2 Antworten) → keine ResultCard
- Check-in komplett (3 Antworten) → ResultCard mit Interpretation
- Kohärenz 62 → Band medium; Kohärenz 87 → Band high
- Fehlender Day Master / kein Transit → Fallback ohne leere Karte
- Mobile 375px → Karten stacken sauber
- Frontend-Grep nach `API`/`Aggregiert` auf Nutzerseiten → 0 Treffer

## 10. Risiken (Top 3)

| Risiko | Mitigation |
|---|---|
| Daily bleibt generisch | Experiment-Regeln + TodayNew aus echten Daten |
| Retention wird manipulativ | Ethische Copy-Regeln, kein Push/Streak |
| Score wird als Urteil gelesen | ScoreBand + "Index, keine Note" |

## 11. Entscheidungen (2026-05-18)

- Pfad A wird als MVP-Kern umgesetzt — `/daily` wird Hauptbindungsseite.
- Check-in lokal (sessionStorage/localStorage) statt Account-basiert.
- Keine echten Pushes in dieser Iteration.
- Keine harte Streak-Mechanik.
- BaZi wird alltagssprachlich übersetzt.

## 12. Verbindung zu Goal

Dieser Plan ist Reference-Doc für das `/goal` "Pfad A — Daily Companion MVP". Goal-Body ist die kompakte Direktive; dieser Plan die Vertiefung pro Iteration.

---

## MVP Review

Self-assessment vs. Goal-Akzeptanzkriterien (Branch `feat/daily-companion-pfad-a`, sechs Iteration-Tags `pfad-a-iter-1-vm` … `pfad-a-iter-6-qa`).

### Akzeptanzkriterien

- [x] `/daily` rendert aus einem einzigen ViewModel — `buildDailyCompanionViewModel(profile, transits, date, history)` in `public/src/domain/dailyCompanion.js`, gemountet in `DailyPage.js`.
- [x] Im ersten Screen sichtbar: Hero + TodayNewCard + Tagesfokus — Reihenfolge: PersistentSignatureBar → InsightHero → Trust-Microcopy → ScoreBandCard → TodayNewCard → vm-cards-stack.
- [x] DailyPulseHero ohne Platzhalter — Statement aus `vm.fusion.synthesis || vm.western.chance || vm.experiment.instruction`; Mount erfolgt erst nach `transitsPromise.then()`.
- [x] TodayNewCard mit gestrigen Daten ≥1 Differenz, max 3 Bullets, sonst Ersttag-Fallback — `buildTodayNew` in `dailyCompanion.js` (Tests: `today-new-card.test.js`, `daily-companion-viewmodel.test.js`).
- [x] Experiment-Engine ≥8 Regelpfade — 12 spezifische Regeln + 1 Default in `public/src/domain/experimentEngine.js`, jeder mit `sourceReason`; Default nur als Fallback (`experiment-engine.test.js`, 13 Tests).
- [x] CheckInCard speichert pro Datum in `fufire.dailyCheckins`, Auswahl persistiert nach Reload — shared-object schema, storage-injectable (`daily-checkin.test.js`, 7 Tests).
- [x] CheckInResultCard erscheint erst bei vollständiger 3er-Auswahl, referenziert ≥1 Tagesfaktor, enthält `nextStep` — `checkInResultModel` returns null unless `clarity && energy && contact` (`checkin-result-card.test.js`, 3 Tests).
- [x] TomorrowTeaserCard zeigt echten Hinweis oder Fallback; verlinkt `/transits` — `tomorrowTeaserModel` mit non-urgent Default (`tomorrow-teaser-card.test.js`, 3 Tests).
- [x] ScoreBandCard global auf Overview + Daily — Bands 0–39 low / 40–69 medium / 70–89 high / 90–100 very-high mit "Hoch ≠ besser"-Caveat (`score-band-card.test.js`, 4 Tests).
- [x] Keine `API`/`Aggregiert`-Labels auf Nutzerseiten — `SourceBadge.js` re-exportiert `SourcePill`, deren Labels sind `Berechnet/Fusioniert/Abgeleitet/Gedeutet/Fallback/Erklärt/Fehlt`.
- [x] Trust-Microcopy auf Input + Daily + Overview — jeweils ≥1 Satz: Input `app-trust`, Daily `trust-microcopy`, Overview `trust-microcopy`.
- [x] Tests am Sprintende ≥190 pass / 0 fail — aktuell 232 pass / 0 fail / 9 skipped.
- [x] Keine fatalistische Sprache im gerenderten DOM — `grep -rniE "du wirst|du musst|dein Schicksal|garantiert|perfekt kompatibel|finanzieller Erfolg"` gegen `public/src/**` liefert 0 Treffer.

### Test-Wachstum

| Sprint-Phase | Pass | Fail | Skipped |
|---|---|---|---|
| Baseline (post-Sprint-8) | 190 | 0 | 9 |
| iter-1-vm | 199 | 0 | 9 |
| iter-2-experiment | 212 | 0 | 9 |
| iter-3-checkin | 218 | 0 | 9 |
| iter-4-rhythm | 224 | 0 | 9 |
| iter-5-trust | 232 | 0 | 9 |
| iter-6-qa (final) | 232 | 0 | 9 |

### Bekannte Gaps (out of MVP)

- API-Pfad (`getDailyExperience`) und VM-Pfad rendern parallel. Wenn beide Daten liefern, sieht man API-Sektionen UND VM-Cards — kein Konflikt, aber doppelte Information möglich.
- Persisted `activeHouses` für TodayNew-Differenz funktioniert erst ab dem **zweiten** Tagesbesuch (heute schreiben, morgen lesen).
- Mobile manuell nicht verifiziert; CSS hat aber `@media (max-width: 640px)` für Sig-Bar + Three-Doors aus Sprint 1.
- `getCoherenceBand` ist als Re-Export in `experimentEngine.js` referenziert — circular-import-freier Pfad: `experimentEngine → dailyCompanion`. OK, kein Lazy-Init nötig.
