/**
 * dashboard.js — Logique du tableau de bord
 * ============================================================
 * Ce fichier gère le tableau de bord de l'étudiant connecté :
 * - Affichage des statistiques personnelles
 * - Liste des annonces de l'utilisateur (avec modif/suppr)
 * - Navigation entre les onglets/sections
 * - Formulaire de publication rapide
 * 
 * Dépendances : main.js, annonces.js
 * ============================================================
 */


// ============================================================
// INITIALISATION DU DASHBOARD
// ============================================================

/**
 * Initialise la page tableau de bord.
 * Appelée au chargement de dashboard.html.
 */
function initDashboard() {
  // Vérifier l'authentification (redirige si non connecté)
  const user = requireAuth();
  if (!user) return;

  // Remplir les informations utilisateur dans l'interface
  afficherInfosUtilisateur(user);

  // Afficher les statistiques
  afficherStatsDashboard(user);

  // Charger les annonces de l'utilisateur
  afficherMesAnnonces(user);

  // Initialiser la navigation par onglets
  initDashboardNav();

  // Écouter les clics sur les boutons d'action des annonces
  initAnnonceActions();
}

/**
 * Remplit les informations de l'utilisateur dans tous les éléments
 * du dashboard qui affichent des données utilisateur.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function afficherInfosUtilisateur(user) {
  const initials = getInitials(user.prenom, user.nom);
  const fullName = `${user.prenom} ${user.nom}`;

  // Sidebar — profil
  setTextById('sidebarAvatar', initials);
  setTextById('sidebarUserName', fullName);
  setTextById('sidebarUserInfo', user.universite || '');

  // En-tête principal
  setTextById('dashboardGreetingName', user.prenom);

  // Date du jour
  const dateEl = document.getElementById('dashboardDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Profil rapide (panneau latéral)
  setTextById('profileQuickAvatar', initials);
  setTextById('profileQuickName', fullName);
  setTextById('profileQuickUniversity', user.universite || 'Université non précisée');
  setTextById('profileQuickYear', user.annee ? `Année ${user.annee}` : '');
  setTextById('profileQuickEmail', user.email || '');
}

/**
 * Utilitaire : définit le contenu texte d'un élément par son ID.
 * 
 * @param {string} id - ID de l'élément
 * @param {string} text - Texte à définir
 */
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}


// ============================================================
// STATISTIQUES DU DASHBOARD
// ============================================================

/**
 * Calcule et affiche les statistiques personnelles de l'utilisateur.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function afficherStatsDashboard(user) {
  const allAnnonces = getAllAnnonces();

  // Annonces de cet utilisateur
  const mesAnnonces = allAnnonces.filter(a => a.auteurId === user.id);

  // Calculs des stats
  const totalMesAnnonces = mesAnnonces.length;
  const totalAnnonces = allAnnonces.length;
  const annoncesCeMois = mesAnnonces.filter(a => {
    const date = new Date(a.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  // Catégories utilisées
  const categoriesUtilisees = new Set(mesAnnonces.map(a => a.categorie)).size;

  // Afficher les stats
  setTextById('statMesAnnonces', totalMesAnnonces);
  setTextById('statTotalAnnonces', totalAnnonces);
  setTextById('statCeMois', annoncesCeMois);
  setTextById('statCategories', categoriesUtilisees);

  // Profil rapide
  setTextById('profileStatAnnonces', totalMesAnnonces);
  setTextById('profileStatMois', annoncesCeMois);

  // Badge dans la sidebar
  const sidebarBadge = document.getElementById('sidebarAnnoncesBadge');
  if (sidebarBadge) sidebarBadge.textContent = totalMesAnnonces;
}


// ============================================================
// LISTE DES ANNONCES DE L'UTILISATEUR
// ============================================================

/**
 * Affiche les annonces de l'utilisateur connecté.
 * 
 * @param {Object} user - L'utilisateur connecté
 */
