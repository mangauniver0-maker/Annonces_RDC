/**
 * auth.js — Gestion de l'authentification
 * ============================================================
 * Ce fichier gère toutes les opérations liées aux comptes :
 * - Inscription d'un nouvel étudiant
 * - Connexion avec email + mot de passe
 * - Déconnexion
 * - Validation des formulaires d'auth
 * - Indicateur de force du mot de passe
 * 
 * Les données sont stockées dans le localStorage.
 * NOTE : En production réelle, les mots de passe seraient
 * hachés côté serveur. Ici c'est une simulation.
 * ============================================================
 * 
 * Dépendances : main.js (doit être chargé avant ce fichier)
 */


// ============================================================
// FORMULAIRE DE CONNEXION
// Gère la page login.html
// ============================================================

/**
 * Initialise le formulaire de connexion.
 * Appelée quand la page login.html est chargée.
 */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;  // Sortir si le formulaire n'existe pas sur cette page

  // Afficher/masquer le mot de passe
  initPasswordToggle('password', 'togglePassword');

  // Soumission du formulaire
  form.addEventListener('submit', handleLogin);

  // Validation en temps réel
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  if (emailInput) {
    emailInput.addEventListener('blur', () => validateEmail(emailInput));
    emailInput.addEventListener('input', () => clearFieldState(emailInput));
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => clearFieldState(passwordInput));
  }
}

/**
 * Gère la soumission du formulaire de connexion.
 * Vérifie les identifiants dans le localStorage.
 * 
 * @param {Event} e - L'événement de soumission
 */
function handleLogin(e) {
  e.preventDefault();  // Empêche le rechargement de la page

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submitBtn');

  // Récupérer les valeurs
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  // Validation des champs
  let isValid = true;
  isValid = validateEmail(emailInput) && isValid;

  if (!password) {
    showFieldError(passwordInput, 'Le mot de passe est obligatoire.');
    isValid = false;
  }

  if (!isValid) return;  // Arrêter si validation échoue

  // État de chargement sur le bouton
  submitBtn.disabled = true;
  submitBtn.textContent = 'Connexion en cours…';

  fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Identifiants incorrects.');
      return data.user;
    })
    .then(user => {
      saveCurrentUser(user);
      showToast(`Bienvenue, ${user.prenom} ! 🎉`, 'success');
      const redirectUrl = sessionStorage.getItem('redirect_after_login') || './dashboard.html';
      sessionStorage.removeItem('redirect_after_login');
      setTimeout(() => { window.location.href = redirectUrl; }, 800);
    })
    .catch(error => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
      showFieldError(emailInput, error.message);
      showFieldError(passwordInput, error.message);
      showToast(error.message, 'error');
    });
}


// ============================================================
// FORMULAIRE D'INSCRIPTION
// Gère la page register.html
// ============================================================

/**
 * Initialise le formulaire d'inscription.
 * Appelée quand la page register.html est chargée.
 */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  // Remplir le select des universités
  populateUniversiteSelect();

  // Afficher/masquer les mots de passe
  initPasswordToggle('password', 'togglePassword');
  initPasswordToggle('passwordConfirm', 'togglePasswordConfirm');

  // Indicateur de force du mot de passe
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  }

  // Soumission
  form.addEventListener('submit', handleRegister);

  // Validations en temps réel
  setupRegisterValidation();
}

/**
 * Remplit le select des universités avec la liste définie dans main.js.
 */
function populateUniversiteSelect() {
  const select = document.getElementById('universite');
  if (!select) return;

  // Effacer les options existantes sauf la première (placeholder)
  while (select.options.length > 1) {
    select.remove(1);
  }

  // Ajouter chaque université
  UNIVERSITES.forEach(univ => {
    const option = document.createElement('option');
    option.value = univ;
    option.textContent = univ;
    select.appendChild(option);
  });
}

/**
 * Configure les validations en temps réel pour le formulaire d'inscription.
 */
function setupRegisterValidation() {
  const fields = {
    prenom: 'Le prénom',
    nom: 'Le nom',
    email: null,  // Validation spéciale pour l'email
    universite: "L'université",
    annee: "L'année d'étude",
    password: null,  // Validation spéciale
    passwordConfirm: null,  // Validation spéciale
  };

  Object.entries(fields).forEach(([id, label]) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('blur', () => {
      if (id === 'email') {
        validateEmail(input);
      } else if (id === 'password') {
        validatePassword(input);
      } else if (id === 'passwordConfirm') {
        validatePasswordConfirm();
      } else {
        validateRequired(input, label);
      }
    });

    input.addEventListener('input', () => {
      clearFieldState(input);
      if (id === 'password') {
        updatePasswordStrength(input.value);
        // Re-valider la confirmation si elle a été touchée
        const confirm = document.getElementById('passwordConfirm');
        if (confirm && confirm.value) validatePasswordConfirm();
      }
    });
  });
}

