// PhiSafe Rung 3 rehearsal and paper load sheet, with all private strings escaped.
import { DRILL_STAGES, rehearsalReport, makeLoadSheet } from "./rung3.mjs";
const checks = (r, petId) => r.animalChecks[petId] || {located:false,secured:false,arrived:false};

export function renderDrill(state, {e,fmt,stat,pill}) {
  const report=rehearsalReport(state);
  const r=state.rehearsal;
  const mode=report.active ? "Practice running" : "No active rehearsal";
  const status=report.complete ? pill("All recorded practice checks met") : pill("Incomplete practice", "warning");
  const rows=state.pets.map((pet, i)=>{
    const mark=checks(r,pet.id);
    const assignment=state.loading.assignments.find(a=>a.petId===pet.id);
    const vehicle=assignment ? state.loading.vehicles.find(v=>v.id===assignment.vehicleId) : null;
    return '<tr><td>'+(i+1)+'. <strong>'+e(pet.name)+'</strong><div class="hint">'+e(pet.species)+' · '+e(pet.carrier||"Carrier not assigned")+'</div></td>'+
    '<td>'+e(vehicle?.name||"Unassigned")+(assignment?' / space '+assignment.slot:"")+'</td>'+
    ["located","secured","arrived"].map(key=>'<td><label class="task"><input type="checkbox" '+
      (mark[key]?"checked ":"")+(report.active?"":"disabled ")+
      'data-action="drill-pet" data-id="'+e(pet.id)+'" data-field="'+key+'"><span class="visually-hidden">'+
      e(key+" "+pet.name)+'</span></label></td>').join("")+'</tr>';
  }).join("");
  const stages=DRILL_STAGES.map(stage=>'<li><label class="task"><input type="checkbox" data-action="drill-stage" data-id="'+stage.id+'" '+
    (r.stageChecks[stage.id]?"checked ":"")+(report.active?"":"disabled ")+
    '><span>'+e(stage.text)+'</span></label></li>').join("");
  const hist=r.history.map(record=>
    '<tr><td>'+e(new Date(record.finishedAt).toLocaleString())+'</td><td>'+
      (record.status==="complete"?pill("Completed practice"):pill("Incomplete practice","warning"))+'</td><td>'+
      fmt(record.minutes)+' min</td><td>'+record.boarded+'/'+record.people+' people · '+
      record.animalsArrived+'/'+record.animals+' animals</td><td>'+e(record.notes||"—")+'</td></tr>'
  ).join("");
  return '<h2>Practice evacuation drill</h2>' +
    '<p class="lead">A guided, local-only <strong>rehearsal</strong> for getting everyone accounted for. This is not a live emergency response tool, and a completed practice is not a safety certification.</p>' +
    '<div class="danger-note"><strong>During a real emergency:</strong> Follow official instructions and leave when required. Do not delay to run a drill, mark checkboxes, or finish a timer. Secure the animals and complete real headcounts.</div>' +
    '<div class="section grid four">'+
      stat("Mode",mode,report.active?("Started "+new Date(r.startedAt).toLocaleString()):"Start when everyone is ready to practice")+
      stat("People boarded",report.peopleBoarded+" / "+report.people,"Recount at destination too")+
      stat("Animals secured",report.secured+" / "+report.animals,"Each animal has its own record")+
      stat("Animals recounted",report.arrived+" / "+report.animals,"Verify again on arrival")+
    '</div>' +
    '<div class="section card"><div class="flex"><div><h3>Rehearsal controls</h3><p class="hint">Begin a simulated exercise, or print the empty load sheet for paper-only practice.</p></div>'+status+'</div>'+
      '<div class="top-actions">'+(!report.active?
        '<button type="button" data-action="drill-start">Start a practice drill</button>':
        '<button type="button" data-action="drill-finish">Save drill result</button>'+
        '<button type="button" class="secondary" data-action="drill-cancel">Discard current drill</button>')+
        '<button type="button" class="secondary" data-action="print-loading">Print load sheet</button></div>'+
    '</div>' +
    (report.active ? '<div class="section grid two">'+
      '<section class="card"><h3>Departure preparation</h3><ul class="clean">'+stages+'</ul>'+
        '<p class="hint">These are self-confirmed steps; PhiSafe does not inspect route conditions, carrier fit or shelter availability.</p></section>'+
      '<section class="card"><h3>People and notes</h3><form id="drillPeopleForm" class="form-grid">'+
        '<div class="field"><label for="peopleBoarded">People boarded</label><input id="peopleBoarded" name="peopleBoarded" type="number" required min="0" max="999" step="1" value="'+r.peopleBoarded+'"></div>'+
        '<div class="field"><label for="peopleAtDestination">People at practice destination</label><input id="peopleAtDestination" name="peopleAtDestination" type="number" required min="0" max="999" step="1" value="'+r.peopleAtDestination+'"></div>'+
        '<div class="field full"><label for="drillNotes">What needs work?</label><textarea id="drillNotes" name="notes" maxlength="1000">'+e(r.notes)+'</textarea></div>'+
        '<div class="form-actions"><button type="submit">Save drill counts and notes</button></div></form></section></div>'+
      '<div class="section"><h3>Animal-by-animal checkpoint</h3><div class="card table-wrap"><table class="table"><thead><tr>'+
        '<th>Animal</th><th>Assigned space</th><th>Located</th><th>Secured</th><th>Recounted at destination</th>'+
        '</tr></thead><tbody>'+rows+'</tbody></table></div>'+
        '<p class="hint">Mark each stage only after you actually verify it during practice. Later marks cannot substitute for an earlier physical check.</p></div>':
      '<div class="section empty">Start a practice to record physical checks. Your vehicle assignments remain available in the Loading tab.</div>')+
    (report.active?'<div class="section">'+
      '<h3>Unresolved drill checks</h3>'+
      (report.warnings.length?'<div class="warning-note"><ul>'+report.warnings.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul></div>':
        '<div class="card">'+pill("All reported checks met")+' <span class="hint">This confirms user-recorded drill steps, not real-world safety.</span></div>')+
    '</div>':'')+
    '<div class="section"><h3>Recent practice records</h3>'+
      (r.history.length?'<div class="card table-wrap"><table class="table"><thead><tr><th>Date</th><th>Result</th><th>Elapsed</th><th>Headcount</th><th>Notes</th></tr></thead><tbody>'+
        hist+'</tbody></table></div>':'<div class="empty">No practice recorded yet. Saving an incomplete drill is useful too: it reveals what needs fixing.</div>')+
      '<p class="hint">Records stay in this browser and are included in private exports. Only the 20 most recent are kept.</p></div>';
}
export function printLoadingSheet(state, e) {
  const sheet=makeLoadSheet(state);
  const report=sheet.report;
  const plan=state.plan;
  const entry=(name,val)=>'<p><strong>'+e(name)+':</strong> '+e(val||"Not recorded")+'</p>';
  let html='<h1>PhiSafe · Paper evacuation load sheet</h1>'+
    '<p>Prepared '+e(new Date().toLocaleString())+' | People: '+report.people+' | Animals expected: '+report.expectedAnimals+'</p>'+
    '<p class="print-warn"><strong>Do not delay evacuation for paperwork.</strong> This is a private readiness aid, not real-time routing or approval. Check physical restraints, seats, ventilation, road status, and weather.</p>'+
    '<h2>Planning and contacts</h2>'+entry("Official alert zone",plan.alertZone)+
    entry("Primary destination",plan.meetingPlace)+entry("Backup destination",plan.backupPlace)+
    entry("Route A",plan.routeA)+entry("Route B",plan.routeB)+entry("Emergency contact",plan.emergencyContact)+
    '<h2>Vehicle loading overview</h2>';
  for (const v of state.loading.vehicles) {
    html+='<div class="break"><h3>'+e(v.name)+'</h3><p>People assigned: '+v.peopleAssigned+' / '+v.peopleSeats+
      ' declared seats | Animal spots: '+v.petSpaces+'</p><p>'+e(v.notes)+'</p></div>';
  }
  if(!state.loading.vehicles.length)html+='<p><strong>No vehicles entered. Transport has not been planned.</strong></p>';
  if(!report.allocationComplete) html+='<p class="print-warn">Vehicle/animal assignments are not complete. Verify the full group before relying on the plan.</p>';
  html+='<h2>Individual animal headcount</h2><table style="width:100%;border-collapse:collapse">'+
    '<thead><tr><th style="text-align:left">Animal</th><th style="text-align:left">Carrier</th><th style="text-align:left">Vehicle / spot</th><th>Found</th><th>Secured</th><th>Recounted</th></tr></thead><tbody>';
  for (const pet of sheet.rows) {
    html+='<tr><td>'+e(pet.name)+' ('+e(pet.species)+')</td><td>'+e(pet.carrier)+'</td><td>'+
      e(pet.vehicle)+(pet.space===null?'':(' / '+pet.space))+'</td>'+
      '<td style="text-align:center">[ ]</td><td style="text-align:center">[ ]</td><td style="text-align:center">[ ]</td></tr>';
  }
  html+='</tbody></table><h2>Departure and arrival</h2>'+
    '<p>[ ] Every person boarded and wearing a seat belt: _____ / '+report.people+'</p>'+
    '<p>[ ] Every animal physically secured: _____ / '+report.expectedAnimals+'</p>'+
    '<p>[ ] Every person recounted at safe destination: _____ / '+report.people+'</p>'+
    '<p>[ ] Every animal physically recounted at safe destination: _____ / '+report.expectedAnimals+'</p>'+
    '<p>[ ] Double-check emergency supplies, prescriptions, and paper records</p>'+
    '<p class="print-warn">Secure this sheet. It may show private names and destination details.</p>';
  return html;
}