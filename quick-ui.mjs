// PhiSafe Rung 7: offline quick view + printable paper card.
// Every household value must be escaped before insertion into markup.
import { QUICK_GUIDES, quickSnapshot, guideFor } from "./quick.mjs";
const unknown=(s,e)=>e(s||"Not recorded");
const actionRow=(name,value,e)=>'<div class="kv quick-kv"><span>'+e(name)+'</span><strong>'+unknown(value,e)+'</strong></div>';
const guideLinks=(selected,e)=>
  '<div class="quick-guide-picker" role="group" aria-label="Select a reference topic">'+
  QUICK_GUIDES.map(g=>'<button type="button" class="secondary small'+
    (selected===g.id?' quick-selected':'')+
    '" aria-pressed="'+(selected===g.id)+'" data-action="select-quick-guide" data-guide="'+
    e(g.id)+'">'+e(g.title)+'</button>').join("")+'</div>';

export function renderQuick(state, selectedGuide, {e,pill}) {
  const s=quickSnapshot(state);
  const guide=guideFor(selectedGuide);
  const noAnimals=s.expectedAnimals===0;
  const checks=s.gaps.length
    ?'<ul class="clean">'+s.gaps.map(item=>'<li>'+e(item)+'</li>').join("")+'</ul>'
    :'<p class="muted">No structural gaps detected from the entered data. This is NOT proof that any vehicle, route, or destination is safe.</p>';
  const vehicleRows=s.vehicles.length?s.vehicles.map(v=>
    '<li><strong>'+e(v.name)+'</strong><div class="hint">'+
      v.passengers+' people planned / '+v.seats+' entered seats; '+
      v.animalSpaces+' declared animal spaces</div></li>').join("")
    :'<li class="muted">No evacuation vehicles recorded</li>';
  const roster=s.animals.length?s.animals.map((pet,index)=>
    '<tr><td class="quick-number">'+(index+1)+'</td><td><strong>'+e(pet.name)+'</strong><small>'+
      e(pet.species)+'</small></td><td>'+e(pet.carrier)+'</td><td>'+
      e(pet.vehicle)+(pet.slot!==null?' / #'+pet.slot:'')+'</td></tr>').join("")
    :'<tr><td colspan="4">No individual animal roster entered.</td></tr>';
  return '<div class="quick-view">'+
    '<div class="flex quick-heading"><div><div class="eyebrow-small">Offline household reference · No live alerts</div>'+
      '<h2>Emergency Quick View</h2></div><button type="button" data-action="print-quick">Print quick reference</button></div>'+
    '<div class="danger-note quick-banner"><strong>Official instructions come first.</strong> This page does not detect emergencies, verify roads or issue evacuation orders. In danger, follow emergency responders. Do not delay departure to use an app.</div>'+
    '<div class="section grid three">'+
      '<div class="stat quick-stat"><div class="eyebrow-small">People</div><strong>'+s.people+'</strong><span>Entered household count</span></div>'+
      '<div class="stat quick-stat"><div class="eyebrow-small">Animals</div><strong>'+s.expectedAnimals+'</strong><span>'+s.dogs+' dogs · '+s.cats+' cats · '+s.otherPets+' other</span></div>'+
      '<div class="stat quick-stat"><div class="eyebrow-small">Animal assignments</div><strong>'+s.assigned+' / '+s.expectedAnimals+'</strong>'+
        '<span>'+(!noAnimals&&!s.allocationsEntered?'Incomplete entered allocation':'Verify physical restraints and fit')+'</span></div>'+
    '</div>'+
    '<div class="section grid two">'+
      '<section class="card"><h3>Saved destinations and routes</h3>'+
        actionRow("Primary destination",s.plan.primary,e)+
        actionRow("Alternative destination",s.plan.backup,e)+
        actionRow("Primary route notes",s.plan.routeA,e)+
        actionRow("Alternate route notes",s.plan.routeB,e)+
        actionRow("Official alert zone",s.plan.alertZone,e)+
        actionRow("Out-of-area contact",s.plan.contact,e)+
        '<p class="hint">Saved entries might be outdated. Verify current conditions with official local sources.</p></section>'+
      '<section class="card"><h3>What the saved plan is missing</h3>'+checks+
        '<div class="section-title"><h3>Declared transport</h3></div><ul class="clean">'+vehicleRows+'</ul>'+
        '<button class="secondary small" type="button" data-tab="loading">Open loading plan</button></section>'+
    '</div>'+
    '<section class="section card"><h3>Preparedness notes by hazard</h3>'+
      '<p class="hint">Reference information is preloaded and available offline. Choosing a topic does not mean that hazard is occurring locally.</p>'+
      guideLinks(guide.id,e)+
      '<h4>'+e(guide.title)+'</h4><ul class="clean">'+guide.reminders.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul>'+
      '<p class="hint">Guidance source: <a href="'+e(guide.url)+'" target="_blank" rel="noopener noreferrer">'+
        e(guide.sourceName)+'</a> (website requires internet). No current alert or road status is checked.</p></section>'+
    '<section class="section card"><div class="flex"><h3>Individual animal loading reference</h3>'+
      '<button class="secondary small" data-action="print-loading">Print detailed loading sheet</button></div>'+
      '<p class="hint">Planning records only. Do a physical count on departure and again at the destination. Do not rely on stale drill marks.</p>'+
      '<div class="table-wrap"><table class="table quick-table"><thead><tr><th>No.</th><th>Animal</th><th>Carrier</th><th>Planned travel position</th></tr></thead><tbody>'+
      roster+'</tbody></table></div></section>'+
    '<p class="hint">Personal data stays in browser local storage (not encrypted). A printed or downloaded copy may expose private contact details. Keep it secure.</p>'+
  '</div>';
}
export function printQuick(state,selectedGuide,e) {
  const s=quickSnapshot(state);
  const guide=guideFor(selectedGuide);
  const entry=(name,value)=>'<li><strong>'+e(name)+':</strong> '+unknown(value,e)+'</li>';
  let out='<h1>PhiSafe · Emergency Quick Reference</h1>'+
    '<p>Printed '+e(new Date().toLocaleString())+' · People: '+s.people+' · Dogs: '+s.dogs+' · Cats: '+s.cats+' · Other animals: '+s.otherPets+'</p>'+
    '<p class="print-warn">NOT A LIVE ALERT SERVICE. Follow official instructions and evacuate promptly when directed. Do not delay to finish a checklist. Keep this private.</p>'+
    '<h2>Destinations / contact / route notes</h2><ul>'+
      entry("Primary destination",s.plan.primary)+entry("Backup destination",s.plan.backup)+
      entry("Route A",s.plan.routeA)+entry("Route B",s.plan.routeB)+
      entry("Emergency contact",s.plan.contact)+entry("Alert zone",s.plan.alertZone)+
    '</ul>';
  out+='<h2>Declared vehicles</h2><ul>'+
    (s.vehicles.map(v=>'<li>'+e(v.name)+': '+v.passengers+'/'+v.seats+
      ' passengers, '+v.animalSpaces+' animal spaces (unverified physical fit)</li>').join("")||'<li>No vehicles recorded.</li>')+'</ul>';
  if(s.gaps.length)out+='<h2>Planning gaps</h2><ul>'+s.gaps.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul>';
  out+='<h2>Animal headcount ('+s.animals.length+' rostered / '+s.expectedAnimals+' expected)</h2>'+
    '<table><thead><tr><th>No.</th><th>Animal</th><th>Carrier</th><th>Planned vehicle / space</th><th>Depart</th><th>Arrive</th></tr></thead><tbody>'+
    (s.animals.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+e(p.name)+' ('+e(p.species)+')</td>'+
      '<td>'+e(p.carrier)+'</td><td>'+e(p.vehicle)+(p.slot!==null?' / '+p.slot:'')+
      '</td><td>[ ]</td><td>[ ]</td></tr>').join("")||'<tr><td colspan="6">No animal records entered.</td></tr>')+
    '</tbody></table>'+
    '<h2>'+e(guide.title)+' · Stored reference reminders</h2><ul>'+guide.reminders.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul>'+
    '<p>Source: '+e(guide.sourceName)+' · '+e(guide.url)+' (internet required for current updates)</p>'+
    '<p class="print-warn">Personal information shown here may be outdated. Verify plans, current conditions, and all physical animal headcounts.</p>';
  return out;
}
