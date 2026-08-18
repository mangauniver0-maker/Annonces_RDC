/**
 * annonces.js — Gestion des annonces
 * ============================================================
 * Ce fichier gère tout ce qui concerne les annonces :
 * - Affichage de la liste sur la page d'accueil
 * - Filtrage par catégorie, texte, université
 * - Publication d'une nouvelle annonce
 * - Modification d'une annonce existante
 * - Suppression d'une annonce
 * - Affichage du détail d'une annonce
 * 
 * Dépendances : main.js (doit être chargé avant ce fichier)
 * ============================================================
 */


// ============================================================
// PAGE D'ACCUEIL — Liste des annonces avec filtres
// Gère index.html
// ============================================================

/** État courant des filtres de recherche */
let filtreEtat = {
  recherche: '',
  categorie: '',
  tri: 'recent',   // 'recent' | 'ancien' | 'prix_asc' | 'prix_desc'
};

/**
 * Initialise la page d'accueil avec les annonces et les filtres.
 */
async function initAccueil() {
  try {
    await loadAnnonces();
  } catch (error) {
    showToast(`Impossible de charger les annonces : ${error.message}`, 'error');
  }
  // Afficher les annonces
  afficherAnnonces();

  // Mettre à jour le compteur de catégories
  updateCategoryCount();

  // Connecter la barre de recherche dans le hero
  const heroSearchInput = document.getElementById('heroSearchInput');
  const heroSearchBtn = document.getElementById('heroSearchBtn');

  if (heroSearchInput && heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      filtreEtat.recherche = heroSearchInput.value.trim();
      afficherAnnonces();
      // Scroller vers la section des annonces
      document.getElementById('annoncesSection')?.scrollIntoView({ behavior: 'smooth' });
    });

    heroSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });
  }

  // Connecter les filtres
  const filtreRechercheInput = document.getElementById('filtreRecherche');
  const filtreCategorieSelect = document.getElementById('filtreCategorie');
  const filtreTriSelect = document.getElementById('filtreTri');

  if (filtreRechercheInput) {
    filtreRechercheInput.addEventListener('input', () => {
      filtreEtat.recherche = filtreRechercheInput.value.trim();
      afficherAnnonces();
    });
  }

  if (filtreCategorieSelect) {
    filtreCategorieSelect.addEventListener('change', () => {
      filtreEtat.categorie = filtreCategorieSelect.value;
      afficherAnnonces();
    });
  }

  if (filtreTriSelect) {
    filtreTriSelect.addEventListener('change', () => {
      filtreEtat.tri = filtreTriSelect.value;
      afficherAnnonces();
    });
  }

  // Clic sur une catégorie de la section catégories
  document.querySelectorAll('[data-categorie]').forEach(el => {
    el.addEventListener('click', (e) => {
      const cat = e.currentTarget.dataset.categorie;
      filtreEtat.categorie = cat;

      // Mettre à jour le select de filtre
      if (filtreCategorieSelect) {
        filtreCategorieSelect.value = cat;
      }

      afficherAnnonces();
      document.getElementById('annoncesSection')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/**
 * Filtre et trie les annonces selon l'état courant des filtres,
 * puis les affiche dans la grille.
 */
async function afficherAnnonces() {
  if (annoncesCache === null) {
    try { await loadAnnonces(); } catch (error) { console.error(error); }
  }
  const annonces = getAllAnnonces();
  const container = document.getElementById('annoncesGrid');
  if (!container) return;

  // --- Filtrage ---
  let filtered = annonces.filter(a => {
    // Filtre par texte de recherche
    if (filtreEtat.recherche) {
      const q = filtreEtat.recherche.toLowerCase();
      const matchTitre = a.titre.toLowerCase().includes(q);
      const matchDesc = a.description.toLowerCase().includes(q);
      const matchUniv = (a.auteurUniversite || '').toLowerCase().includes(q);
      if (!matchTitre && !matchDesc && !matchUniv) return false;
    }

    // Filtre par catégorie
    if (filtreEtat.categorie && a.categorie !== filtreEtat.categorie) {
      return false;
    }

    return true;
  });

  // --- Tri ---
  filtered.sort((a, b) => {
    switch (filtreEtat.tri) {
      case 'recent':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'ancien':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'prix_asc':
        return (parseFloat(a.prix) || 0) - (parseFloat(b.prix) || 0);
      case 'prix_desc':
        return (parseFloat(b.prix) || 0) - (parseFloat(a.prix) || 0);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  // --- Affichage ---
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">🔍</div>
        <h3>Aucune annonce trouvée</h3>
        <p>Aucune annonce ne correspond à votre recherche.<br>Essayez d'autres mots-clés ou supprimez les filtres.</p>
        <button class="btn btn-outline" onclick="resetFiltres()">Réinitialiser les filtres</button>
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(a => renderAnnonceCard(a)).join('');

    // Ajouter les listeners sur les cartes pour ouvrir le détail
    container.querySelectorAll('.annonce-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        window.location.href = `./annonce.html?id=${id}`;
      });
    });
  }

  // Mettre à jour le compteur
  const countEl = document.getElementById('annoncesCount');
  if (countEl) {
    countEl.textContent = `${filtered.length} annonce${filtered.length > 1 ? 's' : ''} trouvée${filtered.length > 1 ? 's' : ''}`;
  }
}

/**
 * Remet à zéro tous les filtres et ré-affiche toutes les annonces.
 */
function resetFiltres() {
  filtreEtat = { recherche: '', categorie: '', tri: 'recent' };

  const inputs = {
    filtreRecherche: '',
    filtreCategorie: '',
    filtreTri: 'recent',
  };

  Object.entries(inputs).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  afficherAnnonces();
}

/**
 * Met à jour le compteur d'annonces affiché sur chaque carte de catégorie.
 */
async function updateCategoryCount() {
  if (annoncesCache === null) {
    try { await loadAnnonces(); } catch (error) { console.error(error); }
  }
  const annonces = getAllAnnonces();

  CATEGORIES.forEach(cat => {
    const count = annonces.filter(a => a.categorie === cat.id).length;
    const el = document.querySelector(`[data-categorie-count="${cat.id}"]`);
    if (el) el.textContent = count;
  });
}


// ============================================================
// PAGE DÉTAIL D'UNE ANNONCE
// Gère annonce.html en mode consultation (paramètre ?id=...)
// ============================================================

/**
 * Affiche le détail d'une annonce.
 * Lit l'ID depuis l'URL (?id=ann_xxx).
 */
async function afficherDetailAnnonce() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const container = document.getElementById('annonceDetail');
  if (!container) return;

  if (!id) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><h3>Annonce introuvable</h3><p>Aucun identifiant d\'annonce fourni.</p><a href="./index.html" class="btn btn-primary">Retour à l\'accueil</a></div>';
    return;
  }

  if (annoncesCache === null) {
    try { await loadAnnonces(); } catch (error) {
      container.innerHTML = `<div class="empty-state"><h3>Service indisponible</h3><p>${escapeHtml(error.message)}</p></div>`;
      return;
    }
  }
  const annonces = getAllAnnonces();
  const annonce = annonces.find(a => a.id === id);

  if (!annonce) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><h3>Annonce introuvable</h3><p>Cette annonce n\'existe pas ou a été supprimée.</p><a href="./index.html" class="btn btn-primary">Retour à l\'accueil</a></div>';
    return;
  }

  const cat = getCategoryInfo(annonce.categorie);
  const initials = getInitials(annonce.auteurPrenom, annonce.auteurNom);
  const prix = formatPrix(annonce.prix, annonce.devise);
  const date = formatDate(annonce.createdAt);
  const user = getCurrentUser();

  // Boutons d'action si l'utilisateur est le propriétaire
  const isOwner = user && user.id === annonce.auteurId;
  const ownerActions = isOwner ? `
    <div style="display:flex;gap:12px;margin-top:24px;">
      <a href="./annonce.html?edit=${annonce.id}" class="btn btn-outline">✏️ Modifier</a>
      <button class="btn btn-danger" onclick="supprimerAnnonceEtRediriger('${annonce.id}')">🗑️ Supprimer</button>
    </div>
  ` : '';

  document.title = `${annonce.titre} — AnnonceRDC`;

  container.innerHTML = `
    <div class="annonce-detail-card">
      <div class="annonce-detail-header">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px;">
          <span class="badge-categorie badge-${escapeHtml(annonce.categorie)}" style="font-size:0.875rem;padding:6px 14px;">
            ${cat.icon} ${escapeHtml(cat.label)}
          </span>
          <span style="font-size:0.8125rem;color:var(--gray-500);">${escapeHtml(date)}</span>
        </div>
        <h1 style="font-size:1.75rem;font-weight:800;color:var(--gray-900);margin-bottom:12px;line-height:1.3;">
          ${escapeHtml(annonce.titre)}
        </h1>
        <div style="font-size:2rem;font-weight:900;color:${annonce.prix ? 'var(--primary)' : 'var(--success)'};">
          ${escapeHtml(prix)}
        </div>
        ${ownerActions}
      </div>
      <div class="annonce-detail-body">
        <h3 style="font-size:1rem;font-weight:700;color:var(--gray-700);margin-bottom:12px;">Description</h3>
        <div style="font-size:1rem;line-height:1.8;color:var(--gray-700);white-space:pre-wrap;">${escapeHtml(annonce.description)}</div>
        
        <div class="annonce-detail-meta">
          <div class="meta-item">
            <span class="meta-label">Catégorie</span>
            <span class="meta-value">${cat.icon} ${escapeHtml(cat.label)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Prix</span>
            <span class="meta-value">${escapeHtml(prix)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Publié le</span>
            <span class="meta-value">${escapeHtml(date)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Université</span>
            <span class="meta-value">${escapeHtml(annonce.auteurUniversite || 'Non précisée')}</span>
          </div>
        </div>

        <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-lg);padding:20px;margin-top:24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div class="author-avatar" style="width:48px;height:48px;font-size:1.125rem;">${escapeHtml(initials)}</div>
            <div>
              <div style="font-size:1rem;font-weight:700;color:var(--gray-900);">${escapeHtml(annonce.auteurPrenom + ' ' + annonce.auteurNom)}</div>
              <div style="font-size:0.8125rem;color:var(--gray-500);">${escapeHtml(annonce.auteurUniversite || '')}</div>
            </div>
          </div>
          <div class="annonce-contact-box">
            <div class="contact-label">📞 Contacter l'annonceur</div>
            <div class="contact-value">${escapeHtml(annonce.contact)}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Supprime une annonce et redirige vers l'accueil.
 * Utilisé sur la page détail pour le propriétaire.
 * 
 * @param {string} id - ID de l'annonce à supprimer
 */
function supprimerAnnonceEtRediriger(id) {
  showConfirmModal(
    'Supprimer l\'annonce',
    'Cette action est irréversible. L\'annonce sera définitivement supprimée.',
    () => {
      supprimerAnnonce(id);
      showToast('Annonce supprimée avec succès.', 'success');
      setTimeout(() => {
        window.location.href = './dashboard.html';
      }, 800);
    },
    'Supprimer'
  );
}


// ============================================================
// FORMULAIRE DE PUBLICATION / MODIFICATION D'ANNONCE
// Gère annonce.html en mode édition (paramètre ?edit=... ou ?new=1)
// ============================================================

/**
 * Initialise le formulaire de publication/modification d'annonce.
 */
function initPublishForm() {
  const form = document.getElementById('publishForm');
  if (!form) return;

  // Remplir le select des catégories
  populateCategorieSelect();

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');

  if (editId) {
    // Mode modification — pré-remplir les champs
    chargerAnnonceEnEdition(editId);
  }

  form.addEventListener('submit', (e) => handlePublishSubmit(e, editId));

  // Mise à jour en temps réel du compteur de caractères de la description
  const descInput = document.getElementById('description');
  const charCount = document.getElementById('descCharCount');
  if (descInput && charCount) {
    descInput.addEventListener('input', () => {
      charCount.textContent = descInput.value.length;
      if (descInput.value.length > 1000) {
        charCount.style.color = 'var(--accent)';
      } else {
        charCount.style.color = 'var(--gray-400)';
      }
    });
  }
}

/**
 * Remplit le select des catégories du formulaire de publication.
 */
function populateCategorieSelect() {
  const select = document.getElementById('categorie');
  if (!select) return;

  while (select.options.length > 1) select.remove(1);

  CATEGORIES.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.icon} ${cat.label}`;
    select.appendChild(option);
  });
}

