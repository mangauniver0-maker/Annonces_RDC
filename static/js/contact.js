/* ============================================================
   contact.js — Logique du formulaire de contact
   ============================================================

   Ce fichier gère tout ce qui concerne la page contact :
   - Validation des champs du formulaire (nom, email, sujet, message)
   - Compteur de caractères pour le champ message
   - Simulation d'envoi avec un spinner de chargement
   - Notification toast de succès après "envoi"
   - Réinitialisation du formulaire après succès

   Dépend de : main.js (fonctions showToast, validateEmail)
   ============================================================ */


/* ============================================================
   INITIALISATION AU CHARGEMENT DE LA PAGE
   DOMContentLoaded attend que tout le HTML soit chargé
   avant d'exécuter le code JavaScript.
============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  /* ----------------------------
     Récupération des éléments DOM
     On mémorise les références une seule fois pour éviter
     de les rechercher dans le DOM à chaque événement.
  ----------------------------- */
  const form        = document.getElementById('contactForm');
  const nomInput    = document.getElementById('nom');
  const emailInput  = document.getElementById('email');
  const sujetInput  = document.getElementById('sujet');
  const msgInput    = document.getElementById('message');
  const charCount   = document.getElementById('charCount');
  const submitBtn   = document.getElementById('submitBtn');
  const submitText  = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitBtnSpinner');

  /* Limite maximale de caractères pour le message */
  const MAX_CHARS = 1000;


  /* ============================================================
     COMPTEUR DE CARACTÈRES
     Mise à jour en temps réel pendant la frappe dans le textarea.
  ============================================================ */
  if (msgInput && charCount) {
    msgInput.addEventListener('input', function () {
      const count = msgInput.value.length;
      charCount.textContent = count;

      /* Changer la couleur si on approche ou dépasse la limite */
      if (count >= MAX_CHARS) {
        charCount.style.color = 'var(--danger)';   /* Rouge : limite atteinte */
        msgInput.value = msgInput.value.substring(0, MAX_CHARS); /* Tronquer */
      } else if (count >= MAX_CHARS * 0.9) {
        charCount.style.color = '#f59e0b';         /* Orange : presque plein */
      } else {
        charCount.style.color = 'var(--gray-500)'; /* Gris : normal */
      }
    });
  }


  /* ============================================================
     VALIDATION EN TEMPS RÉEL (onblur)
     Quand l'utilisateur quitte un champ (blur), on le valide
     immédiatement pour un retour visuel rapide.
  ============================================================ */

  /* Valider le nom quand on quitte le champ */
  if (nomInput) {
    nomInput.addEventListener('blur', function () {
      validerNom();
    });
    /* Effacer l'erreur dès qu'on recommence à taper */
    nomInput.addEventListener('input', function () {
      clearError('nom', 'errorNom');
    });
  }

  /* Valider l'email quand on quitte le champ */
  if (emailInput) {
    emailInput.addEventListener('blur', function () {
      validerEmail();
    });
    emailInput.addEventListener('input', function () {
      clearError('email', 'errorEmail');
    });
  }

  /* Valider le sujet à chaque changement */
  if (sujetInput) {
    sujetInput.addEventListener('change', function () {
      validerSujet();
    });
  }

  /* Valider le message quand on quitte le champ */
  if (msgInput) {
    msgInput.addEventListener('blur', function () {
      validerMessage();
    });
    msgInput.addEventListener('input', function () {
      clearError('message', 'errorMessage');
    });
  }


  /* ============================================================
     SOUMISSION DU FORMULAIRE
     Intercepte l'envoi natif du navigateur et gère la validation
     + simulation d'envoi via JavaScript.
  ============================================================ */
  if (form) {
    form.addEventListener('submit', function (event) {
      /* Empêche le rechargement de la page (comportement HTML par défaut) */
      event.preventDefault();

      /* Valider tous les champs avant d'aller plus loin */
      const nomOk    = validerNom();
      const emailOk  = validerEmail();
      const sujetOk  = validerSujet();
      const messageOk = validerMessage();

      /* Si au moins un champ est invalide, on arrête ici */
      if (!nomOk || !emailOk || !sujetOk || !messageOk) {
        /* Faire défiler jusqu'au premier champ en erreur */
        const premierErreur = form.querySelector('.form-control.is-error');
        if (premierErreur) {
          premierErreur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          premierErreur.focus();
        }
        return; /* Stopper l'exécution ici */
      }

      /* Tous les champs sont valides → simuler l'envoi */
      simulerEnvoi();
    });
  }


  /* ============================================================
     FONCTIONS DE VALIDATION
     Chaque fonction vérifie un champ, affiche ou efface
     le message d'erreur, et retourne true/false.
  ============================================================ */

  /**
   * Valide le champ Nom.
   * Règle : obligatoire, 2 caractères minimum.
   * @returns {boolean} true si valide, false sinon
   */
  function validerNom() {
    const valeur = nomInput.value.trim();

    if (!valeur) {
      afficherErreur(nomInput, 'errorNom', 'Veuillez entrer votre nom complet.');
      return false;
    }
    if (valeur.length < 2) {
      afficherErreur(nomInput, 'errorNom', 'Le nom doit contenir au moins 2 caractères.');
      return false;
    }

    marquerValide(nomInput, 'errorNom');
    return true;
  }

  /**
   * Valide le champ Email.
   * Règle : obligatoire, format email valide.
   * Utilise la fonction validateEmail() de main.js.
   * @returns {boolean} true si valide, false sinon
   */
  function validerEmail() {
    const valeur = emailInput.value.trim();

    if (!valeur) {
      afficherErreur(emailInput, 'errorEmail', 'Veuillez entrer votre adresse e-mail.');
      return false;
    }
    /* validateEmail est définie dans main.js */
    if (typeof validateEmail === 'function' && !validateEmail(valeur)) {
      afficherErreur(emailInput, 'errorEmail', 'Adresse e-mail invalide. Ex : jean@gmail.com');
      return false;
    }

    marquerValide(emailInput, 'errorEmail');
    return true;
  }

  /**
   * Valide le champ Sujet (select).
   * Règle : obligatoire, une option doit être sélectionnée.
   * @returns {boolean} true si valide, false sinon
   */
  function validerSujet() {
    const valeur = sujetInput.value;

    if (!valeur) {
      afficherErreur(sujetInput, 'errorSujet', 'Veuillez choisir un sujet.');
      return false;
    }

    marquerValide(sujetInput, 'errorSujet');
    return true;
  }

  /**
   * Valide le champ Message (textarea).
   * Règles : obligatoire, 10 caractères minimum, 1000 maximum.
   * @returns {boolean} true si valide, false sinon
   */
  function validerMessage() {
    const valeur = msgInput.value.trim();

    if (!valeur) {
      afficherErreur(msgInput, 'errorMessage', 'Veuillez écrire votre message.');
      return false;
    }
    if (valeur.length < 10) {
      afficherErreur(msgInput, 'errorMessage', 'Le message doit contenir au moins 10 caractères.');
      return false;
    }
    if (valeur.length > MAX_CHARS) {
      afficherErreur(msgInput, 'errorMessage', `Le message ne doit pas dépasser ${MAX_CHARS} caractères.`);
      return false;
    }

    marquerValide(msgInput, 'errorMessage');
    return true;
  }


  /* ============================================================
     FONCTIONS UTILITAIRES D'AFFICHAGE DES ERREURS
  ============================================================ */

  /**
   * Affiche un message d'erreur sous un champ et le marque en rouge.
   * @param {HTMLElement} input  - L'élément de saisie concerné
   * @param {string}      errId  - L'id du <span> d'erreur
   * @param {string}      msg    - Le message d'erreur à afficher
   */
  function afficherErreur(input, errId, msg) {
    input.classList.add('is-error');
    input.classList.remove('is-valid');
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;
  }

  /**
   * Marque un champ comme valide (bordure verte, message effacé).
   * @param {HTMLElement} input  - L'élément de saisie
   * @param {string}      errId  - L'id du <span> d'erreur à vider
   */
  function marquerValide(input, errId) {
    input.classList.remove('is-error');
    input.classList.add('is-valid');
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = '';
  }

  /**
   * Efface l'état d'erreur d'un champ pendant la frappe.
   * @param {string} inputId  - L'id de l'input
   * @param {string} errId    - L'id du span d'erreur
   */
  function clearError(inputId, errId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.classList.remove('is-error');
    }
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = '';
  }


  /* ============================================================
     SIMULATION D'ENVOI
     Puisqu'il n'y a pas de serveur backend, on simule un délai
     d'envoi (1,5 secondes) puis on affiche une notification.
  ============================================================ */

  /**
   * Simule l'envoi du formulaire :
   * 1. Désactive le bouton et affiche le spinner
   * 2. Attend 1,5 secondes (simulation réseau)
   * 3. Affiche un toast de succès
   * 4. Réinitialise le formulaire
   */
  function simulerEnvoi() {
    /* Désactiver le bouton pour éviter les double-clics */
    submitBtn.disabled = true;
    submitText.textContent = 'Envoi en cours…';
    submitSpinner.classList.remove('hidden');

    /* Simuler un délai réseau de 1,5 secondes avec setTimeout */
    setTimeout(function () {
      /* Réactiver le bouton */
      submitBtn.disabled = false;
      submitText.textContent = '✉️ Envoyer le message';
      submitSpinner.classList.add('hidden');

      /* Afficher la notification de succès (showToast est dans main.js) */
      if (typeof showToast === 'function') {
        showToast(
          'Message envoyé ! Nous vous répondrons dans les 48 heures. 🇨🇩',
          'success'
        );
      }

      /* Réinitialiser complètement le formulaire */
      form.reset();

      /* Remettre le compteur de caractères à zéro */
      if (charCount) {
        charCount.textContent = '0';
        charCount.style.color = 'var(--gray-500)';
      }

      /* Retirer les classes de validation (is-valid) de tous les champs */
      form.querySelectorAll('.form-control').forEach(function (el) {
        el.classList.remove('is-valid', 'is-error');
      });

      /* Faire remonter la page vers le formulaire */
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }, 1500); /* 1 500 ms = 1,5 secondes */
  }

}); /* fin DOMContentLoaded */
