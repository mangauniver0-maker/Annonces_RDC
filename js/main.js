/**
 * main.js — Fonctions utilitaires partagées
 * ============================================================
 * Ce fichier contient toutes les fonctions réutilisables
 * sur toutes les pages du site :
 * - Initialisation de la navbar
 * - Système de notifications (toasts)
 * - Modales de confirmation
 * - Formatage des dates et des prix
 * - Gestion du localStorage
 * - Validation de formulaires
 * - Génération d'IDs uniques
 * 
 * IMPORTANT : Ce fichier doit être chargé en premier,
 * avant les autres scripts JS de la page.
 * ============================================================
 */


// ============================================================
// CONSTANTES ET CONFIGURATION
// ============================================================

/** Clés utilisées dans le localStorage pour stocker les données */
const STORAGE_KEYS = {
  USERS: 'annonces_rdc_users',          // Tableau des utilisateurs inscrits
  CURRENT_USER: 'annonces_rdc_current_user',  // Utilisateur connecté actuellement
  ANNONCES: 'annonces_rdc_annonces',    // Tableau de toutes les annonces
};

/**
 * Catégories d'annonces disponibles.
 * La plateforme est strictement limitée à ces 3 catégories :
 * cours, stages et jobs étudiants.
 */
const CATEGORIES = [
  { id: 'cours', label: 'Cours & Tutorat', icon: '📚' },
  { id: 'stage', label: 'Stages',          icon: '🎓' },
  { id: 'job',   label: 'Jobs étudiants',  icon: '💼' },
];

/** Liste des universités en RDC */
const UNIVERSITES = [
  'Université de Kinshasa (UNIKIN)',
  'Université de Lubumbashi (UNILU)',
  'Université de Kisangani (UNIKIS)',
  'Université Pédagogique Nationale (UPN)',
  'Université Catholique du Congo (UCC)',
  'Université Protestante au Congo (UPC)',
  'Institut Supérieur de Commerce (ISC)',
  "Institut Supérieur des Techniques Médicales (ISTM)",
  'Université Kongo (UK)',
  'Université de Mbuji-Mayi',
  'Université de Goma (UNIGOM)',
  'Université Officielle de Bukavu (UOB)',
  'Institut Supérieur des Techniques Appliquées (ISTA)',
  'Autre université',
];


// ============================================================
// INITIALISATION DE LA NAVBAR
// Gère le menu hamburger sur mobile et l'état actif des liens
// ============================================================

/**
 * Initialise la barre de navigation.
 * - Active le lien correspondant à la page courante
 * - Gère l'ouverture/fermeture du menu mobile
 * - Affiche le nom de l'utilisateur connecté si applicable
 */
function initNavbar() {
  // Marquer le lien actif selon la page courante
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPage.includes(href.replace('./', ''))) {
      link.classList.add('active');
    }
  });

  // Menu hamburger — ouvre/ferme le menu mobile
  const toggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      // Alterne entre ouvert et fermé
      const isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !isOpen);
      
      // Animation des barres du hamburger
      toggle.classList.toggle('active', !isOpen);
    });

    // Ferme le menu quand on clique en dehors
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        toggle.classList.remove('active');
      }
    });
  }

  // Adapter la navbar selon l'état de connexion
  updateNavbarAuth();
}

/**
 * Met à jour la navbar selon si l'utilisateur est connecté ou non.
 * Affiche "Tableau de bord" au lieu de "Connexion" si connecté.
 */
function updateNavbarAuth() {
  const user = getCurrentUser();
  const authButtons = document.getElementById('navAuthButtons');
  const userMenu = document.getElementById('navUserMenu');
  
  if (authButtons && userMenu) {
    if (user) {
      // Utilisateur connecté
      authButtons.classList.add('hidden');
      userMenu.classList.remove('hidden');
      
      // Affiche les initiales de l'utilisateur
      const avatarEl = document.getElementById('navAvatar');
      const nameEl = document.getElementById('navUserName');
      if (avatarEl) avatarEl.textContent = getInitials(user.prenom, user.nom);
      if (nameEl) nameEl.textContent = user.prenom;
    } else {
      // Non connecté
      authButtons.classList.remove('hidden');
      userMenu.classList.add('hidden');
    }
  }
}


// ============================================================
// SYSTÈME DE NOTIFICATIONS (TOASTS)
// Affiche des messages temporaires en bas à droite de l'écran
// ============================================================

