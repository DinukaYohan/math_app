// js/profile.js
(async function initProfile() {
  const loginAlert = document.getElementById('loginAlert');
  const profileCard = document.getElementById('profileCard');

  if (!Auth.isLoggedIn()) {
    loginAlert.classList.remove('d-none');
    return;
  }

  // Load current user
  try {
    const me = await API.getMe(); // { id, username, email, created_at }
    fillProfile(me);
    profileCard.classList.remove('d-none');
  } catch (e) {
    console.error(e);
    loginAlert.classList.remove('d-none');
    return;
  }

  // Save profile
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveStatus = document.getElementById('saveStatus');
    saveStatus.textContent = 'Saving...';

    try {
      const payload = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim()
      };
      const user = await API.updateMe(payload);
      fillProfile(user);
      saveStatus.textContent = 'Saved ✔';
      setTimeout(() => saveStatus.textContent = '', 2000);
    } catch (err) {
      console.error(err);
      saveStatus.textContent = 'Failed to save';
      saveStatus.classList.add('text-danger');
    }
  });

  // Change password
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwdStatus = document.getElementById('pwdStatus');
    pwdStatus.textContent = 'Updating...';

    try {
      await API.changePassword({
        old_password: document.getElementById('oldPassword').value,
        new_password: document.getElementById('newPassword').value
      });
      pwdStatus.textContent = 'Password updated ✔';
      e.target.reset();
    } catch (err) {
      console.error(err);
      pwdStatus.textContent = 'Failed to update password';
      pwdStatus.classList.add('text-danger');
    }
  });

  // helpers
  function fillProfile(u) {
    document.getElementById('profileUsername').textContent = u.username || '—';
    document.getElementById('username').value = u.username || '';
    document.getElementById('email').value = u.email || '';
    document.getElementById('profileSince').textContent =
      u.created_at ? new Date(u.created_at).toLocaleDateString() : '—';

    const initials = (u.username || u.email || 'U')
      .split(/[^\w]+/).filter(Boolean).map(s => s[0].toUpperCase()).slice(0,2).join('') || 'U';
    document.getElementById('avatar').textContent = initials;
  }
})();
