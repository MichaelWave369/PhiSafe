// PhiSafe Rung 9: optional community field pilot tools. No network or personal data access.
// The public diagnostic format is allowlist-only; NEVER pass a household plan to it.
export const PILOT_STORAGE_KEY = "phisafe-pilot-checks-v1";
export const PILOT_REPORT_FORMAT = "phisafe-community-field-report";
export const PILOT_REPORT_VERSION = 1;
export const PILOT_APP_VERSION = "0.9.0";

export const PILOT_CHECKS = Object.freeze([
  {id:"install",title:"Install or bookmark the app",description:"Follow your browser's available install or home-screen steps; note if installation was not offered."},
  {id:"offline",title:"Actually test disconnected reopening",description:"While safe and not in an emergency, disable connectivity, reopen PhiSafe and verify saved information loads."},
  {id:"roster",title:"Check household and animal editing",description:"With synthetic details or your own private plan, test counts, carriers and assignments. Do not paste them into an issue."},
  {id:"print",title:"Print or preview the loading sheet",description:"Confirm all expected animal rows, departure/arrival boxes and adequate page legibility."},
  {id:"backup",title:"Test encrypted backup recovery",description:"Restore a test backup on another device or isolated browser profile using its passphrase."},
  {id:"accessibility",title:"Check mobile and keyboard navigation",description:"Try small-screen controls, focus order and zoom, and report any navigation issue without personal records."}
]);

export function normalizePilot(raw) {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const checks = {};
  for (const item of PILOT_CHECKS) {
    if (input.checks && input.checks[item.id] === true) checks[item.id] = true;
  }
  return {checks};
}
export function pilotProgress(pilot) {
  const normalized=normalizePilot(pilot);
  const done=PILOT_CHECKS.filter(item=>normalized.checks[item.id]).length;
  return {done,total:PILOT_CHECKS.length,allSelfConfirmed:done===PILOT_CHECKS.length};
}
export function installHint(env) {
  if (env?.installed===true) return "standalone";
  if (env?.promptAvailable===true) return "browser-prompt";
  return "manual";
}
export function makePublicPilotReport(pilot,env={}) {
  const normalized=normalizePilot(pilot);
  const permittedCacheStatuses=new Set(["cached","incomplete","unverified"]);
  return {
    format:PILOT_REPORT_FORMAT,
    version:PILOT_REPORT_VERSION,
    appVersion:PILOT_APP_VERSION,
    checks:Object.fromEntries(PILOT_CHECKS.map(item=>[
      item.id,normalized.checks[item.id]===true?"self-confirmed":"not-tested"
    ])),
    environment:{
      secureContext:env.secureContext===true,
      serviceWorkerSupported:env.serviceWorkerSupported===true,
      serviceWorkerControlled:env.serviceWorkerControlled===true,
      standaloneInstalled:env.installed===true,
      cacheAudit:permittedCacheStatuses.has(env.cacheAudit) ? env.cacheAudit : "unverified"
    },
    caveat:"Self-confirmed checks and technical signals only; no live hazard, route, shelter, safety, or real-device certification."
  };
}
// No user-agent string, URL, IP, browser storage content, counts, device ID or free-text
// fields are included. Export is initiated by an explicit user click only.
