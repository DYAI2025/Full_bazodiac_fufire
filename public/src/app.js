import { router } from './router.js';
import { InputPage } from './pages/InputPage.js';
import { OverviewPage } from './pages/OverviewPage.js';

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
  .start();
