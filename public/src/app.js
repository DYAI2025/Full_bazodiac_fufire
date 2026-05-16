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

let currentProfile = null;

router
  .register('/', (app) => {
    InputPage(app, {
      onResult: (profile) => {
        currentProfile = profile;
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
    TransitCalendarPage(app);
  })
  .register('/daily', (app) => {
    DailyPage(app);
  })
  .start();
