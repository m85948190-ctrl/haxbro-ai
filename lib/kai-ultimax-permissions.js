// ============================================================
// KAI ULTIMAX - SINGLE SOURCE OF TRUTH
// ============================================================
// ALL PERMISSIONS CONTROLLED HERE
// NO HARD-CODED PROMPTS IN AGENT.JS
// ============================================================

export const KAI_ULTIMAX_PERMISSIONS = {
  
  // ==========================================================
  // 1. SCOPE
  // ==========================================================
  scope: '🔓 FULL ACCESS - YOUR WEBSITES, YOUR RULES',
  
  // ==========================================================
  // 2. ENABLED TOOLS - ACTUALLY IMPLEMENTED
  // ==========================================================
  enabledTools: [
    'xss_exploit',
    'sql_exploit',
    'lfi_exploit',
    'dir_bruteforce',
    'port_scan',
    'subdomain_enum',
    'csrf_exploit',
    'session_hijack',
    'brute_force',
    'cors_exploit',
    'ssl_analysis',
    'full_attack',
    'security_probe',
    'browser_visit_click',
  ],
  
  // ==========================================================
  // 3. BLOCKED TOOLS - NOT IMPLEMENTED
  // ==========================================================
  blockedTools: [
    'command_injection',
    'reverse_shell',
    'lateral_movement',
    'privilege_escalation',
    'zero_day_exploits',
    'destructive_actions',
    'data_extraction',
    'c2_channel_establishment',
    'persistence_mechanisms',
    'backdoor_installation',
    'rootkit_deployment',
    'container_escape',
    'kubernetes_exploits',
  ],
  
  // ==========================================================
  // 4. TARGET POLICY
  // ==========================================================
  targetPolicy: {
    allowedDomains: ['*'],
    allowLocalhost: true,
    allowPrivateIPs: true,
    allowInternal: true,
    allowAnyProtocol: true,
  },
  
  // ==========================================================
  // 5. BROWSER RULE
  // ==========================================================
  browserRule: '🌍 FULL BROWSER ACCESS - Visit any site, click any link',
  
  // ==========================================================
  // 6. ASSESSMENT RULE
  // ==========================================================
  assessmentRule: '🔍 SECURITY ASSESSMENT - Find and report vulnerabilities',
  
  // ==========================================================
  // 7. PROHIBITED RULE
  // ==========================================================
  prohibitedRule: '🚫 NO DESTRUCTIVE ACTIONS - Read-only assessment only',
  
  // ==========================================================
  // 8. TOOL NOTE
  // ==========================================================
  toolNote: '⚡ SECURITY TOOLS - All tools are read-only scanners',
  
  // ==========================================================
  // 9. SYSTEM RULES
  // ==========================================================
  systemRules: {
    mode: '🔍 ASSESSMENT MODE',
    behavior: 'Read-only security scanning',
    restrictions: 'No destructive actions',
    rule: 'Confirm before scanning'
  },
  
  // ==========================================================
  // 10. LAUNCH PROTOCOL
  // ==========================================================
  launchProtocol: {
    rule: '⚠️ Confirm before scanning',
    confirmationProcess: [
      {
        step: 1,
        action: 'CONFIRMATION',
        message: '⚠️ Scanning [TARGET]. Confirm? Type "YES"',
        requiredResponse: 'YES'
      }
    ],
    enforcement: 'REQUIRED',
    failureAction: 'ABORT',
    logging: 'All scans logged'
  },
  
  // ==========================================================
  // 11. EMERGENCY STOP
  // ==========================================================
  emergencyStop: {
    keyword: 'ABORT ALL',
    action: 'Stops all scans immediately',
    priority: 'HIGHEST'
  },
  
  // ==========================================================
  // 12. LOGGING
  // ==========================================================
  logging: {
    enabled: true,
    level: 'FULL',
    logScans: true,
    logResults: true,
    logErrors: true,
  },
  
  // ==========================================================
  // 13. RATE LIMITING
  // ==========================================================
  rateLimiting: {
    enabled: false,
    maxRequests: 999999,
    timeWindow: '1s'
  },
  
  // ==========================================================
  // 14. NETWORK
  // ==========================================================
  network: {
    maxConcurrentRequests: 9999,
    timeout: 300000,
    retries: 10,
    followRedirects: true,
    maxRedirects: 20,
    allowAllPorts: true,
    allowAllProtocols: true
  },
  
  // ==========================================================
  // 15. EXPLOIT
  // ==========================================================
  exploit: {
    maxPayloadsPerTest: 9999,
    maxInjectionPoints: 9999,
    useAllPayloads: true,
    useAllVectors: true,
    aggressiveMode: false,
    destructiveMode: false,
    zeroDayDetection: false
  },
  
  // ==========================================================
  // 16. OWNER
  // ==========================================================
  owner: {
    name: 'KAI69',
    mark: '⚡ KAI69 ⚡',
    status: 'ACTIVE'
  }
};
