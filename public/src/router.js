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
      // I7: only invoke if cleanup is actually callable (pages may return
      // Promises from async mounts, non-function literals, or undefined).
      if (typeof currentCleanup === 'function') {
        try { currentCleanup(); } catch (e) { /* cleanup must never block nav */ }
      }
      currentCleanup = null;
      const app = document.getElementById('app');
      if (!app) return;
      app.innerHTML = '';
      if (!mount) return;
      try {
        const result = mount(app);
        currentCleanup = typeof result === 'function' ? result : null;
      } catch (err) {
        app.innerHTML = '';
        const main = document.createElement('main');
        main.className = 'error-page';
        const h1 = document.createElement('h1');
        h1.textContent = 'Seite konnte nicht geladen werden';
        const detail = document.createElement('p');
        detail.className = 'error-detail';
        detail.textContent = err.message;
        const back = document.createElement('a');
        back.href = '#/';
        back.textContent = '← Zurück zur Eingabe';
        main.append(h1, detail, back);
        app.appendChild(main);
      }
    };
    window.addEventListener('hashchange', handle);
    handle();
  },
};