/**
 * Charge les données d'une annonce existante dans le formulaire (mode édition).
 * 
 * @param {string} id - ID de l'annonce à éditer
 */
async function chargerAnnonceEnEdition(id) {
  if (annoncesCache === null) {
    try { await loadAnnonces(); } catch (error) { showToast(error.message, 'error'); return; }
  }
  const annonces = getAllAnnonces();
  const annonce = annonces.find(a => a.id === id);
  const user = getCurrentUser();

  if (!annonce) {
    showToast('Annonce introuvable.', 'error');
    return;
  }

  // Vérifier que l'utilisateur est bien le propriétaire
  if (!user || user.id !== annonce.auteurId) {
    showToast('Vous n\'êtes pas autorisé à modifier cette annonce.', 'error');
    setTimeout(() => window.location.href = './dashboard.html', 1000);
    return;
  }

  // Changer le titre du formulaire
  const headerTitle = document.querySelector('.publish-card-header h1');
  if (headerTitle) headerTitle.textContent = 'Modifier l\'annonce';

  const submitBtn = document.getElementById('submitPublishBtn');
  if (submitBtn) submitBtn.textContent = '✅ Enregistrer les modifications';

  // Pré-remplir les champs
  const fields = {
    titre: annonce.titre,
    categorie: annonce.categorie,
    description: annonce.description,
    prix: annonce.prix || '',
    devise: annonce.devise || 'FC',
    contact: annonce.contact,
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  // Mettre à jour le compteur de caractères
  const descInput = document.getElementById('description');
  const charCount = document.getElementById('descCharCount');
  if (descInput && charCount) {
    charCount.textContent = descInput.value.length;
  }
}

/**
 * Gère la soumission du formulaire de publication ou de modification.
 * 
 * @param {Event} e
 * @param {string|null} editId - ID de l'annonce si mode édition
 */
async function handlePublishSubmit(e, editId = null) {
  e.preventDefault();

  const user = requireAuth();   // Vérifier la connexion (redirige si non connecté)
  if (!user) return;

  // Récupérer les champs
  const titreInput = document.getElementById('titre');
  const categorieInput = document.getElementById('categorie');
  const descriptionInput = document.getElementById('description');
  const prixInput = document.getElementById('prix');
  const deviseInput = document.getElementById('devise');
  const contactInput = document.getElementById('contact');
  const submitBtn = document.getElementById('submitPublishBtn');

  // Valider les champs obligatoires
  let isValid = true;
  isValid = validateRequired(titreInput, 'Le titre') && isValid;
  isValid = validateRequired(categorieInput, 'La catégorie') && isValid;
  isValid = validateRequired(descriptionInput, 'La description') && isValid;
  isValid = validateRequired(contactInput, 'Le contact') && isValid;

  // Valider la longueur de la description
  if (descriptionInput.value.length < 20) {
    showFieldError(descriptionInput, 'La description doit contenir au moins 20 caractères.');
    isValid = false;
  }

  if (!isValid) {
    showToast('Veuillez corriger les erreurs dans le formulaire.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enregistrement…';

  try {
    const payload = {
      title: titreInput.value.trim(),
      category: categorieInput.value,
      description: descriptionInput.value.trim(),
      price: parseFloat(prixInput.value) || 0,
      contact: contactInput.value.trim(),
    };
    const data = editId
      ? await apiRequest(`/api/listings/${encodeURIComponent(editId)}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await apiRequest('/api/listings', { method: 'POST', body: JSON.stringify(payload) });
    const saved = normalizeListing(data.listing);
    const annonces = getAllAnnonces().filter(item => item.id !== saved.id);
    annonces.unshift(saved);
    annoncesCache = annonces;
    saveAnnonces(annonces);
    showToast(editId ? 'Annonce modifiée avec succès ! ✅' : 'Annonce publiée avec succès ! 🎉', 'success');
    setTimeout(() => { window.location.href = './dashboard.html'; }, 800);
  } catch (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? '✅ Enregistrer les modifications' : 'Publier l’annonce';
    showToast(error.message, 'error');
  }
}


// ============================================================
// SUPPRESSION D'ANNONCE
// ============================================================

/**
 * Supprime une annonce par son ID.
 * 
 * @param {string} id - ID de l'annonce à supprimer
 * @returns {boolean} true si supprimé, false sinon
 */
async function supprimerAnnonce(id) {
  try {
    await apiRequest(`/api/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    annoncesCache = getAllAnnonces().filter(a => a.id !== id);
    saveAnnonces(annoncesCache);
    return true;
  } catch (error) {
    showToast(error.message, 'error');
    return false;
  }
}


// ============================================================
// INITIALISATION AU CHARGEMENT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();
  const params = new URLSearchParams(window.location.search);

  if (page === 'index.html' || page === '') {
    // Page d'accueil
    initAccueil();
  }

  if (page === 'annonce.html') {
    const editId = params.get('edit');
    const viewId = params.get('id');

    if (viewId) {
      // Mode consultation du détail
      afficherDetailAnnonce();
    } else {
      // Mode publication ou modification (nécessite connexion)
      requireAuth();
      initPublishForm();
    }
  }
});
