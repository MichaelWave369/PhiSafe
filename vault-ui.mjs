// PhiSafe encrypted backup interface. No passwords are prefilled or stored.
export function renderVault() {
  return '<h2>Private Emergency Vault</h2>'+
    '<p class="lead">Protect a copy of your household plan with a passphrase and restore it on another device. '+
    'All encryption and decryption happens in this browser. No server or account is required.</p>'+
    '<div class="warning-note"><strong>Important distinction:</strong> The encrypted <em>downloaded file</em> is protected by your passphrase. '+
    'The plan currently saved in this browser is <strong>not encrypted</strong>. '+
    'A strong passphrase matters. If you lose it, PhiSafe cannot recover the backup.</div>'+
    '<div class="section grid two">'+
      '<section class="card"><h3>1. Create encrypted backup</h3>'+
      '<p class="hint">Choose a unique, memorable passphrase at least 12 characters long. A longer phrase of unrelated words is better. '+
      'Do not reuse an account password or share the passphrase with the file.</p>'+
      '<form id="vaultExportForm" class="form-grid" autocomplete="off">'+
      '<div class="field full"><label for="vaultExportPassphrase">Backup passphrase</label>'+
        '<input id="vaultExportPassphrase" name="passphrase" type="password" autocomplete="new-password" required minlength="12" maxlength="1024" placeholder="Use a long, unique passphrase"></div>'+
      '<div class="field full"><label for="vaultConfirmPassphrase">Confirm passphrase</label>'+
        '<input id="vaultConfirmPassphrase" name="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="1024"></div>'+
      '<div class="form-actions"><button type="submit">Download encrypted backup</button></div></form>'+
      '<p class="hint">File: <code>phisafe-encrypted-YYYY-MM-DD.json</code>. It contains no plaintext names, routes, or contacts outside the encrypted payload.</p></section>'+
      '<section class="card"><h3>2. Restore encrypted backup</h3>'+
      '<p class="hint">Select a PhiSafe encrypted backup and enter its exact passphrase. The existing browser plan remains unchanged unless decryption succeeds and you confirm replacement.</p>'+
      '<form id="vaultImportForm" class="form-grid" autocomplete="off">'+
      '<div class="field full"><label for="vaultImportFile">Encrypted backup file</label>'+
        '<input id="vaultImportFile" name="file" type="file" accept=".json,application/json" required></div>'+
      '<div class="field full"><label for="vaultImportPassphrase">Backup passphrase</label>'+
        '<input id="vaultImportPassphrase" name="passphrase" type="password" autocomplete="off" required maxlength="1024"></div>'+
      '<div class="form-actions"><button type="submit">Decrypt and restore</button></div></form>'+
      '<p class="hint">Restore requires an existing backup and the correct passphrase; there is no reset link or recovery service.</p></section>'+
    '</div>'+
    '<div class="section card"><h3>Safe backup practice</h3>'+
      '<ul class="clean">'+
        '<li>Keep two copies in separate locations or trusted devices, and test restoring a copy before an emergency.</li>'+
        '<li>Keep a printed emergency sheet available when power and devices fail. Store it somewhere private and accessible.</li>'+
        '<li>Do not post either backup or the passphrase publicly. Plain JSON export remains supported for compatibility, but it is readable by anyone with the file.</li>'+
        '<li>Neither encrypted backups nor browser storage synchronize automatically; a new backup is needed after important plan changes.</li>'+
      '</ul>'+
      '<p class="hint">Technical details: Web Crypto AES-256-GCM, a new random salt and IV for every export, and PBKDF2-HMAC-SHA-256 with 600,000 iterations. '+
      'These protect file confidentiality and integrity against tampering when a good passphrase is used. The cryptographic implementation has not received an independent security audit.</p>'+
    '</div>';
}
