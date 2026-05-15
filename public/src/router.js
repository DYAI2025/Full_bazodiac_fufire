// Leichtgewichtiger Hash-Router
// Verwendung: router.register('/love', LovePage); router.start();

const routes = new Map();
let currentCleanup = null;

export const router = {
  register(path, mountFn) {
    routes.set(path, mountFn);
    return this;
  },

  navigate(path) {
    window.location.hash = path;
  },

  start() {
    const handle = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      const mount = routes.get(hash) || routes.get('*');
      if (currentCleanup) currentCleanup();
      const app = document.getElementById('app');
      if (!app) return;
      app.innerHTML = '';
      if (mount) currentCleanup = mount(app) || null;
    };
    window.addEventListener('hashchange', handle);
    handle();
  },
};
