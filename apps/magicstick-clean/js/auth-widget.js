// Shared login/create-account/OAuth wiring, reused by the "My account" page
// (account.js) and the "connect" card shown on the quote request page
// (quote.js). Each caller provides its own markup — this only wires the
// tabs, the two forms, and the OAuth buttons found inside `root`.
(function () {
  const AUTH_ERROR_KEYS = {
    'Invalid login credentials': 'authError.invalidCredentials',
    'User already registered': 'authError.alreadyRegistered',
    'Signups not allowed for otp': 'authError.otpNoAccount',
    'Token has expired or is invalid': 'authError.otpInvalidCode',
  };

  function translateAuthError(t, message) {
    const key = AUTH_ERROR_KEYS[message];
    return key ? t(key) : message;
  }

  // ids: { tabs, loginForm, loginEmail, loginPassword, loginNote, forgotBtn,
  //   signupForm, signupName, signupEmail, signupPassword, signupNote,
  //   googleBtn, appleBtn, otpSection, otpToggleBtn, otpRequestForm, otpEmail,
  //   otpRequestNote, otpVerifyForm, otpCode, otpVerifyNote } — each a CSS
  //   selector scoped to `root`. The otp* ids are optional (the quote page's
  //   lighter connect card doesn't pass them).
  // onSignedIn(user) fires after a successful login or a signup that
  // returns an immediate session (email confirmation is off by default here).
  function initAuthWidget(root, ids, supabase, onSignedIn) {
    const t = (key, vars) => (window.MagicstickI18N ? window.MagicstickI18N.t(key, vars) : key);
    const loginForm = root.querySelector(ids.loginForm);
    const signupForm = root.querySelector(ids.signupForm);
    const otpSection = ids.otpSection ? root.querySelector(ids.otpSection) : null;
    const otpToggleBtn = ids.otpToggleBtn ? root.querySelector(ids.otpToggleBtn) : null;
    const otpRequestForm = ids.otpRequestForm ? root.querySelector(ids.otpRequestForm) : null;
    const otpVerifyForm = ids.otpVerifyForm ? root.querySelector(ids.otpVerifyForm) : null;
    let otpPendingEmail = '';

    root.querySelectorAll(ids.tabs).forEach((tab) => {
      tab.addEventListener('click', () => {
        root.querySelectorAll(ids.tabs).forEach((tb) => tb.classList.remove('active'));
        tab.classList.add('active');
        const isLogin = tab.dataset.tab === 'login';
        loginForm.hidden = !isLogin;
        signupForm.hidden = isLogin;
        if (otpSection) otpSection.hidden = !isLogin;
        if (otpRequestForm) otpRequestForm.hidden = true;
        if (otpVerifyForm) otpVerifyForm.hidden = true;
      });
    });

    if (otpToggleBtn) {
      otpToggleBtn.addEventListener('click', () => {
        const switchingToOtp = !loginForm.hidden;
        loginForm.hidden = switchingToOtp;
        if (otpRequestForm) otpRequestForm.hidden = !switchingToOtp;
        if (otpVerifyForm) otpVerifyForm.hidden = true;
        otpToggleBtn.textContent = switchingToOtp
          ? t('account.otp.usePassword')
          : t('account.otp.toggle');
      });
    }

    if (otpRequestForm) {
      otpRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const note = root.querySelector(ids.otpRequestNote);
        const email = root.querySelector(ids.otpEmail).value.trim();
        note.textContent = t('account.otp.note.sending');
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (error) {
          note.textContent = translateAuthError(t, error.message);
          return;
        }
        otpPendingEmail = email;
        note.textContent = '';
        otpRequestForm.hidden = true;
        if (otpVerifyForm) otpVerifyForm.hidden = false;
      });
    }

    if (otpVerifyForm) {
      otpVerifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const note = root.querySelector(ids.otpVerifyNote);
        const code = root.querySelector(ids.otpCode).value.trim();
        note.textContent = t('account.otp.note.verifying');
        const { data, error } = await supabase.auth.verifyOtp({
          email: otpPendingEmail,
          token: code,
          type: 'email',
        });
        if (error) {
          note.textContent = translateAuthError(t, error.message);
          return;
        }
        onSignedIn(data.user);
      });
    }

    const forgotBtn = root.querySelector(ids.forgotBtn);
    if (forgotBtn) {
      forgotBtn.addEventListener('click', async () => {
        const note = root.querySelector(ids.loginNote);
        const email = root.querySelector(ids.loginEmail).value.trim();
        if (!email) {
          note.textContent = t('account.forgotPassword.note.needEmail');
          return;
        }
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/account.html`,
        });
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