function afficherMesAnnonces(user) {
  const allAnnonces = getAllAnnonces();
  const mesAnnonces = allAnnonces
    .filter(a => a.auteurId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));  // Les plus récentes en premier

  // --- Vue Tableau ---
  const tableBody = document.getElementById('annoncesTableBody');
  if (tableBody) {
    if (mesAnnonces.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:48px;color:var(--gray-500);">
            <div style="font-size:2.5rem;margin-bottom:12px;">📭</div>
            <div style="font-weight:600;margin-bottom:8px;">Aucune annonce publiée</div>
            <div style="font-size:0.875rem;">Commencez par publier votre première annonce !</div>
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = mesAnnonces.map(a => renderAnnonceRow(a)).join('');
    }
  }

  // --- Vue Grille (cartes) ---
  const gridContainer = document.getElementById('mesAnnoncesGrid');
  if (gridContainer) {
    if (mesAnnonces.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">📭</div>
          <h3>Aucune annonce publiée</h3>
          <p>Publiez votre première annonce pour qu'elle soit visible par tous les étudiants.</p>
          <a href="./annonce.html" class="btn btn-primary">+ Publier une annonce</a>
        </div>
      `;
    } else {
      gridContainer.innerHTML = mesAnnonces.map(a => renderAnnonceCard(a, true)).join('');

      // Attacher les listeners de suppression
      gridContainer.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          demanderSuppression(id);
        });
      });
    }
  }
}

/**
 * Génère une ligne de tableau pour une annonce.
 * 
 * @param {Object} annonce
 * @returns {string} HTML de la ligne <tr>
 */
function renderAnnonceRow(annonce) {
  const cat = getCategoryInfo(annonce.categorie);
  const prix = formatPrix(annonce.prix, annonce.devise);
  const date = formatDate(annonce.createdAt);

  return `
    <tr>
      <td data-label="Titre">
        <div class="table-title">${escapeHtml(annonce.titre)}</div>
      </td>
      <td data-label="Catégorie">
        <span class="badge-categorie badge-${escapeHtml(annonce.categorie)}">
          ${cat.icon} ${escapeHtml(cat.label)}
        </span>
      </td>
      <td data-label="Prix">${escapeHtml(prix)}</td>
      <td data-label="Date">${escapeHtml(date)}</td>
      <td data-label="Actions">
        <div class="table-actions">
          <a href="./annonce.html?id=${encodeURIComponent(annonce.id)}" class="btn-view" title="Voir">👁️ Voir</a>
          <a href="./annonce.html?edit=${encodeURIComponent(annonce.id)}" class="btn-edit" title="Modifier">✏️ Modifier</a>
          <button class="btn-delete" data-id="${escapeHtml(annonce.id)}" title="Supprimer">🗑️ Supprimer</button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Attache les écouteurs d'événements aux boutons d'action des annonces.
 * Gère les clics sur "Supprimer" dans le tableau.
 */
function initAnnonceActions() {
  // Délégation d'événements sur le tableau pour gérer les boutons "Supprimer"
  const tableBody = document.getElementById('annoncesTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        demanderSuppression(id);
      }
    });
  }
}

/**
 * Demande confirmation avant de supprimer une annonce,
 * puis la supprime et rafraîchit la liste.
 * 
 * @param {string} id - ID de l'annonce à supprimer
 */
function demanderSuppression(id) {
  showConfirmModal(
    'Supprimer l\'annonce',
    'Cette action est irréversible. Voulez-vous vraiment supprimer cette annonce ?',
    () => {
      const ok = supprimerAnnonce(id);
      if (ok) {
        showToast('Annonce supprimée avec succès.', 'success');
        const user = getCurrentUser();
        if (user) {
          afficherMesAnnonces(user);
          afficherStatsDashboard(user);
        }
      } else {
        showToast('Erreur : annonce introuvable.', 'error');
      }
    },
    'Supprimer définitivement'
  );
}


// ============================================================
// NAVIGATION PAR ONGLETS/SECTIONS
// ============================================================

/**
 * Initialise la navigation entre les sections du dashboard.
 * Gère les clics sur les liens de la sidebar et des onglets mobiles.
 */
function initDashboardNav() {
  // Récupérer la section active depuis l'URL (#section)
  const hash = window.location.hash.replace('#', '') || 'vue-ensemble';

  // Activer la section correspondante
  activerSection(hash);

  // Écouter les clics sur les liens de navigation
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      activerSection(section);
      // Mettre à jour l'URL sans recharger
      history.pushState(null, '', `#${section}`);
    });
  });

  // Écouter les changements de hash (navigation retour/avant)
  window.addEventListener('hashchange', () => {
    const section = window.location.hash.replace('#', '') || 'vue-ensemble';
    activerSection(section);
  });
}

/**
 * Active une section du dashboard et désactive les autres.
 * 
 * @param {string} sectionId - ID de la section à afficher
 */
function activerSection(sectionId) {
  // Cacher toutes les sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });

  // Désactiver tous les liens de nav
  document.querySelectorAll('[data-section]').forEach(link => {
    link.classList.remove('active');
  });

  // Afficher la section demandée
  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  } else {
    // Fallback sur la vue d'ensemble
    const defaultSection = document.getElementById('section-vue-ensemble');
    if (defaultSection) defaultSection.classList.add('active');
    sectionId = 'vue-ensemble';
  }

  // Marquer les liens correspondants comme actifs
  document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(link => {
    link.classList.add('active');
  });
}


// ============================================================
// INITIALISATION AU CHARGEMENT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();
  if (page === 'dashboard.html') {
    initDashboard();
  }
});
