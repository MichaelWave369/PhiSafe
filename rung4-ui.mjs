// Rung 4 field readiness view and printable field card. Escape all user data.
import { FIELD_CHECKS, assessFieldReadiness } from "./rung4.mjs";

export function renderField(state, offlineResult, {e,pill}) {
  const report=assessFieldReadiness(state);
  const count=report.gaps.length;
  const group=(title,items)=>'<section class="card"><h3>'+e(title)+' ('+items.length+')</h3>'+
    (items.length?'<ul class="clean">'+items.map(g=>
      '<li><strong>'+e(g.title)+'</strong><div class="hint">'+e(g.explanation)+'</div></li>').join("")+'</ul>':
      '<p class="muted">No gaps detected in this group. Review actual physical conditions anyway.</p>')+'</section>';
  const checks=report.fieldStatuses.map(item=>
    '<li><label class="task"><input type="checkbox" data-action="field-verify" data-id="'+e(item.id)+'"'+
      (item.checkedAt?' checked':'')+'><span><strong>'+e(item.name)+'</strong><span class="hint" style="display:block">'+
      e(item.help)+'</span><small class="muted">'+
      (item.checkedAt ? 'Self-confirmed '+e(new Date(item.checkedAt).toLocaleDateString())+
        (item.reviewSuggested?' · Review again (over 30 days)':'') : 'Not yet self-confirmed')+
      '</small></span></label></li>').join("");
  const audit=offlineResult ?
    '<div class="card"><div class="flex"><strong>Cache audit result</strong>'+pill(offlineResult.status,offlineResult.status==="cached"?"":"warning")+
    '</div><p>'+e(offlineResult.message)+'</p><p>'+offlineResult.count+
    ' of '+offlineResult.total+' expected app paths found in the browser cache</p>'+
    (offlineResult.missing.length?'<div class="hint">Missing paths: '+offlineResult.missing.map(e).join(", ")+'</div>':"")+
    '</div>' :
    '<div class="empty">Cache audit not run on this device. A connected/online indicator is not an offline test.</div>';
  return '<h2>Field readiness & offline verification</h2>'+
    '<p class="lead">Spot practical gaps and record checks you have physically performed. No safety score, no simulated certification, and no online dependency for your saved plan.</p>'+
    '<div class="danger-note"><strong>In a real emergency:</strong> do not delay evacuation to resolve a checklist or audit an app. Leave as directed and follow trusted local information.</div>'+
    '<div class="section grid three">'+
      group("Essential plan gaps",report.essentials)+
      group("Supplies & practice",report.important)+
      group("Physical confirmations",report.verifications)+
    '</div>'+
    '<div class="section flex"><p class="hint">'+count+' missing or unconfirmed planning items. This is not a safety rating.</p>'+
      '<button type="button" data-action="print-field">Print quick-reference field card</button></div>'+
    '<div class="section card"><h3>Verify in real life</h3>'+
      '<p class="hint">Only mark something after you have personally verified it. Marking stores the date locally. Recheck whenever conditions or vehicles change.</p>'+
      '<ul class="clean">'+checks+'</ul>'+
      '<form id="fieldNotesForm" class="form-grid"><div class="field full"><label for="fieldNotes">Private field observations</label>'+
      '<textarea id="fieldNotes" name="notes" maxlength="1200" placeholder="What needs repair, replacement, rehearsal or further confirmation?">'+e(state.field.notes)+'</textarea></div>'+
      '<div class="form-actions"><button type="submit">Save observations</button></div></form></div>'+
    '<div class="section card"><h3>Offline application file audit</h3>'+
      '<p>Checks whether this browser has the current application shell cached. It does <strong>not</strong> test internet disconnection, all browser storage policies, or live emergency information.</p>'+
      '<div class="top-actions"><button type="button" data-action="offline-audit">Check cached app files</button>'+
      '<button type="button" class="secondary" data-action="print-field">Print field card</button></div>'+
      '<div class="section">'+audit+'</div>'+
      '<div class="warning-note"><strong>Complete the real test:</strong> while connected, open this app, reload once, export your private plan, then disable Wi-Fi and cellular data. Close and reopen the app and verify plans and print view still work. Only then mark the offline physical confirmation above. Do not use airplane mode to block emergency alerts during a real incident.</div>'+
    '</div>';
}

export function printFieldCard(state, e) {
  const report=assessFieldReadiness(state);
  const p=state.plan,h=state.household;
  const row=(name,value)=>'<li><strong>'+e(name)+':</strong> '+e(value || "Not entered")+'</li>';
  const title='<h1>PhiSafe · Family field reference</h1><p>Printed '+e(new Date().toLocaleString())+
    ' | People: '+h.people+' | Animals: '+(h.dogs+h.cats+h.otherPets)+'</p>'+
    '<p class="print-warn">Personal, private plan. NOT a live emergency alert. Follow authorities and leave without delay when required.</p>';
  const contact='<h2>Contacts, routes and destinations</h2><ul>'+
    row("Emergency contact",p.emergencyContact)+row("Alert zone",p.alertZone)+
    row("Primary destination",p.meetingPlace)+row("Backup destination",p.backupPlace)+
    row("Route A",p.routeA)+row("Route B",p.routeB)+'</ul>';
  const vehicles='<h2>Transport assigned</h2><ul>'+
    (state.loading.vehicles.map(v=>'<li>'+e(v.name)+': '+v.peopleAssigned+'/'+v.peopleSeats+
       ' passengers, '+v.petSpaces+' animal slots (declared; verify physical fit)</li>').join("")||
       '<li>No vehicles entered</li>')+'</ul>';
  const issues='<h2>Critical planning gaps and reminders</h2><ul>'+
    (report.gaps.filter(g=>g.priority!=="verify").map(g=>'<li>[ ] '+e(g.title)+'</li>').join("")||
       '<li>No gaps identified by entered data. Physical verification is still required.</li>')+
    '</ul>';
  const checks='<h2>Field confirmation</h2><ul>'+FIELD_CHECKS.map(item=>
    '<li>['+(state.field.checks[item.id]?'x':' ')+'] '+e(item.name)+'</li>').join("")+'</ul>';
  const note='<h2>Field observations</h2><p>'+e(state.field.notes||"None recorded")+'</p>'+
    '<p class="print-warn">For detailed individual animal loading checks, print the dedicated Loading Sheet and 72-hour manifest.</p>';
  return title+contact+vehicles+issues+checks+note;
}
