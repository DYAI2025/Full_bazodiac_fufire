import { router } from './router.js';
import { InputPage }          from './pages/InputPage.js';
import { OverviewPage }       from './pages/OverviewPage.js';
import { DashboardPage }      from './pages/DashboardPage.js';
import { LovePage }           from './pages/LovePage.js';

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
  .register('/dashboard', (app) => {
    if (!currentProfile) { router.navigate('/'); return; }
    DashboardPage(app, {
      profile: currentProfile,
      onNavigate: (path) => router.navigate(path),
    });
  })
  .start();
