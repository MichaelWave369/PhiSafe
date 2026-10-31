// PhiSafe Rung 6: portable encrypted backup. No API calls, cookies, telemetry or accounts.
// The live browser-local plan remains PLAINTEXT. Only the exported vault file is encrypted.
import { normalizeState } from "./core.mjs";

export const VAULT_FORMAT = "phisafe-encrypted-backup";
export const VAULT_VERSION = 1;
export const VAULT_ITERATIONS = 600000;
export const MAX_VAULT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PLAN_BYTES = 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8",{fatal:true});

function cryptoOrThrow(cryptoAPI) {
  if (!cryptoAPI?.subtle || typeof cryptoAPI.getRandomValues !== "function") {
    throw new Error("Secure browser cryptography is unavailable. Use HTTPS or localhost on a supported browser.");
  }
  return cryptoAPI;
}
function checkPhrase(passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 12 || passphrase.length > 1024) {
    throw new Error("Use a unique passphrase of at least 12 characters (maximum 1024).");
  }
  return passphrase;
}
function b64(bytes) {
  const parts=[];
  for(let i=0;i<bytes.length;i+=8192) {
    parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  }
  return btoa(parts.join(""));
}
function unb64(value,bytesExpected=null) {
  if (typeof value !== "string" || value.length>MAX_VAULT_FILE_BYTES*2 ||
    value.length===0 || value.length%4!==0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Invalid encrypted backup encoding.");
  }
  let bytes;
  try {
    const decoded=atob(value);
    bytes=Uint8Array.from(decoded,character=>character.charCodeAt(0));
  } catch (_) {
    throw new Error("Invalid encrypted backup encoding.");
  }
  if(bytesExpected!==null && bytes.length!==bytesExpected) throw new Error("Invalid encrypted backup parameters.");
  return bytes;
}
async function keyFor(passphrase,salt,cryptoAPI,iterations=VAULT_ITERATIONS){
  const base=await cryptoAPI.subtle.importKey("raw",encoder.encode(passphrase),"PBKDF2",false,["deriveKey"]);
  return cryptoAPI.subtle.deriveKey(
    {name:"PBKDF2",hash:"SHA-256",salt,iterations},
    base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]
  );
}
function validateEnvelope(raw) {
  if(!raw || typeof raw!=="object" || Array.isArray(raw) ||
    raw.format!==VAULT_FORMAT || raw.version!==VAULT_VERSION ||
    raw.kdf?.name!=="PBKDF2" || raw.kdf?.hash!=="SHA-256" ||
    raw.cipher?.name!=="AES-256-GCM" ||
    !Number.isSafeInteger(raw.kdf?.iterations) ||
    raw.kdf.iterations<VAULT_ITERATIONS || raw.kdf.iterations>1200000) {
    throw new Error("Unsupported or invalid PhiSafe encrypted backup.");
  }
  const salt=unb64(raw.kdf.salt,16);
  const iv=unb64(raw.cipher.iv,12);
  const ciphertext=unb64(raw.ciphertext);
  if(ciphertext.length<16 || ciphertext.length>MAX_VAULT_FILE_BYTES) {
    throw new Error("Invalid encrypted backup size.");
  }
  return {salt,iv,ciphertext,iterations:raw.kdf.iterations};
}
export async function encryptPlan(state,passphrase,cryptoAPI=globalThis.crypto) {
  const api=cryptoOrThrow(cryptoAPI);
  checkPhrase(passphrase);
  const valid=normalizeState(state);
  const message=encoder.encode(JSON.stringify(valid));
  if(message.length>MAX_PLAN_BYTES) throw new Error("Plan exceeds the 1 MiB encrypted-backup limit.");
  const salt=api.getRandomValues(new Uint8Array(16));
  const iv=api.getRandomValues(new Uint8Array(12));
  const key=await keyFor(passphrase,salt,api);
  const bytes=new Uint8Array(await api.subtle.encrypt({name:"AES-GCM",iv,tagLength:128},key,message));
  return {
    format:VAULT_FORMAT,version:VAULT_VERSION,
    kdf:{name:"PBKDF2",hash:"SHA-256",iterations:VAULT_ITERATIONS,salt:b64(salt)},
    cipher:{name:"AES-256-GCM",iv:b64(iv)},
    ciphertext:b64(bytes)
  };
}
export async function decryptPlan(envelope,passphrase,cryptoAPI=globalThis.crypto) {
  const api=cryptoOrThrow(cryptoAPI);
  checkPhrase(passphrase);
  const params=validateEnvelope(envelope);
  const key=await keyFor(passphrase,params.salt,api,params.iterations);
  let plaintext;
  try {
    plaintext=await api.subtle.decrypt({name:"AES-GCM",iv:params.iv,tagLength:128},key,params.ciphertext);
  }catch(_){
    throw new Error("Unable to decrypt. Check the passphrase and backup file.");
  }
  let parsed;
  try {
    parsed=JSON.parse(decoder.decode(plaintext));
    return normalizeState(parsed);
  }catch(_){
    throw new Error("Decrypted content is not a supported PhiSafe plan.");
  }
}
export function isEncryptedBackup(raw) {
  return Boolean(raw && typeof raw==="object" && raw.format===VAULT_FORMAT);
}