/**
 * Valide que la confirmation du mot de passe correspond au mot de passe.
 * 
 * @returns {boolean}
 */
function validatePasswordConfirm() {
  const password = document.getElementById('password');
  const confirm = document.getElementById('passwordConfirm');
  if (!password || !confirm) return true;

  if (!confirm.value) {
    showFieldError(confirm, 'Veuillez confirmer votre mot de passe.');
    return false;
  }

  if (password.value !== confirm.value) {
    showFieldError(confirm, 'Les mots de passe ne correspondent pas.');
    return false;
  }

  showFieldSuccess(confirm);
  return true;
}

/**
 * Met à jour visuellement l'indicateur de force du mot de passe.
 * 
 * @param {string} password - Le mot de passe saisi
 */
function updatePasswordStrength(password) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!fill || !text) return;

  const strength = getPasswordStrength(password);

  // Labels correspondant aux niveaux
  const labels = {
    weak: 'Faible',
    fair: 'Moyen',
    good: 'Bon',
    strong: 'Très fort',
  };

  // Mettre à jour l'affichage
  fill.className = `strength-fill ${strength}`;
  text.className = `strength-text ${strength}`;
  text.textContent = password ? labels[strength] : '';
}

/**
 * Gère la soumission du formulaire d'inscription.
 * Crée un nouveau compte dans le localStorage.
 * 
 * @param {Event} e
 */
function handleRegister(e) {
  e.preventDefault();

  // Récupérer tous les champs
  const prenomInput = document.getElementById('prenom');
  const nomInput = document.getElementById('nom');
  const emailInput = document.getElementById('email');
  const universiteInput = document.getElementById('universite');
  const anneeInput = document.getElementById('annee');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('passwordConfirm');
  const cgvInput = document.getElementById('cgv');
  const submitBtn = document.getElementById('submitBtn');

  // Valider tous les champs
  let isValid = true;
  isValid = validateRequired(prenomInput, 'Le prénom') && isValid;
  isValid = validateRequired(nomInput, 'Le nom') && isValid;
  isValid = validateEmail(emailInput) && isValid;
  isValid = validateRequired(universiteInput, "L'université") && isValid;
  isValid = validateRequired(anneeInput, "L'année d'étude") && isValid;
  isValid = validatePassword(passwordInput) && isValid;
  isValid = validatePasswordConfirm() && isValid;

  // Vérifier l'acceptation des conditions
  if (!cgvInput || !cgvInput.checked) {
    showToast('Veuillez accepter les conditions d\'utilisation.', 'error');
    isValid = false;
  }

  if (!isValid) {
    showToast('Veuillez corriger les erreurs dans le formulaire.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Création du compte…';

  fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailInput.value.trim().toLowerCase(),
      password: passwordInput.value,
      firstName: prenomInput.value.trim(),
      lastName: nomInput.value.trim(),
      university: universiteInput.value,
      studyYear: anneeInput.value,
    }),
  })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Inscription impossible.');
      return data.user;
    })
    .then(user => {
      saveCurrentUser(user);
      showToast(`Compte créé avec succès ! Bienvenue, ${user.prenom} ! 🎉`, 'success');
      setTimeout(() => { window.location.href = './dashboard.html'; }, 1000);
    })
    .catch(error => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Créer mon compte';
      showFieldError(emailInput, error.message);
      showToast(error.message, 'error');
    });
}


// ============================================================
// UTILITAIRE — AFFICHER/MASQUER LE MOT DE PASSE
// ============================================================

/**
 * Initialise le bouton d'affichage/masquage d'un champ mot de passe.
 * 
 * @param {string} inputId - ID de l'input mot de passe
 * @param {string} buttonId - ID du bouton toggle
 */
function initPasswordToggle(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  button.addEventListener('click', () => {
    // Basculer entre text et password
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? '🙈' : '👁️';
    button.title = isPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
  });
}


// ============================================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Déterminer sur quelle page on est
  const page = window.location.pathname.split('/').pop();

  if (page === 'login.html') {
    redirectIfAuthenticated();  // Rediriger si déjà connecté
    initLoginForm();
  }

  if (page === 'register.html') {
    redirectIfAuthenticated();  // Rediriger si déjà connecté
    initRegisterForm();
  }
});
