/**
 * profil.js — Gestion du profil utilisateur
 * ============================================================
 * Ce fichier gère la page profil.html :
 * - Affichage des informations du profil
 * - Modification des informations personnelles
 * - Changement du mot de passe
 * - Affichage des annonces publiées depuis le profil
 * 
 * Dépendances : main.js
 * ============================================================
 */


// ============================================================
// INITIALISATION DU PROFIL
// ============================================================

/**
 * Initialise la page de profil.
 */
function initProfil() {
  // Vérifier la connexion
  const user = requireAuth();
  if (!user) return;

  // Remplir les informations actuelles
  afficherInfosProfil(user);

  // Initialiser le formulaire de modification du profil
  initEditProfilForm(user);

  // Initialiser le formulaire de changement de mot de passe
  initChangePasswordForm(user);

  // Afficher les annonces de l'utilisateur
  afficherAnnoncesProfilPage(user);

  // Onglets du profil
  initProfilTabs();
}

/**
 * Affiche les informations du profil dans l'interface.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function afficherInfosProfil(user) {
  const initials = getInitials(user.prenom, user.nom);
  const fullName = `${user.prenom} ${user.nom}`;

  // Avatar et informations principales
  const avatarEl = document.getElementById('profilAvatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('profilFullName');
  if (nameEl) nameEl.textContent = fullName;

  const emailEl = document.getElementById('profilEmail');
  if (emailEl) emailEl.textContent = user.email;

  const univEl = document.getElementById('profilUniversite');
  if (univEl) univEl.textContent = user.universite || 'Université non précisée';

  const anneeEl = document.getElementById('profilAnnee');
  if (anneeEl) anneeEl.textContent = user.annee ? `Année ${user.annee}` : '';

  // Statistiques
  const allAnnonces = getAllAnnonces();
  const mesAnnonces = allAnnonces.filter(a => a.auteurId === user.id);
  
  const statAnEl = document.getElementById('profilStatAnnonces');
  if (statAnEl) statAnEl.textContent = mesAnnonces.length;

  // Date d'inscription
  const users = getAllUsers();
  const fullUser = users.find(u => u.id === user.id);
  if (fullUser && fullUser.createdAt) {
    const memberSinceEl = document.getElementById('profilMemberSince');
    if (memberSinceEl) {
      memberSinceEl.textContent = new Date(fullUser.createdAt).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      });
    }
  }

  // Titre de la page
  document.title = `Mon profil — ${fullName} — AnnonceRDC`;
}


// ============================================================
// FORMULAIRE DE MODIFICATION DU PROFIL
// ============================================================

/**
 * Initialise et pré-remplit le formulaire de modification du profil.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function initEditProfilForm(user) {
  const form = document.getElementById('editProfilForm');
  if (!form) return;

  // Remplir le select des universités
  populateUniversiteSelectProfil();

  // Pré-remplir les champs avec les données actuelles
  const fullUser = getAllUsers().find(u => u.id === user.id) || user;

  const champs = {
    editPrenom: fullUser.prenom || '',
    editNom: fullUser.nom || '',
    editEmail: fullUser.email || '',
    editUniversite: fullUser.universite || '',
    editAnnee: fullUser.annee || '',
  };

  Object.entries(champs).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  // Soumission du formulaire
  form.addEventListener('submit', (e) => handleEditProfil(e, user));
}

/**
 * Remplit le select des universités pour le formulaire de profil.
 */
function populateUniversiteSelectProfil() {
  const select = document.getElementById('editUniversite');
  if (!select) return;

  while (select.options.length > 1) select.remove(1);

  UNIVERSITES.forEach(univ => {
    const option = document.createElement('option');
    option.value = univ;
    option.textContent = univ;
    select.appendChild(option);
  });
}

/**
 * Gère la soumission du formulaire de modification du profil.
 * 
 * @param {Event} e
 * @param {Object} currentUser - L'utilisateur connecté
 */
