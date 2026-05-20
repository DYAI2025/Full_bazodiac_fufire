import { router } from './router.js';
import { InputPage }          from './pages/InputPage.js';
import { OverviewPage }       from './pages/OverviewPage.js';
import { DashboardPage }      from './pages/DashboardPage.js';
import { LovePage }            from './pages/LovePage.js';
import { CareerFinancePage }  from './pages/CareerFinancePage.js';
import { PersonalityPage }    from './pages/PersonalityPage.js';
import { SynastryPage }       from './pages/SynastryPage.js';
import { TransitCalendarPage } from './pages/TransitCalendarPage.js';
import { DailyPage }           from './pages/DailyPage.js';
import { FusionPage }          from './pages/FusionPage.js';
import { BaziPage }            from './pages/BaziPage.js';
import { WesternPage }         from './pages/WesternPage.js';
import { WuxingPage }          from './pages/WuxingPage.js';
import { ProfileMissingBanner } from './components/ProfileMissingBanner.js';
import { PersistentSignatureBar } from './components/PersistentSignatureBar.js';
import { mountGlobalNav } from './components/SecondaryNav.js';
import { buildExperienceProfile, buildCoreIdentity } from './domain/experienceCopy.js';

// ── Session-Persistenz ────────────────────────────────────────────────────────
// Berechnetes Profil bleibt in sessionStorage erhalten (Back-Navigation, Reload).
// Person-A-Eingabemeta + Person-B liegen in localStorage (über Sessions hinweg).
const SESSION_KEY = 'azodiac_profile';

function saveProfile(profile) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch { /* quota or private mode */ }
}

function restoreProfile() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

let currentProfile = restoreProfile();

function mountWithProfile(pageFn, app, pageLabel) {
  if (!currentProfile) {
    app.appendChild(ProfileMissingBanner({
      pageLabel,
      onOpenInput: () => router.navigate('/'),
    }));
    return;
  }
  pageFn(app, {
    profile: currentProfile,
    onNavigate: (path) => router.navigate(path),
  });
  // Layout-Slot: Pages opt-in by emitting `<div class="sig-bar-mount"></div>`
  // in their innerHTML template. If absent (e.g. debug or input-only pages),
  // no bar is mounted — pages that already mount the bar themselves leave
  // the slot in place and stay unaffected when this loop finds nothing extra.
  const slot = app.querySelector?.('.sig-bar-mount');
  if (slot && typeof slot.replaceWith === 'function') {
    try {
      const expProfile = buildExperienceProfile(currentProfile);
      const identity   = buildCoreIdentity(expProfile);
      slot.replaceWith(PersistentSignatureBar({
        dayMaster: identity.dayMaster,
        sun:       identity.sun,
        coherence: expProfile?.fusion?.coherence,
      }));
    } catch {
      // Bar is decorative — never block page render on a derivation failure.
    }
  }
}

router
  .register('/', (app) => {
    InputPage(app, {
      onResult: (profile) => {
        currentProfile = profile;
        saveProfile(profile);
        router.navigate('/overview');
      },
    });
  })
  .register('/overview', (app) => mountWithProfile(OverviewPage, app, 'deine Signatur'))
  .register('/love', (app) => mountWithProfile(LovePage, app, 'die Beziehungs-Ansicht'))
  .register('/career-finance', (app) => mountWithProfile(CareerFinancePage, app, 'Arbeit & Ressourcen'))
  .register('/personality', (app) => mountWithProfile(PersonalityPage, app, 'die Persönlichkeits-Schichten'))
  .register('/dashboard', (app) => mountWithProfile(DashboardPage, app, 'das Dashboard'))
  .register('/fusion', (app) => mountWithProfile(FusionPage, app, 'die Fusion-Synthese'))
  .register('/bazi',    (app) => mountWithProfile(BaziPage,    app, 'deine vier Säulen'))
  .register('/western', (app) => mountWithProfile(WesternPage, app, 'die westliche Karte'))
  .register('/wuxing',  (app) => mountWithProfile(WuxingPage,  app, 'deine Element-Ökonomie'))
  .register('/daily', (app) => {
    // Daily zeigt eigenes Onboarding bei fehlendem Profil — kein zusätzlicher Banner.
    DailyPage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/synastry', (app) => {
    // Synastry hat eigene Person-A-/Person-B-Eingabe (Override-Pfad).
    SynastryPage(app);
  })
  .register('/transit-calendar', (app) => {
    TransitCalendarPage(app, { profile: currentProfile });
  })
  .start();

// Global top-nav: mount once after the router starts. Lives in #global-nav-host
// (above the #app shell in index.html) so it persists across hash-route changes.
// Falls back silently when running headless / capture-DOM tests.
if (typeof document !== 'undefined') {
  const navHost = document.getElementById?.('global-nav-host');
  if (navHost) mountGlobalNav(navHost);
}
