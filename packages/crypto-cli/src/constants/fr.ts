/** French (fr) translation strings for the CLI interface. */
export const translations = {
  /** Titre principal du CLI. */
  CLI_TITLE: "🔐 Crypto CLI",
  /** Description de l'application CLI. */
  CLI_DESCRIPTION:
    "Crypto CLI est une interface de ligne de commande simple mais puissante qui peut être utilisée pour effectuer des opérations cryptographiques courantes à partir de l'invite de commande ou du terminal.",
  /** Titre de la commande Generate. */
  CLI_FN_1_TTL: "Generate",
  /** Description courte de la commande Generate. */
  CLI_FN_1_DES:
    "Génère une nouvelle paire de clés OpenPGP. Prend en charge les clés RSA et ECC.",
  /** Titre de la commande Encrypt. */
  CLI_FN_2_TTL: "Encrypt",
  /** Description courte de la commande Encrypt. */
  CLI_FN_2_DES: "Crypte un message.",
  /** Titre de la commande Decrypt. */
  CLI_FN_3_TTL: "Decrypt",
  /** Description courte de la commande Decrypt. */
  CLI_FN_3_DES: "Déchiffre un message.",
  /** Titre de la commande Reformat. */
  CLI_FN_4_TTL: "Reformat",
  /** Description courte de la commande Reformat. */
  CLI_FN_4_DES: "Reformate les paquets de signature pour une clé.",
  /** Titre de la commande Revoke. */
  CLI_FN_5_TTL: "Revoke",
  /** Description courte de la commande Revoke. */
  CLI_FN_5_DES: "Révoque une clé.",
  /** Titre de la commande Session. */
  CLI_FN_6_TTL: "Session",
  /** Description courte de la commande Session. */
  CLI_FN_6_DES: "Générez un nouvel objet clé de session.",
  /** Titre de la commande Sign. */
  CLI_FN_7_TTL: "Sign",
  /** Description courte de la commande Sign. */
  CLI_FN_7_DES: "Signe un message.",
  /** Titre de la commande Verify. */
  CLI_FN_8_TTL: "Verify",
  /** Description courte de la commande Verify. */
  CLI_FN_8_DES: "Vérifie les signatures des messages signés en texte clair.",
  /** Titre de la commande Help. */
  CLI_FN_9_TTL: "Help",
  /** Description courte de la commande Help. */
  CLI_FN_9_DES: "Obtenir de l'aide sur une commande.",
  /** Texte affiché avant la collecte des données. */
  CLI_HDL_1_DES:
    "Nous avons besoin que vous nous fournissiez les informations suivantes :",
  /** Nom du champ de sélection utilisateur. */
  PROMPT_SELECT_TTL: "Selection",
  /** Message du sélecteur de commande principal. */
  PROMPT_SELECT_DES: "Sélectionnez une fonction à exécuter.",
  /** Message d'erreur lorsque aucune commande n'est sélectionnée. */
  CLI_ERR_1: "🔔 Vous devez sélectionner une commande.",
} as const;
