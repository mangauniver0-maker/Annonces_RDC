function setAdminText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function initAdmin() {
  const user = requireAuth();
  if (!user) return;
  if (!isAdmin(user)) {
    showToast('Accès réservé aux administrateurs.', 'error');
    setTimeout(() => { window.location.href = './dashboard.html'; }, 500);
    return;
  }
  renderAdmin();
  const refresh = document.getElementById('refreshAdminBtn');
  if (refresh) refresh.addEventListener('click', () => { renderAdmin(); showToast('Données actualisées.', 'success', 1800); });
  window.addEventListener('annonces:refresh', renderAdmin);
}

function renderAdmin() {
  const users = getAllUsers();
  const annonces = getAllAnnonces().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  setAdminText('adminUsersCount', users.length);
  setAdminText('adminAdsCount', annonces.length);
  setAdminText('adminUniversitiesCount', new Set(users.map(user => user.universite).filter(Boolean)).size);
  const usersTable = document.getElementById('adminUsersTable');
  const adsTable = document.getElementById('adminAdsTable');
  if (usersTable) usersTable.innerHTML = users.map(renderAdminUser).join('');
  if (adsTable) adsTable.innerHTML = annonces.map(renderAdminAd).join('');
  document.querySelectorAll('[data-admin-delete-user]').forEach(button => button.addEventListener('click', () => deleteUser(button.dataset.adminDeleteUser)));
  document.querySelectorAll('[data-admin-delete-ad]').forEach(button => button.addEventListener('click', () => deleteAd(button.dataset.adminDeleteAd)));
}

function renderAdminUser(user) {
  const initials = getInitials(user.prenom, user.nom);
  const avatar = user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="" />` : escapeHtml(initials);
  return `<tr><td><div class="admin-user"><span class="admin-avatar">${avatar}</span>${escapeHtml(user.prenom)} ${escapeHtml(user.nom)}</div></td><td>${escapeHtml(user.universite || '—')}</td><td><span class="admin-role ${user.role === 'admin' ? 'admin' : ''}">${user.role === 'admin' ? 'Administrateur' : 'Étudiant'}</span></td><td>${escapeHtml(formatDate(user.createdAt))}</td><td>${user.role === 'admin' ? '' : `<button class="admin-action" data-admin-delete-user="${escapeHtml(user.id)}">Supprimer</button>`}</td></tr>`;
}

function renderAdminAd(ad) {
  const cat = getCategoryInfo(ad.categorie);
  return `<tr><td><strong>${escapeHtml(truncate(ad.titre, 42))}</strong></td><td>${escapeHtml(ad.auteurPrenom)} ${escapeHtml(ad.auteurNom)}</td><td>${cat.icon} ${escapeHtml(cat.label)}</td><td>${escapeHtml(formatDate(ad.createdAt))}</td><td><button class="admin-action" data-admin-delete-ad="${escapeHtml(ad.id)}">Retirer</button></td></tr>`;
}

function deleteUser(id) {
  const user = getUserById(id);
  if (!user) return;
  showConfirmModal('Supprimer ce membre ?', `Le compte de ${user.prenom} ${user.nom} et ses annonces seront supprimés.`, () => {
    saveToStorage(STORAGE_KEYS.USERS, getAllUsers().filter(item => item.id !== id));
    saveAnnonces(getAllAnnonces().filter(ad => ad.auteurId !== id));
    renderAdmin();
    showToast('Membre supprimé.', 'success');
  }, 'Supprimer');
}

function deleteAd(id) {
  showConfirmModal('Retirer cette annonce ?', 'Elle ne sera plus visible sur la plateforme.', () => {
    saveAnnonces(getAllAnnonces().filter(ad => ad.id !== id));
    renderAdmin();
    showToast('Annonce retirée.', 'success');
  }, 'Retirer');
}

document.addEventListener('DOMContentLoaded', () => {
  if ((window.location.pathname.split('/').pop() || 'index.html') === 'admin.html') initAdmin();
});
