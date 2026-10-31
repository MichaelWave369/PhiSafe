// PhiSafe Rung 9 community testing UI.
// No plan, pet name, contact or freeform text is rendered in the pilot report.
import {PILOT_CHECKS,pilotProgress,installHint} from "./pilot.mjs";
const link=(href,label,e)=>'<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer">'+e(label)+'</a>';

export function renderPilot(pilot,env,{e,pill}) {
  const progress=pilotProgress(pilot);
  const method=installHint(env);
  const installed=method==="standalone";
  const advice=installed
    ?'<p>This browser reports that PhiSafe is running in a standalone window. You still need to test offline reopening on this physical device.</p>'
    :method==="browser-prompt"
      ?'<button type="button" data-action="pilot-install">Install PhiSafe using browser prompt</button><p class="hint">The browser decides if installation is allowed. No installation is automatic.</p>'
      :'<p>The browser did not offer an automatic install prompt. You can still use the website or create a home-screen bookmark.</p>';
  const status=env.cacheAudit||"unverified";
  return '<div class="pilot-view">'+
    '<h2>Community Field Pilot</h2>'+
    '<p class="lead">Help test PhiSafe before a wider release. This is optional. All test confirmations stay in this browser, and sharing a diagnostic summary requires your action.</p>'+
    '<div class="warning-note"><strong>Protect household privacy:</strong> Never attach real household JSON backups, encrypted vaults, passphrases, names, medication lists, addresses, exact routes or screenshots containing private details to a public GitHub issue. Use synthetic information when reporting bugs.</div>'+
    '<div class="section grid two">'+
      '<section class="card"><h3>Install or bookmark PhiSafe</h3>'+advice+
        '<ul class="clean">'+
          '<li><strong>Android Chrome / Edge:</strong> check the browser menu for Install app or Add to Home screen, when available.</li>'+
          '<li><strong>iPhone / iPad Safari:</strong> use Share, then Add to Home Screen (availability depends on iOS/iPadOS version).</li>'+
          '<li><strong>Desktop Chrome / Edge:</strong> look for the install option in the address bar or browser menu.</li>'+
          '<li><strong>Other browsers:</strong> bookmark the page and test offline behavior independently; installation support varies.</li>'+
        '</ul>'+
        '<p class="hint">An icon alone is not proof of offline readiness. Test an actual disconnected reload after visiting online.</p></section>'+
      '<section class="card"><h3>Technical signals on this device</h3>'+
        '<div class="kv"><span>Secure browser context</span><strong>'+(env.secureContext?"Yes":"Not confirmed")+'</strong></div>'+
        '<div class="kv"><span>Service worker supported</span><strong>'+(env.serviceWorkerSupported?"Yes":"No")+'</strong></div>'+
        '<div class="kv"><span>Service worker controlling page</span><strong>'+(env.serviceWorkerControlled?"Yes":"No / not yet")+'</strong></div>'+
        '<div class="kv"><span>Standalone display</span><strong>'+(installed?"Reported":"Not reported")+'</strong></div>'+
        '<div class="kv"><span>Offline cache audit</span><strong>'+e(status)+'</strong></div>'+
        '<button class="secondary small" type="button" data-action="offline-audit">Inspect cached app shell</button>'+
        '<p class="hint">These browser signals are not emergency safety or connectivity guarantees. Run the actual disconnected test yourself.</p></section>'+
    '</div>'+
    '<section class="section card"><div class="flex"><h3>Six practical pilot checks</h3>'+
      pill(progress.done+" / "+progress.total+" self-confirmed")+'</div>'+
      '<p class="hint">Mark only checks you actually performed in calm conditions. These do not certify safety or measure readiness.</p>'+
      '<ul class="clean pilot-tasks">'+PILOT_CHECKS.map(item=>
        '<li><label class="task"><input type="checkbox" data-action="pilot-check" data-id="'+e(item.id)+'" '+
          (pilot.checks[item.id]?"checked":"")+'><span><strong>'+e(item.title)+'</strong>'+
          '<small>'+e(item.description)+'</small></span></label></li>').join("")+'</ul>'+
      '<button type="button" class="secondary small" data-action="pilot-reset">Clear pilot test confirmations</button></section>'+
    '<section class="section card"><h3>Send ideas and report bugs</h3>'+
      '<p>Use the public GitHub forms for requests or test failures. Before sharing anything, remove identifying details and replace them with synthetic examples.</p>'+
      '<div class="top-actions">'+
        link("https://github.com/MichaelWave369/PhiSafe/issues/new?template=feature_request.yml","Suggest an improvement",e)+
        link("https://github.com/MichaelWave369/PhiSafe/issues/new?template=bug_report.yml","Report a bug",e)+
      '</div>'+
      '<div class="section-title"><h3>Optional privacy-safe test summary</h3></div>'+
      '<p class="hint">Download a small JSON summary containing only these six test results, the app version and five coarse browser capability signals. It deliberately omits all household data, browser identifiers, precise location, URLs and free-text comments. Inspect the file before attaching it anywhere.</p>'+
      '<button type="button" data-action="pilot-download">Download safe diagnostic summary</button>'+
    '</section>'+
    '<p class="hint">PhiSafe never sends this report automatically. This pilot does not monitor emergencies or supply live instructions. During an actual evacuation, follow authorities, not a test checklist.</p>'+
  '</div>';
}
