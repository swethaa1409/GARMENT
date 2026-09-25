/**
 * AI Garment Management System — Worker Profile Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  AGMS.seedIfNeeded();

  const session = AGMS.workerAuth.requireSession();
  if (!session) return;

  AGMS.initSidebar();

  // Populate header info
  const workerAvatar = document.getElementById('workerAvatar');
  const workerName = document.getElementById('workerName');
  if (workerAvatar) workerAvatar.textContent = (session.name || 'W').charAt(0).toUpperCase();
  if (workerName) workerName.textContent = session.name;

  // Logout
  const logoutBtn = document.getElementById('workerLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (AGMS.confirmAction('Are you sure you want to log out of Worker Portal?')) {
        AGMS.workerAuth.logout();
        window.location.href = '../login.html';
      }
    });
  }

  function renderProfile() {
    const profile = AGMS.workerAuth.getProfile(session.id) || {
      id: session.id || 'WRK-102',
      name: session.name || 'Priya Kumar',
      email: session.email || 'worker@agms.com',
      phone: '9876543210',
      skills: ['Stitching', 'Quality Check'],
      primaryStage: session.primaryStage || 'Stitching',
      ratePerPiece: session.ratePerPiece || 15,
      joined: '2024-03-05',
      department: 'Stitching Unit'
    };

    const profAvatar = document.getElementById('profAvatar');
    const profName = document.getElementById('profName');
    const profId = document.getElementById('profId');
    const profFullName = document.getElementById('profFullName');
    const profIdVal = document.getElementById('profIdVal');
    const profPhone = document.getElementById('profPhone');
    const profEmail = document.getElementById('profEmail');
    const profStage = document.getElementById('profStage');
    const profRate = document.getElementById('profRate');
    const profJoined = document.getElementById('profJoined');
    const profDept = document.getElementById('profDept');
    const profSkills = document.getElementById('profSkills');
    const profTodayPcs = document.getElementById('profTodayPcs');
    const profRateCard = document.getElementById('profRateCard');

    if (profAvatar) profAvatar.textContent = (profile.name || 'P').charAt(0).toUpperCase();
    if (profName) profName.textContent = profile.name;
    if (profId) profId.textContent = profile.id;
    if (profFullName) profFullName.textContent = profile.name;
    if (profIdVal) profIdVal.textContent = profile.id;
    if (profPhone) profPhone.textContent = profile.phone || '9876543210';
    if (profEmail) profEmail.textContent = profile.email;
    if (profStage) profStage.textContent = profile.primaryStage;
    if (profRate) profRate.textContent = `₹${profile.ratePerPiece || 15} / piece`;
    if (profJoined) profJoined.textContent = profile.joined ? AGMS.formatDate(profile.joined) : '05 Mar 2024';
    if (profDept) profDept.textContent = profile.department || 'Stitching Unit';
    if (profRateCard) profRateCard.textContent = `₹${profile.ratePerPiece || 15} / pc`;

    if (profSkills && Array.isArray(profile.skills)) {
      profSkills.innerHTML = profile.skills.map(s => `
        <span class="skill-tag"><i class="fa-solid fa-check" style="margin-right:4px;"></i>${AGMS.escapeHtml(s)}</span>
      `).join('');
    }

    // Today's completed count
    const todayTask = AGMS.workerTasks.todayTask(session.id);
    if (profTodayPcs && todayTask) {
      profTodayPcs.textContent = `${todayTask.completed || 0} pieces`;
    }
  }

  renderProfile();
});