function handleEditProfil(e, currentUser) {
  e.preventDefault();

  const prenomInput = document.getElementById('editPrenom');
  const nomInput = document.getElementById('editNom');
  const emailInput = document.getElementById('editEmail');
  const universiteInput = document.getElementById('editUniversite');
  const anneeInput = document.getElementById('editAnnee');
  const submitBtn = document.getElementById('submitEditProfilBtn');

  // Validation
  let isValid = true;
  isValid = validateRequired(prenomInput, 'Le prénom') && isValid;
  isValid = validateRequired(nomInput, 'Le nom') && isValid;
  isValid = validateEmail(emailInput) && isValid;
  isValid = validateRequired(universiteInput, "L'université") && isValid;

  if (!isValid) {
    showToast('Veuillez corriger les erreurs.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement…';

  setTimeout(() => {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) {
      showToast('Erreur : utilisateur introuvable.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer les modifications';
      return;
    }

    // Vérifier si le nouvel email est déjà utilisé par quelqu'un d'autre
    const newEmail = emailInput.value.trim().toLowerCase();
    const emailConflict = users.some(u => u.id !== currentUser.id && u.email.toLowerCase() === newEmail);
    if (emailConflict) {
      showFieldError(emailInput, 'Cette adresse email est déjà utilisée par un autre compte.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enregistrer les modifications';
      return;
    }

    // Mettre à jour l'utilisateur
    users[userIndex] = {
      ...users[userIndex],
      prenom: prenomInput.value.trim(),
      nom: nomInput.value.trim(),
      email: newEmail,
      universite: universiteInput.value,
      annee: anneeInput.value,
    };

    saveToStorage(STORAGE_KEYS.USERS, users);

    // Mettre à jour la session courante
    const updatedSession = {
      ...currentUser,
      prenom: users[userIndex].prenom,
      nom: users[userIndex].nom,
      email: users[userIndex].email,
      universite: users[userIndex].universite,
      annee: users[userIndex].annee,
    };
    saveToStorage(STORAGE_KEYS.CURRENT_USER, updatedSession);

    // Mettre à jour aussi les annonces associées (nom de l'auteur)
    const annonces = getAllAnnonces();
    const updatedAnnonces = annonces.map(a => {
      if (a.auteurId === currentUser.id) {
        return {
          ...a,
          auteurPrenom: users[userIndex].prenom,
          auteurNom: users[userIndex].nom,
          auteurUniversite: users[userIndex].universite,
        };
      }
      return a;
    });
    saveAnnonces(updatedAnnonces);

    showToast('Profil mis à jour avec succès ! ✅', 'success');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Enregistrer les modifications';

    // Rafraîchir l'affichage du profil
    afficherInfosProfil(updatedSession);
  }, 500);
}


// ============================================================
// FORMULAIRE DE CHANGEMENT DE MOT DE PASSE
// ============================================================

/**
 * Initialise le formulaire de changement de mot de passe.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function initChangePasswordForm(user) {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;

  // Toggle pour afficher/masquer les mots de passe
  ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => {
    const toggleId = `toggle_${id}`;
    const input = document.getElementById(id);
    const toggle = document.getElementById(toggleId);
    if (input && toggle) {
      toggle.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        toggle.textContent = input.type === 'password' ? '👁️' : '🙈';
      });
    }
  });

  // Indicateur de force du nouveau mot de passe
  const newPwdInput = document.getElementById('newPassword');
  if (newPwdInput) {
    newPwdInput.addEventListener('input', () => {
      const fill = document.getElementById('newPwdStrengthFill');
      const text = document.getElementById('newPwdStrengthText');
      if (!fill || !text) return;

      const strength = getPasswordStrength(newPwdInput.value);
      const labels = { weak: 'Faible', fair: 'Moyen', good: 'Bon', strong: 'Très fort' };
      fill.className = `strength-fill ${strength}`;
      text.className = `strength-text ${strength}`;
      text.textContent = newPwdInput.value ? labels[strength] : '';
    });
  }

  form.addEventListener('submit', (e) => handleChangePassword(e, user));
}

/**
 * Gère la soumission du formulaire de changement de mot de passe.
 * 
 * @param {Event} e
 * @param {Object} user - L'utilisateur connecté
 */
function handleChangePassword(e, user) {
  e.preventDefault();

  const currentPwdInput = document.getElementById('currentPassword');
  const newPwdInput = document.getElementById('newPassword');
  const confirmPwdInput = document.getElementById('confirmNewPassword');
  const submitBtn = document.getElementById('submitChangePasswordBtn');

  // Récupérer l'utilisateur complet (avec son mot de passe)
  const users = getAllUsers();
  const fullUser = users.find(u => u.id === user.id);

  // Vérifier l'ancien mot de passe
  if (!currentPwdInput.value) {
    showFieldError(currentPwdInput, 'Veuillez entrer votre mot de passe actuel.');
    return;
  }

  if (fullUser.password !== currentPwdInput.value) {
    showFieldError(currentPwdInput, 'Mot de passe actuel incorrect.');
    showToast('Le mot de passe actuel est incorrect.', 'error');
    return;
  }

  showFieldSuccess(currentPwdInput);

  // Valider le nouveau mot de passe
  let isValid = validatePassword(newPwdInput);

  // Vérifier la confirmation
  if (newPwdInput.value !== confirmPwdInput.value) {
    showFieldError(confirmPwdInput, 'Les mots de passe ne correspondent pas.');
    isValid = false;
  } else if (confirmPwdInput.value) {
    showFieldSuccess(confirmPwdInput);
  }

  if (!isValid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Modification…';

  setTimeout(() => {
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex].password = newPwdInput.value;
    saveToStorage(STORAGE_KEYS.USERS, users);

    showToast('Mot de passe modifié avec succès ! 🔒', 'success');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Modifier le mot de passe';

    // Vider les champs
    currentPwdInput.value = '';
    newPwdInput.value = '';
    confirmPwdInput.value = '';
    [currentPwdInput, newPwdInput, confirmPwdInput].forEach(i => clearFieldState(i));
  }, 500);
}


// ============================================================
// ANNONCES SUR LA PAGE PROFIL
// ============================================================

/**
 * Affiche les annonces de l'utilisateur sur la page profil.
 * 
 * @param {Object} user
 */
function afficherAnnoncesProfilPage(user) {
  const container = document.getElementById('profilAnnoncesGrid');
  if (!container) return;

  const allAnnonces = getAllAnnonces();
  const mesAnnonces = allAnnonces
    .filter(a => a.auteurId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (mesAnnonces.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">📭</div>
        <h3>Aucune annonce publiée</h3>
        <p>Vous n'avez pas encore publié d'annonce.</p>
        <a href="./annonce.html" class="btn btn-primary">+ Publier une annonce</a>
      </div>
    `;
  } else {
    container.innerHTML = mesAnnonces.map(a => renderAnnonceCard(a, true)).join('');

    // Attacher les listeners de suppression
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        showConfirmModal(
          'Supprimer l\'annonce',
          'Cette action est irréversible. Voulez-vous vraiment supprimer cette annonce ?',
          () => {
            supprimerAnnonce(id);
            showToast('Annonce supprimée.', 'success');
            afficherAnnoncesProfilPage(user);
            afficherInfosProfil(user);
          },
          'Supprimer'
        );
      });
    });
  }
}


// ============================================================
// ONGLETS DU PROFIL
// ============================================================

/**
 * Initialise les onglets de la page profil.
 */
function initProfilTabs() {
  document.querySelectorAll('[data-profil-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = tab.dataset.profilTab;

      // Désactiver tous les onglets
      document.querySelectorAll('[data-profil-tab]').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('[data-profil-panel]').forEach(p => p.classList.remove('active'));

      // Activer l'onglet cliqué
      tab.classList.add('active');
      const panel = document.getElementById(`profil-panel-${tabId}`);
      if (panel) panel.classList.add('active');
    });
  });
}


// ============================================================
// SUPPRESSION DU COMPTE
// ============================================================

/**
 * Demande confirmation et supprime le compte de l'utilisateur.
 * Supprime aussi toutes ses annonces.
 */
function supprimerCompte() {
  showConfirmModal(
    'Supprimer mon compte',
    '⚠️ Cette action est IRRÉVERSIBLE. Votre compte et toutes vos annonces seront définitivement supprimés. Êtes-vous sûr(e) ?',
    () => {
      const user = getCurrentUser();
      if (!user) return;

      // Supprimer l'utilisateur
      const users = getAllUsers().filter(u => u.id !== user.id);
      saveToStorage(STORAGE_KEYS.USERS, users);

      // Supprimer ses annonces
      const annonces = getAllAnnonces().filter(a => a.auteurId !== user.id);
      saveAnnonces(annonces);

      // Déconnecter
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

      showToast('Votre compte a été supprimé.', 'info');
      setTimeout(() => window.location.href = './index.html', 800);
    },
    'Supprimer mon compte'
  );
}


// ============================================================
// INITIALISATION AU CHARGEMENT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();
  if (page === 'profil.html') {
    initProfil();
  }
});
