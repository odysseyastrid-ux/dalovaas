// Shared login/create-account/OAuth wiring, reused by the "My account" page
// (account.js) and the "connect" card shown on the quote request page
// (quote.js). Each caller provides its own markup — this only wires the
// tabs, the two forms, and the OAuth buttons found inside `root`.
(function () {
  const AUTH_ERROR_KEYS = {
    'Invalid login credentials': 'authError.invalidCredentials',
    'User already registered': 'authError.alreadyRegistered',
  };

  function translateAuthError(t, message) {
    const key = AUTH_ERROR_KEYS[message];
    return key ? t(key) : message;
  }

  // ids: { tabs, loginForm, loginEmail, loginPassword, loginNote, forgotBtn,
  //   signupForm, signupName, signupEmail, signupPassword, signupNote,
  //   googleBtn, appleBtn } — each a CSS selector scoped to `root`.
  // onSignedIn(user) fires after a successful login or a signup that
  // returns an immediate session (email confirmation is off by default here).
  function initAuthWidget(root, ids, supabase, onSignedIn) {
    const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
    const loginForm = root.querySelector(ids.loginForm);
    const signupForm = root.querySelector(ids.signupForm);

    root.querySelectorAll(ids.tabs).forEach((tab) => {
      tab.addEventListener('click', () => {
        root.querySelectorAll(ids.tabs).forEach((tb) => tb.classList.remove('active'));
        tab.classList.add('active');
        const isLogin = tab.dataset.tab === 'login';
        loginForm.hidden = !isLogin;
        signupForm.hidden = isLogin;
      });
    });

    const forgotBtn = root.querySelector(ids.forgotBtn);
    if (forgotBtn) {
      forgotBtn.addEventListener('click', async () => {
        const note = root.querySelector(ids.loginNote);
        const email = root.querySelector(ids.loginEmail).value.trim();
        if (!email) {
          note.textContent = t('account.forgotPassword.note.needEmail');
          return;
        }
        await supabase.auth.resetPasswordForEmail(email);
        note.textContent = t('account.forgotPassword.note.sent');
      });
    }

    function oauthSignIn(provider) {
      return async () => {
        const note = root.querySelector(ids.loginNote);
        const { error } = await supabase.auth.signInWithOAuth({ provider });
        if (error) note.textContent = t('account.oauth.notConfigured');
      };
    }
    const googleBtn = root.querySelector(ids.googleBtn);
    const appleBtn = root.querySelector(ids.appleBtn);
    if (googleBtn) googleBtn.addEventListener('click', oauthSignIn('google'));
    if (appleBtn) appleBtn.addEventListener('click', oauthSignIn('apple'));

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = root.querySelector(ids.loginNote);
      note.textContent = t('account.login.note.signingIn');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: root.querySelector(ids.loginEmail).value.trim(),
        password: root.querySelector(ids.loginPassword).value,
      });
      if (error) {
        note.textContent = translateAuthError(t, error.message);
        return;
      }
      onSignedIn(data.user);
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = root.querySelector(ids.signupNote);
      note.textContent = t('account.signup.note.creating');
      const { data, error } = await supabase.auth.signUp({
        email: root.querySelector(ids.signupEmail).value.trim(),
        password: root.querySelector(ids.signupPassword).value,
        options: { data: { full_name: root.querySelector(ids.signupName).value.trim() } },
      });
      if (error) {
        note.textContent = translateAuthError(t, error.message);
        return;
      }
      if (data.user && !data.session) {
        note.textContent = t('account.signup.note.checkEmail');
        return;
      }
      onSignedIn(data.user);
    });
  }

  window.MagicstickAuthWidget = { initAuthWidget, translateAuthError };
})();
