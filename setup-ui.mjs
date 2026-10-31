// PhiSafe Rung 8 setup flow. HTML escaping is supplied by the app.
import {SETUP_STEPS,setupReport,mayAddAnimal} from "./setup.mjs";
const num=(label,name,value,max="10000000",step="1",min="0")=>
  '<label class="field"><span>'+label+'</span><input name="'+name+'" type="number" min="'+min+
  '" max="'+max+'" step="'+step+'" required value="'+value+'"></label>';
const txt=(label,name,value,e,max="300",placeholder="")=>
  '<label class="field"><span>'+label+'</span><input name="'+name+'" maxlength="'+max+
  '" value="'+e(value||"")+'" placeholder="'+e(placeholder)+'"></label>';
export function renderSetup(state,selected,{e,pill}) {
  const report=setupReport(state);
  const step=SETUP_STEPS.some(item=>item.id===selected)?selected:report.nextStep;
  const status=report.onboardingComplete?'All steps self-confirmed':'Next suggested step: '+
    (SETUP_STEPS.find(s=>s.id===report.nextStep)?.name||"Review");
  const nav=SETUP_STEPS.map((item,i)=>{
    const check=report.stages.find(s=>s.id===item.id);
    return '<button type="button" data-action="setup-step" data-id="'+item.id+'" class="setup-step'+
      (step===item.id?' selected':'')+'" aria-current="'+(step===item.id?'step':'false')+'">'+
      '<span class="setup-index">'+(check.done?'✓':i+1)+'</span><span><strong>'+e(item.name)+'</strong>'+
      '<small>'+(check.done?'Recorded':'Needs attention')+'</small></span></button>';
  }).join("");
  const heading=SETUP_STEPS.find(x=>x.id===step);
  const help='<p class="hint">All records stay in browser storage and are not encrypted at rest. '+
    'The encrypted vault protects downloaded backup files only. Never add actual household details to the public GitHub repository.</p>';
  let body="";
  if(step==="household"){
    const h=state.household;
    body='<p>Enter the people and animals you actually care for. A count of zero animals is valid. '+
      'Changing counts does not delete any existing animal records.</p>'+
      '<form id="setupHouseholdForm" class="form-grid">'+
        num("People in household","people",h.people,"999","1","1")+
        num("Dogs","dogs",h.dogs,"999")+
        num("Cats","cats",h.cats,"999")+
        num("Other animals","otherPets",h.otherPets,"999")+
        '<div class="form-actions"><button type="submit">Save household counts</button></div></form>'+
        '<p class="hint">For a first setup, record animals before planning transport. The wizard never invents animals, vehicles or destinations.</p>';
  } else if(step==="animals"){
    const nums=Object.keys(report.expected).map(species=>
      '<div class="setup-count"><strong>'+e(species)+'</strong><span>'+
      report.species[species]+' / '+report.expected[species]+' entered</span></div>').join("");
    body='<p>Each animal needs its own line, including its actual name and carrier or restraint plan. '+
      'The wizard never creates placeholder pets.</p><div class="grid three">'+nums+'</div>'+
      (report.missingCarriers?'<p class="warning-note">'+report.missingCarriers+
        ' existing animal(s) have no carrier recorded. Use the Animals tab to edit the roster safely.</p>':'')+
      '<form id="setupAnimalForm" class="form-grid">'+
        txt("Animal name","name","",e,"100","Enter the animal’s name")+
        '<label class="field"><span>Species</span><select name="species">'+
        ["dog","cat","other"].map(x=>'<option value="'+x+'" '+(!mayAddAnimal(state,x)?'disabled':'')+'>'+
          e(x[0].toUpperCase()+x.slice(1))+'</option>').join("")+'</select></label>'+
        txt("Carrier / safe restraint identifier","carrier","",e,"100","Real carrier or restrained place")+
        '<div class="form-actions"><button type="submit">Add animal to roster</button>'+
        '<button type="button" class="secondary" data-tab="animals">Open full animal roster</button></div></form>'+
      (report.expectedAnimals===0?'<p class="hint">No animals are declared. Skip this step if that is correct.</p>':'')+
      '<p class="hint">Do not mark a carrier as physically safe from the app alone. Confirm actual fit, restraint, and ventilation in person.</p>';
  } else if(step==="transport"){
    const load=report.stages.find(s=>s.id==="transport");
    body='<p>Use the existing Loading planner to record actual passenger seats and one secured travel space for each animal. '+
      'No one, including an animal, should ride inside a fifth-wheel while it is being towed.</p>'+
      '<div class="grid three">'+
        '<div class="stat"><span>Vehicles entered</span><strong>'+state.loading.vehicles.length+'</strong></div>'+
        '<div class="stat"><span>Animals assigned</span><strong>'+state.loading.assignments.length+
        ' / '+report.expectedAnimals+'</strong></div>'+
        '<div class="stat"><span>Passengers declared</span><strong>'+state.loading.vehicles.reduce((n,v)=>n+v.peopleAssigned,0)+
        ' / '+report.people+'</strong></div></div>'+
      '<p class="hint">'+e(load.reason)+'</p>'+
      '<button type="button" data-tab="loading">Open vehicle loading planner</button>'+
      '<p class="hint">A completed allocation represents entered data, not physically verified roadworthiness, carrier fit, air flow or legal seating.</p>';
  } else if(step==="destination"){
    const p=state.plan;
    body='<p>Write down two different destinations that have been contacted and can actually accept every person and animal, '+
      'plus two departure route notes. Stored routes cannot tell you whether roads are currently safe.</p>'+
      '<form id="setupDestinationForm" class="form-grid">'+
        txt("Primary destination","meetingPlace",p.meetingPlace,e,"300","Confirmed destination A")+
        txt("Separate alternative destination","backupPlace",p.backupPlace,e,"300","Confirmed destination B")+
        txt("Primary route notes","routeA",p.routeA,e,"300","From official route guidance")+
        txt("Alternate route notes","routeB",p.routeB,e,"300","If the primary route closes")+
        txt("Out-of-area emergency contact (optional)","emergencyContact",p.emergencyContact,e,"300","Keep private")+
        '<div class="form-actions"><button type="submit">Save departure plan</button></div></form>';
  } else if(step==="essentials"){
    const h=state.household;
    body='<p>Enter supplies you actually have, not planned purchases. The human water baseline is '+
      '<strong>at least '+report.humanWaterMinimum+' gallon(s) for three days</strong>; the animal amount must come from your own measured needs or veterinary guidance.</p>'+
      '<form id="setupEssentialsForm" class="form-grid">'+
        num("Human water stored (gallons)","humanWaterGallons",h.humanWaterGallons,"10000000","0.1")+
        num("Animal water daily need (gallons)","animalWaterDailyGallons",h.animalWaterDailyGallons,"10000000","0.1")+
        num("Animal water stored (gallons)","animalWaterGallons",h.animalWaterGallons,"10000000","0.1")+
        num("People food (days)","peopleFoodDays",h.peopleFoodDays,"10000000","0.5")+
        num("Dog food (days)","dogFoodDays",h.dogFoodDays,"10000000","0.5")+
        num("Cat food (days)","catFoodDays",h.catFoodDays,"10000000","0.5")+
        num("Other animal food (days)","otherPetsFoodDays",h.otherPetsFoodDays,"10000000","0.5")+
        num("Essential medications (days)","medsDays",h.medsDays,"10000000","0.5")+
        '<div class="form-actions"><button type="submit">Save three-day supply amounts</button>'+
        '<button type="button" class="secondary" data-tab="supplies">Open full inventory</button></div></form>'+
      (report.manifestGaps.length?'<div class="warning-note"><strong>Current supply gaps</strong><ul>'+
        report.manifestGaps.map(x=>'<li>'+e(x)+'</li>').join("")+'</ul></div>':'');
  } else {
    const reviewed=state.setup.backupReviewedAt;
    body='<p>Make two independent recovery options: a private printed sheet and a current encrypted file '+
      'you have personally tested restoring. PhiSafe cannot confirm that a file has been safely saved on another device.</p>'+
      '<div class="top-actions"><button type="button" data-tab="vault">Open encrypted backup vault</button>'+
        '<button type="button" class="secondary" data-action="print-quick">Print emergency quick card</button>'+
        '<button type="button" class="secondary" data-action="print-loading">Print animal load sheet</button></div>'+
      '<label class="task setup-manual-confirm"><input type="checkbox" data-action="setup-backup-review" '+
        (reviewed?'checked':'')+
        '><span>I have protected a printed plan and tested recovering my own backup.'+
        '<small>This is your manual confirmation, not verification by PhiSafe. Later saved edits clear this mark, reminding you to make a new backup. '+
        (reviewed?'Last confirmed: '+e(new Date(reviewed).toLocaleString()):'Not yet confirmed')+
        '</small></span></label>';
  }
  return '<div class="setup-view"><h2>Guided household setup</h2>'+
    '<p class="lead">Build your first practical plan one step at a time, or return whenever something changes. '+
    'The steps describe entered information and self-confirmations, not an evacuation safety certificate.</p>'+
    '<div class="card setup-summary"><div class="flex"><strong>'+report.completed+' of '+report.total+
      ' setup steps recorded</strong>'+pill(report.onboardingComplete?'Review regularly':'Incomplete','warning')+
      '</div><progress max="'+report.total+'" value="'+report.completed+'" aria-label="Recorded setup steps"></progress>'+
      '<p class="hint">'+e(status)+'</p></div>'+
    '<div class="section setup-layout"><nav aria-label="Guided setup steps" class="setup-nav">'+nav+'</nav>'+
    '<section class="card setup-panel"><span class="eyebrow-small">STEP '+
      (SETUP_STEPS.findIndex(x=>x.id===step)+1)+' OF '+report.total+'</span><h3>'+e(heading.name)+'</h3>'+
      '<p class="hint">'+e(heading.description)+'</p>'+body+
      '<div class="setup-footer top-actions"><button type="button" class="secondary" data-action="setup-next">Next step</button>'+
      '<button type="button" class="secondary" data-tab="overview">Go to full dashboard</button></div>'+
      help+'</section></div>'+
    '<p class="hint">Never wait for a setup wizard during an actual emergency. Follow official evacuation instructions immediately.</p></div>';
}
