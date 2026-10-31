// PhiSafe Rung 2 view markup. All untrusted values are HTML-escaped by the caller.
import { BAG_ITEMS, loadingReport, powerReport, manifestReport } from "./rung2.mjs";

const numberInput = (label, name, value, {step="1",max="10000000",help="",min="0"}={}) =>
  '<div class="field"><label for="' + name + '">' + label + '</label>' +
  '<input id="' + name + '" name="' + name + '" type="number" min="' + min + '" max="' + max +
  '" step="' + step + '" value="' + value + '" required>' +
  (help ? '<small>' + help + '</small>' : '') + '</div>';

export function renderLoading(state, {e,fmt,stat,pill}) {
  const r=loadingReport(state);
  const slotsUsed = r.assignedAnimals;
  const cards = r.occupancy.map(v => {
    const allocations = v.spaces.map(s =>
      '<div class="load-slot ' + (s.pet ? "occupied" : "empty-slot") + '" aria-label="' +
      e(s.pet ? "Slot "+s.slot+": "+s.pet.name : "Slot "+s.slot+": empty") + '">' +
      '<span class="slot-number">ANIMAL SPACE ' + s.slot + '</span><strong>' + e(s.pet ? s.pet.name : "Unassigned") +
      '</strong></div>').join("");
    return '<section class="card vehicle-card"><div class="flex"><div><div class="eyebrow-small">' +
      e(v.kind) + ' / declared layout</div><h3>' + e(v.name) + '</h3></div>' +
      '<button type="button" class="danger small" data-action="delete-vehicle" data-id="' + e(v.id) + '">Remove vehicle</button></div>' +
      '<div class="vehicle-schematic"><div class="vehicle-cabin"><strong>PASSENGERS</strong><span>' +
      fmt(v.peopleAssigned) + ' assigned / ' + fmt(v.peopleSeats) + ' declared seat(s)</span></div>' +
      '<div class="seat-layout">' + (allocations || '<div class="muted">No animal spaces configured.</div>') + '</div></div>' +
      (v.passengersOverCapacity ? '<div class="danger-note">Assigned passengers exceed the number of entered seats.</div>' : '') +
      '<form class="form-grid compact-form" data-form="edit-vehicle" data-id="' + e(v.id) + '">' +
      '<div class="field"><label>Vehicle name<input name="name" maxlength="100" required value="' + e(v.name) + '"></label></div>' +
      '<div class="field"><label>Type<select name="kind">' +
      ["car","truck","van","other"].map(kind=>'<option value="' + kind + '" ' + (v.kind===kind?"selected":"") + '>' + kind + '</option>').join("") +
      '</select></label></div>' +
      '<div class="field"><label>Passenger seats<input name="peopleSeats" type="number" min="0" max="40" step="1" required value="' + v.peopleSeats + '"></label></div>' +
      '<div class="field"><label>Passengers assigned<input name="peopleAssigned" type="number" min="0" max="40" step="1" required value="' + v.peopleAssigned + '"></label></div>' +
      '<div class="field"><label>Secure animal spaces<input name="petSpaces" type="number" min="0" max="64" step="1" required value="' + v.petSpaces + '"></label></div>' +
      '<div class="field"><label>Layout notes<input name="notes" maxlength="300" value="' + e(v.notes) + '" placeholder="Exact restraint or carrier positions"></label></div>' +
      '<div class="form-actions"><button class="secondary small" type="submit">Update vehicle layout</button></div></form>' +
      '<p class="hint">Declared slots are a planning sketch, not a tested vehicle fit or ventilation check.</p></section>';
  }).join("");

  const spaces = r.occupancy.flatMap(v => v.spaces.map(s => ({
    value:v.id+":"+s.slot,
    name:v.name+" / animal space "+s.slot,
    occupiedBy:s.pet?.id || null
  })));
  const petRows = state.pets.map(p => {
    const assignment=state.loading.assignments.find(x=>x.petId===p.id);
    const assigned=assignment ? assignment.vehicleId+":"+assignment.slot : "";
    return '<div class="pet-assignment"><div><strong>' + e(p.name) + '</strong><div class="hint">' +
      e(p.species) + ' · ' + e(p.carrier || "Carrier not assigned in roster") + '</div></div>' +
      '<label class="field">Vehicle / animal space<select data-action="assign-pet-space" data-id="' + e(p.id) + '">' +
      '<option value="">Unassigned</option>' +
      spaces.map(s=>'<option value="' + e(s.value) + '" ' + (assigned===s.value?"selected":"") +
      ' ' + (s.occupiedBy && s.occupiedBy!==p.id?"disabled":"") + '>' + e(s.name + (s.occupiedBy && s.occupiedBy!==p.id?" (occupied)":"")) +
      '</option>').join("") + '</select></label></div>';
  }).join("");

  return '<h2>Evacuation loading planner</h2><div class="section-title"><span class="hint">Printable vehicle and animal load sheet</span><button type="button" class="secondary small" data-action="print-loading">Print vehicle load sheet</button></div>' +
    '<p class="lead">Map actual passenger seats and secured animal spaces to each vehicle. Assignment is not proof that the layout is safe. Rehearse it before an emergency.</p>' +
    '<div class="section grid three">' +
      stat("People",r.assignedPeople+" / "+r.people,"Assigned to vehicle seats") +
      stat("Animals",slotsUsed+" / "+r.expectedAnimals,"Assigned to secured spaces") +
      stat("Allocation",r.allocationComplete?"Complete":"Incomplete","Requires physical verification") +
    '</div>' +
    '<div class="warning-note"><strong>Safety boundary:</strong> Do not transport people or animals inside a towed fifth-wheel. Each animal needs an appropriate secured position, ventilation and accessible climate control. Vehicle layout and capacity must be checked in person. Never delay an evacuation to use PhiSafe.</div>' +
    '<div class="section">' +
      '<div class="section-title"><h3>Vehicle layouts (' + r.occupancy.length + ')</h3></div>' +
      (cards ? '<div class="grid two">' + cards + '</div>' : '<div class="empty">No evacuation vehicles entered. Add the vehicles you have access to, not ones you hope to obtain.</div>') +
    '</div>' +
    '<div class="section card"><h3>Add an evacuation vehicle</h3>' +
    '<form class="form-grid" id="vehicleAddForm">' +
      '<div class="field"><label for="vehicleName">Vehicle label</label><input id="vehicleName" name="name" maxlength="100" required placeholder="Example: blue van"></div>' +
      '<div class="field"><label for="vehicleKind">Vehicle type</label><select id="vehicleKind" name="kind"><option value="car">Car</option><option value="truck">Truck</option><option value="van">Van</option><option value="other">Other passenger vehicle</option></select></div>' +
      numberInput("Seat-belted passenger seats","vehicleSeats",0,{max:"40"}) .replace('name="vehicleSeats"','name="peopleSeats"') +
      numberInput("People assigned to vehicle","vehiclePeople",0,{max:"40"}) .replace('name="vehiclePeople"','name="peopleAssigned"') +
      numberInput("Secure animal spaces","vehicleSpaces",0,{max:"64"}) .replace('name="vehicleSpaces"','name="petSpaces"') +
      '<div class="field"><label for="vehicleNotes">Notes</label><input id="vehicleNotes" name="notes" maxlength="300" placeholder="Crate fit and seating notes"></div>' +
      '<div class="form-actions"><button type="submit">Add vehicle</button></div>' +
    '</form></div>' +
    '<div class="section card"><div class="section-title"><h3>Assign each animal once</h3>' +
      (r.unassignedPets.length ? pill(r.unassignedPets.length+" unassigned","warning") : pill(r.assignedAnimals+" assigned")) +
      '</div>' + (petRows || '<div class="empty">Add animals in the Animal Roster tab first.</div>') + '</div>' +
    (!r.rosterCountOk ? '<p class="danger-note">Animal roster is incomplete or species counts disagree with Household. Resolve this before treating allocations as complete.</p>' : '') +
    '<p class="hint">Tip: use one spot for one animal, with a real carrier or approved restraint. Do not assume one crate can safely hold multiple animals.</p>';
}
export function renderPower(state, {e,fmt,stat,pill}) {
  const p=state.power, r=powerReport(state);
  const days = r.estimatedDays===null ? "Unknown" : fmt(r.estimatedDays)+" days";
  const supplied = r.effectiveWh===null ? "Unknown" : fmt(r.effectiveWh)+" Wh";
  const extra = r.ratedInverter===null ? "Enter continuous inverter rating to check the simultaneous load." :
    r.overInverter ? "Combined listed simultaneous load exceeds entered inverter rating." :
    "Listed simultaneous load does not exceed the inverter continuous rating. Startup surges are not modeled.";
  const devices=p.devices.map(d=>'<tr><td>'+e(d.name)+'</td><td>'+fmt(d.watts)+' W</td><td>'+
    fmt(d.hoursPerDay)+' h</td><td>'+(d.simultaneous?'Yes':'No')+'</td><td>' +
    '<button type="button" class="danger small" data-action="delete-power-device" data-id="'+e(d.id)+'">Remove</button></td></tr>').join("");
  return '<h2>Backup power planner</h2><p class="lead">Estimate energy requirements for critical devices using measured or manufacturer-provided wattage. This is a rough planning calculation, not an electrical installation design.</p>' +
    '<div class="section grid three">' +
      stat("Estimated daily use",fmt(r.dailyWh)+" Wh","Based on listed use hours") +
      stat("Usable battery estimate",supplied,"After entered assumptions") +
      stat("Estimated autonomy",days,"No charging or solar modeled") +
    '</div><div class="section grid two">' +
    '<section class="card"><h3>Battery and inverter assumptions</h3><form id="powerSettingsForm" class="form-grid">' +
      numberInput("Battery rated energy (Wh)","batteryWh",p.batteryWh,{help:"Use nameplate Wh, not amp-hours without conversion."}) +
      numberInput("Usable battery capacity (%)","usablePercent",p.usablePercent,{max:"100",help:"Assumption, not a battery guarantee."}) +
      numberInput("Inverter efficiency (%)","inverterEfficiencyPercent",p.inverterEfficiencyPercent,{max:"100",help:"Assumption, adjust to the actual equipment."}) +
      numberInput("Continuous inverter rating (W)","inverterContinuousW",p.inverterContinuousW,{max:"100000",help:"0 means unknown."}) +
      '<div class="form-actions"><button type="submit">Save power assumptions</button></div></form></section>' +
    '<section class="card"><h3>Three-day energy gap</h3>' +
      '<div class="kv"><span>Daily demand</span><strong>'+fmt(r.dailyWh)+' Wh</strong></div>' +
      '<div class="kv"><span>3-day demand</span><strong>'+(r.threeDayNeedWh===null?'Unknown':fmt(r.threeDayNeedWh)+' Wh')+'</strong></div>' +
      '<div class="kv"><span>Rated battery for three days</span><strong>'+(r.ratedBatteryForThreeDaysWh===null?'Unknown':fmt(r.ratedBatteryForThreeDaysWh)+' Wh')+'</strong></div>' +
      '<div class="kv"><span>Simultaneous listed load</span><strong>'+fmt(r.simultaneousW)+' W</strong></div>' +
      '<div class="kv"><span>Inverter status</span><strong>'+ (r.ratedInverter===null?'Unknown':r.overInverter?'Above rating':'Within entered rating')+'</strong></div>' +
      '<p class="hint">'+e(extra)+'</p>' +
      (r.incompleteDevices ? '<p>'+pill(r.incompleteDevices+" device(s) with incomplete watts or hours","warning")+'</p>' : '') +
    '</section></div>' +
    '<div class="section card"><h3>Add a critical device</h3><form class="form-grid" id="powerDeviceForm">' +
      '<div class="field"><label for="deviceName">Device</label><input id="deviceName" name="name" required maxlength="100" placeholder="Example: internet modem"></div>' +
      numberInput("Draw (watts)","deviceWatts",0,{step:"0.1",max:"100000",help:"Measure or verify device draw."}).replace('name="deviceWatts"','name="watts"') +
      numberInput("Hours used per day","deviceHours",0,{step:"0.25",max:"24"}).replace('name="deviceHours"','name="hoursPerDay"') +
      '<div class="field"><label class="task"><input type="checkbox" name="simultaneous" checked>May run alongside other listed devices</label><small>Use for a conservative simultaneous power check.</small></div>' +
      '<div class="form-actions"><button type="submit">Add power load</button></div></form>' +
      '<div class="section-title"><h3>Devices ('+p.devices.length+')</h3></div>' +
      (devices ? '<div class="table-wrap"><table class="table"><thead><tr><th>Device</th><th>Watts</th><th>Daily hours</th><th>Concurrent</th><th>Action</th></tr></thead><tbody>'+devices+'</tbody></table></div>' :
      '<div class="empty">No equipment entered. Add devices you truly need to power.</div>') +
    '</div><div class="danger-note"><strong>Critical limitations:</strong> Battery estimates do not include startup surges, inverter idle draw, aging, temperature, solar charging or emergency reserves. Do not use this calculator to size life-support equipment. Never run a fuel generator inside or near an RV: run it outdoors at least 20 feet from doors, windows and vents, with exhaust directed away and working carbon-monoxide alarms.</div>';
}
function groupItems(group, all, packed, e) {
  return '<ul class="clean">'+all.filter(item=>item.group===group).map(item=>
    '<li><label class="task"><input type="checkbox" data-action="toggle-manifest" data-id="'+e(item.id)+'" '+
    (packed[item.id]?'checked':'')+'><span>'+e(item.label)+'</span></label></li>').join("")+'</ul>';
}
export function renderGoBags(state, {e,fmt,stat,pill}) {
  const r=manifestReport(state);
  return '<h2>72-hour grab-and-go manifest</h2>' +
    '<p class="lead">A printable, itemized evacuation checklist for people, animals and shared supplies. Packing for 72 hours is a minimum escape-kit starting point, not a substitute for your longer household reserves.</p>' +
    '<div class="section grid three">'+
      stat("People water",fmt(r.humanWaterGallons)+" gal","3 days at 1 gallon/person/day") +
      stat("Animal water",r.animalWaterGallons===null?"Unknown":fmt(r.animalWaterGallons)+" gal","3 days using your recorded daily need") +
      stat("Checklist",r.packedCount+" / "+r.total,"Marked packed, not verified by PhiSafe") +
    '</div><div class="section flex"><p class="hint">Carry water safely with vehicle weight and handling limits in mind.</p><button type="button" data-action="print-manifest">Print 72-hour manifest</button></div>' +
    (r.gaps.length ? '<div class="warning-note"><strong>Supply gaps to check:</strong><ul>'+r.gaps.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul></div>' : '') +
    '<div class="section grid two">' +
      '<section class="card"><h3>People kit</h3>'+groupItems("people",r.all,state.manifest.packed,e)+'</section>' +
      '<section class="card"><h3>Animal kit</h3>'+(r.all.some(x=>x.group==="pets")?groupItems("pets",r.all,state.manifest.packed,e):'<p class="muted">No animals configured.</p>')+'</section>' +
      '<section class="card"><h3>Shared departure supplies</h3>'+groupItems("shared",r.all,state.manifest.packed,e)+'</section>' +
      '<section class="card"><h3>Individual animal check</h3>' +
        (r.petRows.length?groupItems("individual",r.all,state.manifest.packed,e):'<p class="muted">Add each animal in the Animals tab.</p>') +
        '<p class="hint">Only mark an animal bag packed after checking its labeled carrier, food, records, water and medications.</p></section>' +
    '</div><p class="hint">Private roster names and destinations are saved on this browser only. Printed sheets and JSON exports contain plaintext sensitive details.</p>';
}
export function manifestPrint(state, escape) {
  const r=manifestReport(state);
  const e=escape;
  const groups=[
    {id:"people",title:"People go bags"},
    {id:"pets",title:"Animal go bags"},
    {id:"shared",title:"Shared departure kit"},
    {id:"individual",title:"One-by-one animal loading and kit verification"}
  ];
  let content = '<h1>PhiSafe · 72-hour departure manifest</h1>' +
    '<p>Prepared: '+e(new Date().toLocaleString())+' · People: '+state.household.people+
    ' · Animals expected: '+(state.household.dogs+state.household.cats+state.household.otherPets)+'</p>' +
    '<p class="print-warn">This is a planning checklist, not a live alert or evacuation authority. Do not delay departure to finish it. Keep it private.</p>' +
    '<h2>Water minimum for 72 hours</h2><p>People: '+r.humanWaterGallons+' gallons (at least 1/person/day). Animals: '+
    (r.animalWaterGallons===null?'Unknown; verify species and individual needs':r.animalWaterGallons+' gallons from entered daily requirement')+
    '. Confirm vehicle cargo limits and storage.</p>';
  if(r.gaps.length) content+='<h2>Supply gaps / unknowns</h2><ul>'+r.gaps.map(g=>'<li>'+e(g)+'</li>').join("")+'</ul>';
  for(const group of groups) {
    const rows=r.all.filter(item=>item.group===group.id);
    if(!rows.length) continue;
    content+='<div class="break"><h2>'+group.title+'</h2><ul>'+rows.map(item=>
      '<li>'+(state.manifest.packed[item.id]?'[x]':'[ ]')+' '+e(item.label)+'</li>').join("")+'</ul></div>';
  }
  const p=state.plan;
  content+='<div class="break"><h2>Evacuation contacts</h2>' +
    '<p>Primary destination: '+e(p.meetingPlace||"Not recorded")+'<br>Backup destination: '+
    e(p.backupPlace||"Not recorded")+'<br>Emergency contact: '+e(p.emergencyContact||"Not recorded")+'</p></div>' +
    '<p class="print-warn">Fuel generators outdoors only, at least 20 feet away from entrances, windows and vents; protect against carbon monoxide.</p>';
  return content;
}