/**
 * Affiche une notification temporaire (toast).
 * 
 * @param {string} message - Le texte à afficher
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {number} duration - Durée en ms avant disparition (défaut: 3500)
 */
function showToast(message, type = 'info', duration = 3500) {
  // Créer le conteneur s'il n'existe pas
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Icônes selon le type de notification
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  // Créer l'élément toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  // Ajouter au conteneur
  container.appendChild(toast);

  // Supprimer automatiquement après la durée
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


// ============================================================
// MODALES
// Boîtes de dialogue modales réutilisables
// ============================================================

/**
 * Affiche une modale de confirmation avant une action destructive.
 * 
 * @param {string} title - Titre de la modale
 * @param {string} message - Message de confirmation
 * @param {Function} onConfirm - Callback si l'utilisateur confirme
 * @param {string} confirmLabel - Texte du bouton de confirmation
 */
function showConfirmModal(title, message, onConfirm, confirmLabel = 'Confirmer') {
  // Supprimer une éventuelle modale existante
  const existing = document.getElementById('confirmModalOverlay');
  if (existing) existing.remove();

  // Créer la modale
  const overlay = document.createElement('div');
  overlay.id = 'confirmModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal confirm-modal" style="max-width:400px; text-align:center;">
      <div class="modal-icon">⚠️</div>
      <div class="modal-title">${title}</div>
      <div class="modal-desc">${message}</div>
      <div class="modal-actions" style="display:flex;gap:12px;justify-content:center;">
        <button class="btn btn-ghost" id="cancelModalBtn">Annuler</button>
        <button class="btn btn-danger" id="confirmModalBtn">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Fermer sur "Annuler"
  document.getElementById('cancelModalBtn').addEventListener('click', () => {
    overlay.remove();
  });

  // Exécuter l'action sur "Confirmer"
  document.getElementById('confirmModalBtn').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });

  // Fermer en cliquant sur l'overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}


// ============================================================
// FORMATAGE
// Fonctions pour formater les données à afficher
// ============================================================

/**
 * Formate un prix en francs congolais ou autre devise.
 * Retourne "Gratuit" si le prix est 0 ou null.
 * 
 * @param {number|string} prix - Le prix à formater
 * @param {string} devise - La devise (défaut: 'FC')
 * @returns {string} Le prix formaté
 */
function formatPrix(prix, devise = 'FC') {
  if (!prix || prix === 0 || prix === '0') return 'Gratuit';
  const num = parseFloat(prix);
  if (isNaN(num)) return 'À discuter';
  // Format avec séparateurs de milliers
  return new Intl.NumberFormat('fr-CD').format(num) + ' ' + devise;
}

/**
 * Formate une date en texte relatif ("il y a 2 jours") ou absolu.
 * 
 * @param {string|number} dateInput - Date ISO ou timestamp
 * @returns {string} La date formatée
 */
function formatDate(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Date inconnue';

  const now = new Date();
  const diff = now - date;           // Différence en millisecondes
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  // Temps relatif pour les dates récentes
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;

  // Date complète pour les dates plus anciennes
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: days > 365 ? 'numeric' : undefined,
  });
}

/**
 * Retourne les initiales d'un nom (prénom + nom).
 * Ex: "Jean-Pierre Kabila" → "JK"
 * 
 * @param {string} prenom
 * @param {string} nom
 * @returns {string}
 */
function getInitials(prenom, nom) {
  const p = (prenom || '').charAt(0).toUpperCase();
  const n = (nom || '').charAt(0).toUpperCase();
  return p + n || '?';
}

/**
 * Tronque un texte à la longueur spécifiée.
 * 
 * @param {string} text - Le texte à tronquer
 * @param {number} maxLength - Longueur maximale
 * @returns {string}
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength).trim() + '…';
}

/**
 * Échappe les caractères HTML pour prévenir les injections XSS.
 * TOUJOURS utiliser cette fonction avant d'insérer du texte utilisateur dans le DOM.
 * 
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}

/**
 * Retourne les données d'une catégorie par son ID.
 * 
 * @param {string} categoryId
 * @returns {Object}
 */
function getCategoryInfo(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || { id: categoryId, label: categoryId, icon: '📌' };
}


