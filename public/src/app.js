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

// ── Session-Persistenz ────────────────────────────────────────────────────────
// Das berechnete Profil wird in sessionStorage gesichert, damit es bei
// Back-Navigation und Seiten-Reload erhalten bleibt.
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
  .register('/overview', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    OverviewPage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/love', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    LovePage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/career-finance', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    CareerFinancePage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/personality', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    PersonalityPage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/dashboard', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    DashboardPage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .register('/synastry', (app) => {
    SynastryPage(app);
  })
  .register('/transit-calendar', (app) => {
    TransitCalendarPage(app, { profile: currentProfile });
  })
  .register('/daily', (app) => {
    DailyPage(app);
  })
  .start();
