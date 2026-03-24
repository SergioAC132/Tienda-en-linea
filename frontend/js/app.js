// ===== MAIN APPLICATION ENTRY POINT =====
const App = {
  navigate(route) {
    Router.navigate(route);
  }
};

// Listen for hash changes (browser back/forward + navigate)
window.addEventListener('hashchange', () => Router.render());

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  Router.render();
});