// ============================================================
// GESTION DU LOCALSTORAGE
// Fonctions centralisées pour lire/écrire dans le localStorage
// ============================================================

/**
 * Lit et parse une valeur JSON depuis le localStorage.
 * Retourne une valeur par défaut en cas d'erreur.
 * 
 * @param {string} key - La clé localStorage
 * @param {*} defaultValue - Valeur par défaut si la clé n'existe pas
 * @returns {*}
 */
function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Erreur lecture localStorage "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Sérialise et sauvegarde une valeur dans le localStorage.
 * 
 * @param {string} key - La clé localStorage
 * @param {*} value - La valeur à sauvegarder
 * @returns {boolean} true si succès, false sinon
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Erreur écriture localStorage "${key}":`, error);
    return false;
  }
}

/**
 * Récupère l'utilisateur actuellement connecté.
 * Retourne null si personne n'est connecté.
 * 
 * @returns {Object|null}
 */
function getCurrentUser() {
  return getFromStorage(STORAGE_KEYS.CURRENT_USER, null);
}

/**
 * Récupère tous les utilisateurs inscrits.
 * 
 * @returns {Array}
 */
function getAllUsers() {
  return getFromStorage(STORAGE_KEYS.USERS, []);
}

/**
 * Récupère toutes les annonces publiées.
 * 
 * @returns {Array}
 */
function getAllAnnonces() {
  return getFromStorage(STORAGE_KEYS.ANNONCES, []);
}

/**
 * Sauvegarde le tableau des annonces dans le localStorage.
 * 
 * @param {Array} annonces
 */
function saveAnnonces(annonces) {
  saveToStorage(STORAGE_KEYS.ANNONCES, annonces);
}


// ============================================================
// VALIDATION DE FORMULAIRES
// Fonctions pour valider les données avant soumission
// ============================================================

/**
 * Affiche un message d'erreur sous un champ de formulaire.
 * 
 * @param {HTMLElement} input - L'élément input en erreur
 * @param {string} message - Le message d'erreur à afficher
 */
function showFieldError(input, message) {
  // Ajouter la classe d'erreur sur le champ
  input.classList.add('is-error');
  input.classList.remove('is-success');

  // Trouver ou créer l'élément d'erreur
  let errorEl = input.parentElement.querySelector('.form-error');
  if (!errorEl) {
    // Si l'input est dans un wrapper (ex: input-icon-wrapper)
    let parent = input.closest('.form-group') || input.parentElement;
    errorEl = parent.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      input.parentElement.appendChild(errorEl);
    }
  }
  errorEl.textContent = message;
}

/**
 * Marque un champ de formulaire comme valide.
 * 
 * @param {HTMLElement} input
 */
function showFieldSuccess(input) {
  input.classList.remove('is-error');
  input.classList.add('is-success');

  // Supprimer le message d'erreur s'il existe
  const parent = input.closest('.form-group') || input.parentElement;
  const errorEl = parent.querySelector('.form-error');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Remet un champ dans son état neutre (ni erreur ni succès).
 * 
 * @param {HTMLElement} input
 */
function clearFieldState(input) {
  input.classList.remove('is-error', 'is-success');
  const parent = input.closest('.form-group') || input.parentElement;
  const errorEl = parent.querySelector('.form-error');
  if (errorEl) errorEl.textContent = '';
}

/**
 * Valide qu'un champ n'est pas vide.
 * 
 * @param {HTMLElement} input
 * @param {string} fieldName - Nom du champ pour le message d'erreur
 * @returns {boolean}
 */
function validateRequired(input, fieldName) {
  const value = input.value.trim();
  if (!value) {
    showFieldError(input, `${fieldName} est obligatoire.`);
    return false;
  }
  showFieldSuccess(input);
  return true;
}

/**
 * Valide qu'un champ contient une adresse email valide.
 * 
 * @param {HTMLElement} input
 * @returns {boolean}
 */
function validateEmail(input) {
  const value = input.value.trim();
  if (!value) {
    showFieldError(input, "L'adresse email est obligatoire.");
    return false;
  }
  // Regex simple pour valider le format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    showFieldError(input, "Veuillez entrer une adresse email valide.");
    return false;
  }
  showFieldSuccess(input);
  return true;
}

/**
 * Valide la force d'un mot de passe.
 * Minimum 6 caractères.
 * 
 * @param {HTMLElement} input
 * @returns {boolean}
 */
function validatePassword(input) {
  const value = input.value;
  if (!value) {
    showFieldError(input, "Le mot de passe est obligatoire.");
    return false;
  }
  if (value.length < 6) {
    showFieldError(input, "Le mot de passe doit contenir au moins 6 caractères.");
    return false;
  }
  showFieldSuccess(input);
  return true;
}

/**
 * Calcule la force d'un mot de passe.
 * Retourne: 'weak' | 'fair' | 'good' | 'strong'
 * 
 * @param {string} password
 * @returns {string}
 */
function getPasswordStrength(password) {
  if (!password || password.length < 4) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;        // Longueur suffisante
  if (/[A-Z]/.test(password)) score++;      // Majuscule
  if (/[0-9]/.test(password)) score++;      // Chiffre
  if (/[^A-Za-z0-9]/.test(password)) score++;  // Caractère spécial

  if (score === 4) return 'strong';
  if (score === 3) return 'good';
  if (score === 2) return 'fair';
  return 'weak';
}


// ============================================================
// GÉNÉRATION D'IDENTIFIANTS UNIQUES
// ============================================================

/**
 * Génère un identifiant unique basé sur le timestamp et un aléatoire.
 * Ex: "ann_1672531200000_abc123"
 * 
 * @param {string} prefix - Préfixe pour l'ID ('usr', 'ann', etc.)
 * @returns {string}
 */
function generateId(prefix = 'id') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}


// ============================================================
// PROTECTION DES PAGES
// Redirige vers la connexion si l'utilisateur n'est pas connecté
// ============================================================

/**
 * Vérifie que l'utilisateur est connecté.
 * Si non, redirige vers la page de connexion.
 * À appeler au début des pages protégées (dashboard, profil).
 */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    // Sauvegarder la page actuelle pour y revenir après connexion
    sessionStorage.setItem('redirect_after_login', window.location.pathname);
    window.location.href = './login.html';
    return null;
  }
  return user;
}

/**
 * Redirige vers le dashboard si l'utilisateur est déjà connecté.
 * À appeler sur les pages login et register.
 */
function redirectIfAuthenticated() {
  const user = getCurrentUser();
  if (user) {
    window.location.href = './dashboard.html';
  }
}


// ============================================================
// DONNÉES DE DÉMONSTRATION
// Crée des données initiales pour que le site ne soit pas vide
// ============================================================

/**
 * Version des données de démonstration.
 * Changer cette valeur force la réinitialisation des données demo.
 * Cela garantit que les nouvelles catégories (cours/stage/job)
 * remplacent les anciennes données de l'ancienne version.
 */
const DEMO_DATA_VERSION = 'v2-trois-categories';

/**
 * Initialise des données de démonstration si elles n'existent pas encore,
 * ou si la version a changé (nouvelles catégories, etc.)
 * Crée 3 utilisateurs fictifs et 6 annonces d'exemple.
 * 
 * À appeler UNE SEULE FOIS au premier chargement du site.
 */
function initDemoData() {
  // Vérifier si la version actuelle des données est à jour
  const storedVersion = localStorage.getItem('annonces_rdc_data_version');
  if (storedVersion === DEMO_DATA_VERSION) return;  // Données déjà à jour

  // Version obsolète ou première visite : réinitialiser toutes les données demo
  console.log('Réinitialisation des données de démonstration (version ' + DEMO_DATA_VERSION + ')…');
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.ANNONCES);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

  console.log('Initialisation des données de démonstration...');

  // Créer des utilisateurs de démonstration
  const demoUsers = [
    {
      id: 'usr_demo_001',
      prenom: 'Jean-Pierre',
      nom: 'Kabila',
      email: 'jp.kabila@demo.cd',
      password: 'demo1234',    // NOTE: En production, les mots de passe seraient hachés
      universite: 'Université de Kinshasa (UNIKIN)',
      annee: '3',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),  // Il y a 30 jours
    },
    {
      id: 'usr_demo_002',
      prenom: 'Marie',
      nom: 'Nzuzi',
      email: 'marie.nzuzi@demo.cd',
      password: 'demo1234',
      universite: 'Université Catholique du Congo (UCC)',
      annee: '2',
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),  // Il y a 15 jours
    },
    {
      id: 'usr_demo_003',
      prenom: 'Patrick',
      nom: 'Mutombo',
      email: 'p.mutombo@demo.cd',
      password: 'demo1234',
      universite: 'Université de Lubumbashi (UNILU)',
      annee: '4',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];

  // Créer des annonces de démonstration
  // Uniquement les 3 catégories autorisées : cours, stage, job
  const demoAnnonces = [
    {
      id: 'ann_demo_001',
      titre: 'Cours particuliers de Mathématiques – Licence 1 & 2',
      description: 'Étudiant en 4ème année de Mathématiques Appliquées, je propose des cours particuliers pour les étudiants de L1 et L2. Spécialités : Algèbre linéaire, Analyse mathématique, Probabilités & Statistiques. Méthode pédagogique claire et adaptée à chaque étudiant. Disponible en semaine et le weekend.',
      categorie: 'cours',
      prix: 5000,
      devise: 'FC',
      contact: '+243 81 234 5678',
      auteurId: 'usr_demo_001',
      auteurPrenom: 'Jean-Pierre',
      auteurNom: 'Kabila',
      auteurUniversite: 'Université de Kinshasa (UNIKIN)',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'ann_demo_002',
      titre: 'Cours de Français et Rédaction académique – tous niveaux',
      description: 'Étudiante en Lettres modernes, je donne des cours de français (grammaire, orthographe, rédaction de dissertations et de mémoires). Idéal pour les étudiants qui veulent améliorer leur expression écrite avant les examens ou pour la rédaction de leur TFE. Sessions individuelles ou en petit groupe (max 3).',
      categorie: 'cours',
      prix: 3500,
      devise: 'FC',
      contact: '+243 99 876 5432',
      auteurId: 'usr_demo_002',
      auteurPrenom: 'Marie',
      auteurNom: 'Nzuzi',
      auteurUniversite: 'Université Catholique du Congo (UCC)',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'ann_demo_003',
      titre: 'Stage en comptabilité recherché – Licence 3 Finance',
      description: 'Étudiant en 3ème année de Sciences Commerciales et Financières, je recherche un stage de 3 mois (juin–août) dans une entreprise ou cabinet comptable de Kinshasa. Maîtrise de Microsoft Excel, notions de Sage Comptabilité. Sérieux, ponctuel, motivé et prêt à apprendre. CV disponible sur demande.',
      categorie: 'stage',
      prix: 0,
      devise: 'FC',
      contact: 'etudiant.finance2024@gmail.com',
      auteurId: 'usr_demo_003',
      auteurPrenom: 'Patrick',
      auteurNom: 'Mutombo',
      auteurUniversite: 'Université de Lubumbashi (UNILU)',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'ann_demo_004',
      titre: 'Offre de stage en développement web – 2 mois – Kinshasa',
      description: 'Startup tech de Kinshasa cherche un(e) stagiaire en développement web (HTML, CSS, JavaScript) pour une durée de 2 mois renouvelable. Missions : création de pages web, maintenance du site de l\'entreprise, intégration de maquettes. Indemnité de stage prévue. Postulez en envoyant votre CV.',
      categorie: 'stage',
      prix: 0,
      devise: 'FC',
      contact: 'recrutement@techkongo.cd',
      auteurId: 'usr_demo_001',
      auteurPrenom: 'Jean-Pierre',
      auteurNom: 'Kabila',
      auteurUniversite: 'Université de Kinshasa (UNIKIN)',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'ann_demo_005',
      titre: 'Job : Saisie de données – travail à domicile – temps partiel',
      description: 'Entreprise de gestion de bases de données recherche des étudiants pour de la saisie de données en télétravail. Travail flexible, compatible avec les horaires universitaires. Rémunération : 8 000 FC/jour de travail. Matériel requis : ordinateur et connexion internet. Formation incluse au démarrage.',
      categorie: 'job',
      prix: 8000,
      devise: 'FC',
      contact: 'jobs.etudiant.kn@gmail.com',
      auteurId: 'usr_demo_002',
      auteurPrenom: 'Marie',
      auteurNom: 'Nzuzi',
      auteurUniversite: 'Université Catholique du Congo (UCC)',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'ann_demo_006',
      titre: 'Job étudiant : Vendeur/Vendeuse week-end – Marché Rond-Point Victoire',
      description: 'Cherche étudiant(e) sérieux(se) pour tenir un stand de vente de produits cosmétiques les samedis et dimanches. Horaires : 8h–17h. Expérience en vente appréciée mais non obligatoire. Formation sur les produits assurée. Rémunération fixe + commission sur ventes. Ambiance de travail agréable.',
      categorie: 'job',
      prix: 15000,
      devise: 'FC',
      contact: '+243 84 567 8901',
      auteurId: 'usr_demo_003',
      auteurPrenom: 'Patrick',
      auteurNom: 'Mutombo',
      auteurUniversite: 'Université de Lubumbashi (UNILU)',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
  ];

  // Sauvegarder dans le localStorage
  saveToStorage(STORAGE_KEYS.USERS, demoUsers);
  saveToStorage(STORAGE_KEYS.ANNONCES, demoAnnonces);

  // Marquer la version pour éviter la réinitialisation au prochain chargement
  localStorage.setItem('annonces_rdc_data_version', DEMO_DATA_VERSION);

  console.log(`✅ ${demoUsers.length} utilisateurs et ${demoAnnonces.length} annonces créés (${DEMO_DATA_VERSION}).`);
}


// ============================================================
// RENDU D'UNE CARTE D'ANNONCE
// Génère le HTML d'une carte d'annonce réutilisable
// ============================================================

/**
 * Génère le HTML complet d'une carte d'annonce.
 * 
 * @param {Object} annonce - L'objet annonce
 * @param {boolean} showActions - Afficher les boutons modifier/supprimer
 * @returns {string} HTML de la carte
 */
function renderAnnonceCard(annonce, showActions = false) {
  const cat = getCategoryInfo(annonce.categorie);
  const initials = getInitials(annonce.auteurPrenom, annonce.auteurNom);
  const prix = formatPrix(annonce.prix, annonce.devise);
  const date = formatDate(annonce.createdAt);
  const isPrixGratuit = !annonce.prix || annonce.prix === 0;

  // Boutons d'action pour le propriétaire de l'annonce
  const actionButtons = showActions ? `
    <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #f1f3f5;">
      <a href="./annonce.html?edit=${annonce.id}" class="btn-edit" title="Modifier">✏️ Modifier</a>
      <button class="btn-delete" data-id="${annonce.id}" title="Supprimer">🗑️ Supprimer</button>
    </div>
  ` : '';

  return `
    <div class="annonce-card animate-slideUp" data-id="${escapeHtml(annonce.id)}">
      <div class="annonce-card-header">
        <span class="badge-categorie badge-${escapeHtml(annonce.categorie)}">
          ${cat.icon} ${escapeHtml(cat.label)}
        </span>
      </div>
      <div class="annonce-card-body">
        <div class="annonce-title">${escapeHtml(annonce.titre)}</div>
        <div class="annonce-desc">${escapeHtml(annonce.description)}</div>
        <div class="annonce-price ${isPrixGratuit ? 'gratuit' : ''}">${escapeHtml(prix)}</div>
        ${actionButtons}
      </div>
      <div class="annonce-card-footer">
        <div class="annonce-author">
          <div class="author-avatar">${escapeHtml(initials)}</div>
          <div class="author-info">
            <div class="author-name">${escapeHtml(annonce.auteurPrenom + ' ' + annonce.auteurNom)}</div>
            <div class="author-university">${escapeHtml(truncate(annonce.auteurUniversite, 30))}</div>
          </div>
        </div>
        <div class="annonce-date">${escapeHtml(date)}</div>
      </div>
    </div>
  `;
}


// ============================================================
// DÉCONNEXION
// ============================================================

/**
 * Déconnecte l'utilisateur et redirige vers l'accueil.
 * Supprime uniquement la session, pas les données.
 */
function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  showToast('Vous avez été déconnecté avec succès.', 'info');
  setTimeout(() => {
    window.location.href = './index.html';
  }, 800);
}


// ============================================================
// INITIALISATION AUTOMATIQUE AU CHARGEMENT
// Ces actions sont exécutées dès que la page est prête
// ============================================================

// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialiser les données de démonstration (si première visite)
  initDemoData();

  // 2. Initialiser la navbar
  initNavbar();

  // 3. Connecter le bouton de déconnexion (s'il existe sur la page)
  const logoutBtns = document.querySelectorAll('[data-action="logout"]');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirmModal(
        'Se déconnecter',
        'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?',
        logout,
        'Se déconnecter'
      );
    });
  });
});
