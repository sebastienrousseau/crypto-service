import type { Translations } from "./en";

// CLI constants — French locale.
//
// Every key in `en.ts` MUST appear here. The shared `Translations` type
// (derived from `typeof en.translations`) is enforced below — adding a key to
// `en.ts` without mirroring it here will be a compile-time error, which closes
// the historical "fr is missing keys → undefined at runtime" footgun.
export const translations: Translations = {
  CLI_TITLE: "🔐 Crypto CLI",
  CLI_DESCRIPTION:
    "Crypto CLI est une interface de ligne de commande simple mais puissante qui peut être utilisée pour effectuer des opérations cryptographiques courantes à partir de l'invite de commande ou du terminal.",
  CLI_FN_1_TTL: "Generate",
  CLI_FN_1_DES:
    "Génère une nouvelle paire de clés OpenPGP. Prend en charge les clés RSA et ECC.",
  CLI_FN_1_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande generate.",
  CLI_FN_2_TTL: "Encrypt",
  CLI_FN_2_DES: "Crypte un message.",
  CLI_FN_2_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande encrypt.",
  CLI_FN_3_TTL: "Decrypt",
  CLI_FN_3_DES: "Déchiffre un message.",
  CLI_FN_3_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande decrypt.",
  CLI_FN_4_TTL: "Reformat",
  CLI_FN_4_DES: "Reformate les paquets de signature pour une clé.",
  CLI_FN_4_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande reformat.",
  CLI_FN_5_TTL: "Revoke",
  CLI_FN_5_DES: "Révoque une clé.",
  CLI_FN_5_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande revoke.",
  CLI_FN_6_TTL: "Session",
  CLI_FN_6_DES: "Générez un nouvel objet clé de session.",
  CLI_FN_6_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande session.",
  CLI_FN_7_TTL: "Sign",
  CLI_FN_7_DES: "Signe un message.",
  CLI_FN_7_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande sign.",
  CLI_FN_8_TTL: "Verify",
  CLI_FN_8_DES: "Vérifie les signatures des messages signés en texte clair.",
  CLI_FN_8_LG_DES:
    "🔍 Sélectionnez cette option pour obtenir de l'aide sur la commande verify.",
  CLI_FN_9_TTL: "Help",
  CLI_FN_9_DES: "Obtenir de l'aide sur une commande.",
  CLI_FN_9_LG_DES: "",
  CLI_HDL_1_DES:
    "Nous avons besoin que vous nous fournissiez les informations suivantes :",
  PROMPT_SELECT_TTL: "Selection",
  PROMPT_SELECT_DES: "Sélectionnez une fonction à exécuter.",
  PROMPT_SELECT_DES_HLP:
    "Laissez-nous vous aider sur l'interface de ligne de commande Crypto (CLI). Veuillez sélectionner une commande pour en savoir plus.",
  PROMPT_HLP_DEC_DES:
    "Cette fonction déchiffre un message avec la clé privée de l'utilisateur, une clé de session ou un mot de passe. L'une des clés de déchiffrement, clés de session ou mots de passe doit être spécifiée (la combinaison de ces options n'est pas prise en charge).",
  PROMPT_HLP_DEC_USAGE: "Utilisation: decrypt [options]",
  PROMPT_HLP_DEC_OPTIONS: "Options:",
  PROMPT_HLP_DEC_OPT_1:
    "  <encryptedMessage> - L'objet message contenant les données chiffrées.",
  PROMPT_HLP_DEC_OPT_2:
    "  <passphrase> - Phrase de passe / mots de passe pour déchiffrer le message",
  PROMPT_HLP_DEC_OPT_3:
    "  <publicKey> - Énumération de clés publiques encodée en base64.",
  PROMPT_HLP_ENC_DES:
    "Cette fonction chiffre un message à l'aide de clés publiques, de mots de passe ou des deux à la fois. Au moins l'une des clés de chiffrement ou des mots de passe doit être spécifiée. Si des clés de signature sont spécifiées, elles seront utilisées pour signer le message.",
  PROMPT_HLP_ENC_USAGE: "Utilisation: encrypt [options]",
  PROMPT_HLP_ENC_OPTIONS: "Options:",
  PROMPT_HLP_ENC_OPT_1: "  <message> - Le message à chiffrer.",
  PROMPT_HLP_ENC_OPT_2:
    "  <passphrase> - Phrase de passe pour chiffrer le message.",
  PROMPT_HLP_ENC_OPT_3:
    "  <publicKey> - Énumération de clés publiques encodée en base64.",
  PROMPT_HLP_GEN_DES:
    "Cette fonction génère une nouvelle paire de clés OpenPGP. Prend en charge les clés RSA et ECC. Par défaut, la clé primaire et les sous-clés seront du même type. La clé primaire générée aura des capacités de signature. Par défaut, une sous-clé avec des capacités de chiffrement est également générée.",
  PROMPT_HLP_GEN_USAGE: "Utilisation: generate [options]",
  PROMPT_HLP_GEN_OPTIONS: "Options:",
  PROMPT_HLP_GEN_OPT_1: "  <name> - Nom de l'utilisateur.",
  PROMPT_HLP_GEN_OPT_2: "  <email> - Email de l'utilisateur.",
  PROMPT_HLP_GEN_OPT_3:
    "  <passphrase> - Phrase de passe utilisée pour chiffrer la clé privée générée. Si omise ou vide, la clé ne sera pas chiffrée.",
  PROMPT_HLP_GEN_OPT_4:
    "  <type> - Algorithme de la clé primaire : ECC (par défaut) ou RSA.",
  PROMPT_HLP_GEN_OPT_5:
    "  <curve> - Courbe elliptique pour les clés ECC : curve25519 (défaut), p256, p384, p521, secp256k1, brainpoolP256r1, brainpoolP384r1, ou brainpoolP512r1.",
  PROMPT_HLP_GEN_OPT_6: "  <rsaBits> - Nombre de bits pour les clés RSA.",
  PROMPT_HLP_GEN_OPT_7:
    "  <keyExpirationTime> - Nombre de secondes après la création après lesquelles la clé expire.",
  PROMPT_HLP_GEN_OPT_8:
    "  <format> - Format des clés en sortie : 'armored' | 'binary' | 'object'",
  PROMPT_HLP_REF_DES:
    "Cette fonction reformate les paquets de signature pour une clé et réenveloppe l'objet clé.",
  PROMPT_HLP_REF_USAGE: "Utilisation: reformat [options]",
  PROMPT_HLP_REF_OPTIONS: "Options:",
  PROMPT_HLP_REF_OPT_1: "  <email> - Email de l'utilisateur.",
  PROMPT_HLP_REF_OPT_2:
    "  <expirationTime> - Nombre de secondes après la création après lesquelles la clé expire.",
  PROMPT_HLP_REF_OPT_3: "  <name> - Nom de l'utilisateur.",
  PROMPT_HLP_REF_OPT_4:
    "  <passphrase> - Phrase de passe utilisée pour chiffrer la clé privée reformatée. Si omise ou vide, la clé ne sera pas chiffrée.",
  PROMPT_HLP_REF_OPT_5:
    "  <publicKey> - Énumération de clés publiques encodée en base64.",
  PROMPT_HLP_RVK_DES:
    "Cette fonction révoque une clé. Nécessite soit une clé privée, soit un certificat de révocation. Si un certificat de révocation est passé, le paramètre reasonForRevocation sera ignoré.",
  PROMPT_HLP_RVK_USAGE: "Utilisation: revoke [options]",
  PROMPT_HLP_RVK_OPTIONS: "Options:",
  PROMPT_HLP_RVK_OPT_1:
    "  <flags> - Drapeau indiquant la raison de la révocation.",
  PROMPT_HLP_RVK_OPT_2:
    "  <passphrase> - Phrase de passe pour déchiffrer la clé privée.",
  PROMPT_HLP_RVK_OPT_3: "  <reasonForRevocation> - Raison de la révocation.",
  PROMPT_HLP_SES_DES:
    "Cette fonction génère un nouvel objet clé de session, en tenant compte des préférences d'algorithme des clés publiques passées.",
  PROMPT_HLP_SES_USAGE: "Utilisation: session [options]",
  PROMPT_HLP_SES_OPT_1: " <name> - Nom de l'utilisateur.",
  PROMPT_HLP_SES_OPT_2:
    " <publicKey> - Énumération de clés publiques encodée en base64.",
  PROMPT_HLP_SGN_DES: "Cette fonction signe un message.",
  PROMPT_HLP_SGN_USAGE: "Utilisation: sign [options]",
  PROMPT_HLP_SGN_OPT_1: " <passphrase> - Phrase de passe pour signer le message.",
  PROMPT_HLP_SGN_OPT_2: " <message> - Le message à signer.",
  PROMPT_HLP_SGN_OPT_3:
    " <detach> - Si vrai, la signature est détachée. Si faux, la signature est intégrée.",
  PROMPT_HLP_SGN_OPT_4:
    " <publicKey> - Énumération de clés publiques encodée en base64.",
  PROMPT_HLP_SGN_OPT_5:
    " <privateKey> - Énumération de clés privées encodée en base64.",
  PROMPT_HLP_VRF_DES:
    "Cette fonction vérifie les signatures d'un message signé en texte clair.",
  PROMPT_HLP_VRF_USAGE: "Utilisation: verify [options]",
  PROMPT_HLP_VRF_OPT_1: " <message> - Le message à vérifier.",
  PROMPT_HLP_VRF_OPT_2:
    " <publicKey> - Énumération de clés publiques encodée en base64.",
  CLI_ERR_1: "🔔 Vous devez sélectionner une commande.",
  CLI_ERR_2: "🔔 Vous devez sélectionner une option valide.",
};
