// The theme choice: html[data-theme] = 'light' | 'dark', stored in localStorage; none = follow the system.
export const THEME_KEY = 'theme';

/** Runs in <head> before the page paints, so a stored choice never flashes the other theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
