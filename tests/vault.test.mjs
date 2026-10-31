import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {defaultState,normalizeState} from "../core.mjs";
import {encryptPlan,decryptPlan,isEncryptedBackup,VAULT_FORMAT,VAULT_VERSION,VAULT_ITERATIONS} from "../vault.mjs";

const phrase="nine blue comets cross the quiet sky";
function synthetic(){
  const s=defaultState();
  s.household.people=2;s.household.dogs=8;s.household.cats=9;
  s.pets=[
    ...Array.from({length:8},(_,i)=>({id:"d"+i,name:"Demo Dog "+i,species:"dog",carrier:"Crate D"+i})),
    ...Array.from({length:9},(_,i)=>({id:"c"+i,name:"Demo Cat "+i,species:"cat",carrier:"Crate C"+i}))
  ];
  s.plan.meetingPlace="Sample route destination; synthetic data only";
  return normalizeState(s);
}
test("AES-GCM/PBKDF2 roundtrip for a synthetic 2-person 17-animal backup",async()=>{
  const s=synthetic();
  const encrypted=await encryptPlan(s,phrase,webcrypto);
  assert.equal(encrypted.format,VAULT_FORMAT);
  assert.equal(encrypted.version,VAULT_VERSION);
  assert.equal(encrypted.kdf.iterations,VAULT_ITERATIONS);
  assert.equal(isEncryptedBackup(encrypted),true);
  const serial=JSON.stringify(encrypted);
  assert.equal(serial.includes("Demo Dog"),false);
  assert.equal(serial.includes("Sample route"),false);
  assert.equal(serial.includes(phrase),false);
  const restored=await decryptPlan(JSON.parse(serial),phrase,webcrypto);
  assert.equal(restored.household.people,2);
  assert.equal(restored.pets.length,17);
  assert.equal(restored.plan.meetingPlace,s.plan.meetingPlace);
  assert.deepEqual(restored,s);
});
test("each export has independent random salt and IV",async()=>{
  const a=await encryptPlan(synthetic(),phrase,webcrypto);
  const b=await encryptPlan(synthetic(),phrase,webcrypto);
  assert.notEqual(a.kdf.salt,b.kdf.salt);
  assert.notEqual(a.cipher.iv,b.cipher.iv);
  assert.notEqual(a.ciphertext,b.ciphertext);
});
test("wrong passphrase and tampering fail authentication",async()=>{
  const a=await encryptPlan(synthetic(),phrase,webcrypto);
  await assert.rejects(()=>decryptPlan(a,"another long passphrase 123",webcrypto),/Unable to decrypt/);
  const altered=structuredClone(a);
  const ch=altered.ciphertext[0];
  altered.ciphertext=(ch==="A"?"B":"A")+altered.ciphertext.slice(1);
  await assert.rejects(()=>decryptPlan(altered,phrase,webcrypto),/Unable to decrypt/);
});
test("rejects bogus envelopes before expensive key derivation",async()=>{
  const a=await encryptPlan(synthetic(),phrase,webcrypto);
  await assert.rejects(()=>decryptPlan({schema:1},phrase,webcrypto),/Unsupported/);
  await assert.rejects(()=>decryptPlan({...a,kdf:{...a.kdf,iterations:99999999}},phrase,webcrypto),/Unsupported/);
  await assert.rejects(()=>decryptPlan({...a,cipher:{...a.cipher,iv:"AA=="}},phrase,webcrypto),/parameters/);
});
test("rejects weak or missing passwords, and unsupported crypto",async()=>{
  await assert.rejects(()=>encryptPlan(synthetic(),"short",webcrypto),/at least 12/);
  await assert.rejects(()=>encryptPlan(synthetic(),phrase,{}),/unavailable/);
});
test("backups protect current schema-one records including previous rungs",async()=>{
  const s=synthetic();
  s.field.notes="Test note with unicode ◈ Φ";
  s.power.batteryWh=2500;
  const encrypted=await encryptPlan(s,phrase,webcrypto);
  const recovered=await decryptPlan(encrypted,phrase,webcrypto);
  assert.equal(recovered.field.notes,s.field.notes);
  assert.equal(recovered.power.batteryWh,2500);
  assert.equal(recovered.pets.length,17);
});
