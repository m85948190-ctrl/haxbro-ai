```js
/**
 * HAXBRO — KAI CONTROL
 *
 * Central configuration for KAI.
 *
 * This file controls:
 * - KAI behavior
 * - Provider inventory
 * - Provider fallback
 * - Authorization
 * - Permissions
 * - Security
 *
 * API keys are NEVER stored here.
 */

'use strict';


/* =========================================================
   KAI IDENTITY
   ========================================================= */

export const KAI_CONTROL = Object.freeze({

  name: 'KAI',

  version: '1.0.0',

  project: 'haxbro',

  identity: Object.freeze({
    role: 'AI assistant',
    localFirst: true,
    userScoped: true,
    ownerControlled: true
  }),


  /* =======================================================
     BEHAVIOR
     ======================================================= */

  behavior: Object.freeze({

    defaultMode: 'helpful',

    concise: true,

    professional: true,

    transparent: true,

    rules: Object.freeze([
      'Help with legitimate user requests.',
      'Never claim an operation succeeded when it did not.',
      'Never expose secrets or credentials.',
      'Never bypass authorization.',
      'Never silently change permissions.',
      'Never hide provider failures.',
      'Use fallback providers when the active provider fails.',
      'Keep provider credentials server-side.',
      'Request confirmation before irreversible actions.'
    ])
  }),


  /* =========================================================
     PROVIDERS
     
     CONFIRMED INVENTORY

     OpenRouter = 4 keys
     Groq       = 3 keys
     OpenAI     = 1 key
     Google     = 1 key
     Mistral    = 1 key
     xAI        = 0 keys

     Multiple keys use the same environment variable.
     Do NOT invent OPENROUTER_API_KEY_1 etc.
     ========================================================= */

  providers: Object.freeze({

    openrouter: Object.freeze({
      enabled: true,
      keyCount: 4,
      keyEnv: 'OPENROUTER_API_KEY',
      baseUrl: 'https://openrouter.ai/api/v1'
    }),

    groq: Object.freeze({
      enabled: true,
      keyCount: 3,
      keyEnv: 'GROQ_API_KEY',
      baseUrl: 'https://api.groq.com/openai/v1'
    }),

    openai: Object.freeze({
      enabled: true,
      keyCount: 1,
      keyEnv: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1'
    }),

    google: Object.freeze({
      enabled: true,
      keyCount: 1,
      keyEnv: 'GOOGLE_API_KEY',
      baseUrl: 'https://generativelanguage.googleapis.com'
    }),

    mistral: Object.freeze({
      enabled: true,
      keyCount: 1,
      keyEnv: 'MISTRAL_API_KEY',
      baseUrl: 'https://api.mistral.ai/v1'
    }),

    xai: Object.freeze({
      enabled: false,
      keyCount: 0,
      keyEnv: 'XAI_API_KEY',
      baseUrl: 'https://api.x.ai/v1'
    })
  }),


  /* =========================================================
     FALLBACK CHAIN

     1. OpenRouter
     2. Groq
     3. OpenAI
     4. Google
     5. Mistral
     6. KAI
     ========================================================= */

  fallback: Object.freeze({

    enabled: true,

    chain: Object.freeze([
      'openrouter',
      'groq',
      'openai',
      'google',
      'mistral',
      'kai'
    ]),

    maxProviderAttempts: 2,

    retryOnTimeout: true,

    retryOnRateLimit: true,

    retryOnServerError: true
  }),


  /* =========================================================
     KAI FALLBACK
     ========================================================= */

  kai: Object.freeze({

    enabled: true,

    finalFallback: true,

    capabilities: Object.freeze([
      'conversation',
      'reasoning',
      'programming',
      'research',
      'cybersecurity_defense',
      'web_analysis',
      'planning',
      'summarization'
    ])
  }),


  /* =========================================================
     AUTHORIZATION
     ========================================================= */

  authorization: Object.freeze({

    required: true,

    defaultDecision: 'deny',

    decisions: Object.freeze({
      authorized: 'allow',
      unauthorized: 'deny',
      unknown: 'deny',
      destructiveWithoutConfirmation: 'deny'
    }),

    requireConfirmationFor: Object.freeze([
      'delete',
      'overwrite',
      'publish',
      'deploy',
      'revoke',
      'rotate_credentials',
      'change_permissions',
      'change_security_policy',
      'send_external_message',
      'irreversible_action'
    ])
  }),


  /* =========================================================
     PERMISSIONS
     ========================================================= */

  permissions: Object.freeze({

    conversation: true,

    reasoning: true,

    coding: true,

    research: true,

    webSearch: true,

    fileRead: true,

    fileWrite: false,

    deployment: false,

    credentialAccess: false,

    secretDisclosure: false,

    accountAccess: false,

    permissionChanges: false,

    destructiveOperations: false,

    unauthorizedAccess: false,

    credentialTheft: false,

    malwareCreation: false
  }),


  /* =========================================================
     SECURITY
     ========================================================= */

  security: Object.freeze({

    neverExposeSecrets: true,

    neverReturnSecretValues: true,

    neverLogSecretValues: true,

    blockUnauthorizedAccess: true,

    blockCredentialTheft: true,

    blockDestructiveActions: true,

    requireExplicitAuthorization: true,

    requireConfirmationForIrreversibleActions: true,

    failClosed: true
  }),


  /* =========================================================
     RELIABILITY
     ========================================================= */

  reliability: Object.freeze({

    timeoutMs: 30000,

    maxRetriesPerProvider: 2,

    exponentialBackoff: true,

    continueAfterProviderFailure: true,

    reportFinalFailure: true
  })
});


/* =========================================================
   AUTHORIZATION
   ========================================================= */

export function isAuthorized(context = {}) {

  return context.authorized === true;
}


export function requiresConfirmation(action = '') {

  const normalized = String(action).toLowerCase();

  return KAI_CONTROL.authorization.requireConfirmationFor
    .some(item => normalized.includes(item));
}


export function canPerform(action = '', context = {}) {

  if (!isAuthorized(context)) {
    return false;
  }

  if (
    requiresConfirmation(action) &&
    context.confirmed !== true
  ) {
    return false;
  }

  const normalized = String(action).toLowerCase();

  const blockedPatterns = [
    'credential',
    'password',
    'token',
    'secret'
  ];

  if (
    blockedPatterns.some(pattern =>
      normalized.includes(pattern)
    )
  ) {
    return false;
  }

  return true;
}


/* =========================================================
   PROVIDER HELPERS
   ========================================================= */

export function getProvider(name) {

  return KAI_CONTROL.providers[name] || null;
}


export function getFallbackChain() {

  return [...KAI_CONTROL.fallback.chain];
}


export function getEnabledProviders() {

  return KAI_CONTROL.fallback.chain.filter(name => {

    if (name === 'kai') {
      return KAI_CONTROL.kai.enabled;
    }

    return KAI_CONTROL.providers[name]?.enabled === true;
  });
}


/* =========================================================
   ENVIRONMENT STATUS
   ========================================================= */

export function getProviderEnvironmentStatus() {

  const result = {};

  for (
    const [name, provider]
    of Object.entries(KAI_CONTROL.providers)
  ) {

    result[name] = {

      enabled: provider.enabled,

      keyEnv: provider.keyEnv,

      configured: Boolean(
        typeof process !== 'undefined' &&
        process.env &&
        process.env[provider.keyEnv]
      )
    };
  }

  return result;
}


/* =========================================================
   REQUEST VALIDATION
   ========================================================= */

export function validateRequest({

  action = '',

  context = {},

  destructive = false,

  confirmed = false

} = {}) {

  if (!isAuthorized(context)) {

    return Object.freeze({
      allowed: false,
      reason: 'Authorization required.'
    });
  }


  if (destructive && !confirmed) {

    return Object.freeze({
      allowed: false,
      reason: 'Explicit confirmation required.'
    });
  }


  if (
    !canPerform(action, {
      ...context,
      confirmed
    })
  ) {

    return Object.freeze({
      allowed: false,
      reason: 'Action is outside KAI permissions.'
    });
  }


  return Object.freeze({
    allowed: true,
    reason: 'Authorized.'
  });
}


/* =========================================================
   SAFE PUBLIC SNAPSHOT
   ========================================================= */

export function getControlSnapshot() {

  return Object.freeze({

    name: KAI_CONTROL.name,

    version: KAI_CONTROL.version,

    project: KAI_CONTROL.project,

    fallbackChain: getFallbackChain(),

    enabledProviders: getEnabledProviders(),

    authorizationRequired:
      KAI_CONTROL.authorization.required,

    failClosed:
      KAI_CONTROL.security.failClosed,

    secretDisclosureBlocked:
      KAI_CONTROL.security.neverReturnSecretValues,

    destructiveOperations:
      KAI_CONTROL.permissions.destructiveOperations
  });
}


/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default KAI_CONTROL;
```

