// PhiSafe Rung 3: private rehearsal state, projections and print data.
// No location queries, time polling, alerts or external services.
import { loadingReport } from "./rung2.mjs";

const clean = (v, max = 500) => typeof v === "string"
  ? v.slice(0, max).replace(/[\u0000-\u001f]/g, "") : "";
const asCount = (v, limit = 999) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(limit, Math.floor(n))) : 0;
};
const timestamp = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT[\d:.+-]+Z?$/.test(value) &&
  Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

export const DRILL_STAGES = Object.freeze([
  { id: "route", text: "Check primary and alternative routes using official information" },
  { id: "destination", text: "Confirm the destination can accept everyone and all animals" },
  { id: "supplies", text: "Stage medications, water, animal food and grab-and-go bags" },
  { id: "access", text: "Verify vehicle, fuel/charge, restraint fit, ventilation and access" },
  { id: "offline", text: "Check a saved/printed plan without relying on an active connection" }
]);

export function defaultRung3() {
  return {
    rehearsal: {
      startedAt: null,
      stageChecks: {},
      animalChecks: {},
      peopleBoarded: 0,
      peopleAtDestination: 0,
      notes: "",
      history: []
    }
  };
}
export function normalizeRung3(raw, pets) {
  const fallback = defaultRung3();
  const r = raw?.rehearsal && typeof raw.rehearsal === "object" ? raw.rehearsal : {};
  const stageChecks = {};
  for (const stage of DRILL_STAGES) {
    if (r.stageChecks?.[stage.id] === true) stageChecks[stage.id] = true;
  }
  const animalChecks = {};
  const validIds = new Set(pets.map(p => p.id));
  for (const [id, value] of Object.entries(r.animalChecks || {})) {
    if (!validIds.has(id)) continue;
    animalChecks[id] = {
      located: value?.located === true,
      secured: value?.secured === true,
      arrived: value?.arrived === true
    };
  }
  const history = [];
  if (Array.isArray(r.history)) for (const record of r.history.slice(0, 20)) {
    if (record && typeof record === "object" && timestamp(record.finishedAt)) history.push({
      finishedAt: timestamp(record.finishedAt),
      minutes: Math.min(100000, Math.max(0, Number(record.minutes) || 0)),
      status: record.status === "complete" ? "complete" : "incomplete",
      people: asCount(record.people),
      animals: asCount(record.animals),
      boarded: asCount(record.boarded),
      animalsSecured: asCount(record.animalsSecured),
      animalsArrived: asCount(record.animalsArrived),
      warnings: Array.isArray(record.warnings) ? record.warnings.slice(0, 15).map(x => clean(x, 180)) : [],
      notes: clean(record.notes, 1000)
    });
  }
  return {rehearsal:{
    startedAt:timestamp(r.startedAt),
    stageChecks,animalChecks,
    peopleBoarded:asCount(r.peopleBoarded),
    peopleAtDestination:asCount(r.peopleAtDestination),
    notes:clean(r.notes,1000),
    history
  }};
}
export function rehearsalReport(state) {
  const r = state.rehearsal;
  const pets = state.pets;
  const people = state.household.people;
  const loading = loadingReport(state);
  const checked = DRILL_STAGES.filter(stage=>r.stageChecks[stage.id]).length;
  const located = pets.filter(p=>r.animalChecks[p.id]?.located).length;
  const secured = pets.filter(p=>r.animalChecks[p.id]?.secured).length;
  const arrived = pets.filter(p=>r.animalChecks[p.id]?.arrived).length;
  const warnings = [];
  if (people < 1) warnings.push("Set your people count before practicing.");
  if (!loading.rosterCountOk) warnings.push("Roster counts do not match the household and animal species totals.");
  if (!loading.allocationComplete) warnings.push("Vehicle passenger and animal-slot allocations are incomplete.");
  if (checked < DRILL_STAGES.length) warnings.push("Not all preparation stages were confirmed.");
  if (r.peopleBoarded !== people || r.peopleAtDestination !== people) warnings.push("People boarding or destination headcount is incomplete.");
  if (located !== pets.length || secured !== pets.length || arrived !== pets.length) warnings.push("Animal locate, secure or destination recount is incomplete.");
  for (const pet of pets) {
    const status=r.animalChecks[pet.id];
    if (status?.secured && !status?.located) {
      warnings.push("At least one animal was marked secured without being located.");
      break;
    }
  }
  for (const pet of pets) {
    const status=r.animalChecks[pet.id];
    if (status?.arrived && !status?.secured) {
      warnings.push("At least one animal was marked arrived without being secured.");
      break;
    }
  }
  return {
    active: Boolean(r.startedAt),
    people, animals: pets.length, expectedAnimals: loading.expectedAnimals,
    stageDone:checked, stageTotal:DRILL_STAGES.length,
    located,secured,arrived,
    peopleBoarded:r.peopleBoarded, peopleAtDestination:r.peopleAtDestination,
    warnings,
    complete: Boolean(r.startedAt) && warnings.length===0
  };
}
export function buildRehearsalRecord(state, now) {
  const report = rehearsalReport(state);
  if (!report.active) throw new Error("No active rehearsal to record.");
  const finishedAt = timestamp(now);
  if (!finishedAt) throw new Error("A valid completion time is required.");
  const start=Date.parse(state.rehearsal.startedAt);
  const end=Date.parse(finishedAt);
  return {
    finishedAt,
    minutes:Math.max(0,Math.round((end-start)/60000*10)/10),
    status:report.complete?"complete":"incomplete",
    people:report.people,
    animals:report.animals,
    boarded:report.peopleBoarded,
    animalsSecured:report.secured,
    animalsArrived:report.arrived,
    warnings:report.warnings.slice(0,15),
    notes:state.rehearsal.notes
  };
}
export function newRehearsal(existingHistory = [], date = new Date().toISOString()) {
  const fresh = defaultRung3().rehearsal;
  fresh.startedAt=timestamp(date);
  if (!fresh.startedAt) throw new Error("Invalid start date.");
  fresh.history=existingHistory.slice(0,20);
  return fresh;
}
export function makeLoadSheet(state) {
  const report=loadingReport(state);
  const pets=state.pets;
  const assignmentByPet=new Map(state.loading.assignments.map(a=>[a.petId,a]));
  const vehicleById=new Map(state.loading.vehicles.map(v=>[v.id,v]));
  return {
    report,
    rows:pets.map(p=>{
      const slot=assignmentByPet.get(p.id);
      const vehicle=slot?vehicleById.get(slot.vehicleId):null;
      return {
        name:p.name, species:p.species,
        carrier:p.carrier || "NOT ASSIGNED",
        vehicle:vehicle?.name || "UNASSIGNED",
        space:slot ? slot.slot : null,
        notes:p.notes || ""
      };
    })
  };
}
