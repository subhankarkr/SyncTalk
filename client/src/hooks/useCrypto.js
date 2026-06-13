const CRYPTO_SALT = new TextEncoder().encode("synctalk-salt-129837123");

export const useCrypto = () => {
  const derivePasscodeKey = async (passcode) => {
    const enc = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(passcode),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: CRYPTO_SALT,
        iterations: 10000,
        hash: "SHA-256"
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  };

  const encryptPayload = async (text, key) => {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );
    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
      iv: btoa(String.fromCharCode(...iv))
    };
  };

  const decryptPayload = async (ciphertextB64, ivB64, key) => {
    try {
      const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      return "[DECRYPTION ERROR: Invalid E2EE Passcode]";
    }
  };

  const encryptFileBytes = async (fileBytes, key) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      fileBytes
    );
    const result = new Uint8Array(12 + encryptedBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedBuffer), 12);
    return result;
  };

  const decryptFileBytes = async (combinedBytes, key) => {
    const iv = combinedBytes.slice(0, 12);
    const ciphertext = combinedBytes.slice(12);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return decryptedBuffer;
  };

  return {
    derivePasscodeKey,
    encryptPayload,
    decryptPayload,
    encryptFileBytes,
    decryptFileBytes
  };
};
