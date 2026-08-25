/**
 * WebAuthn & Passkey Client Utilities
 * ------------------------------------
 * Cryptographically handles WebAuthn registration and authentication flows,
 * base64url transformations, and authenticator option parsing.
 */

import { api, AuthSuccessResponse } from "./api";

/**
 * Converts an ArrayBuffer or Uint8Array to a URL-safe Base64 (base64url) string without padding.
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Converts a Base64 or Base64URL string to an ArrayBuffer.
 */
export function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the current browser environment supports the WebAuthn API.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator.credentials !== "undefined"
  );
}

/**
 * Checks if a platform authenticator (Touch ID, Face ID, Windows Hello) is available.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Prepares raw JSON options from POST /auth/webauthn/register/options
 * by converting string challenges and IDs to ArrayBuffers.
 */
export function preparePublicKeyCreationOptions(rawOptions: any): PublicKeyCredentialCreationOptions {
  const options = rawOptions.publicKey || rawOptions.options || rawOptions;

  const challenge = typeof options.challenge === "string"
    ? base64UrlToBuffer(options.challenge)
    : options.challenge;

  const userId = typeof options.user?.id === "string"
    ? (options.user.id.length > 32
        ? base64UrlToBuffer(options.user.id)
        : new TextEncoder().encode(options.user.id))
    : options.user?.id;

  const excludeCredentials = (options.excludeCredentials || []).map((cred: any) => ({
    ...cred,
    id: typeof cred.id === "string" ? base64UrlToBuffer(cred.id) : cred.id,
  }));

  return {
    ...options,
    challenge,
    user: {
      ...options.user,
      id: userId,
    },
    excludeCredentials,
  };
}

/**
 * Prepares raw JSON options from POST /auth/webauthn/authenticate/options
 * by converting string challenges and credential IDs to ArrayBuffers.
 */
export function preparePublicKeyRequestOptions(rawOptions: any): PublicKeyCredentialRequestOptions {
  const options = rawOptions.publicKey || rawOptions.options || rawOptions;

  const challenge = typeof options.challenge === "string"
    ? base64UrlToBuffer(options.challenge)
    : options.challenge;

  const allowCredentials = (options.allowCredentials || []).map((cred: any) => ({
    ...cred,
    id: typeof cred.id === "string" ? base64UrlToBuffer(cred.id) : cred.id,
  }));

  return {
    ...options,
    challenge,
    allowCredentials,
  };
}

/**
 * Performs full WebAuthn Passkey Registration:
 * 1. POST /auth/webauthn/register/options
 * 2. navigator.credentials.create()
 * 3. POST /auth/webauthn/register/verify (with real COSE attestation_object, client_data_json, credential_id)
 */
export async function registerPasskeyFlow(
  token?: string | null,
  deviceLabel?: string
): Promise<{ status: string; credential_id?: string; message?: string }> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn / Passkeys are not supported in this browser.");
  }

  // 1. Get creation options from backend
  const resOptions = await api.getWebAuthnRegisterOptions(token || undefined);
  const creationOptions = preparePublicKeyCreationOptions(resOptions);

  // 2. Call WebAuthn navigator API
  const cred = (await navigator.credentials.create({
    publicKey: creationOptions,
  })) as PublicKeyCredential | null;

  if (!cred) {
    throw new Error("Failed to create WebAuthn credential.");
  }

  const response = cred.response as AuthenticatorAttestationResponse;
  const transports = response.getTransports ? response.getTransports() : ["internal", "hybrid", "usb"];

  // 3. POST /auth/webauthn/register/verify
  return await api.verifyWebAuthnRegister(token || undefined, {
    client_data_json: bufferToBase64Url(response.clientDataJSON),
    attestation_object: bufferToBase64Url(response.attestationObject), // REQUIRED: real COSE public key
    credential_id: bufferToBase64Url(cred.rawId),
    device_label: deviceLabel || (typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "Mac Touch ID / Apple Passkey" : "WebAuthn Passkey"),
    transports,
  });
}

/**
 * Performs full WebAuthn Passkey Login:
 * 1. POST /auth/webauthn/authenticate/options
 * 2. navigator.credentials.get()
 * 3. POST /auth/webauthn/authenticate/verify (with authenticator_data, signature, client_data_json)
 */
export async function loginPasskeyFlow(
  identifier?: string
): Promise<AuthSuccessResponse> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn / Passkeys are not supported in this browser.");
  }

  // 1. Get authentication challenge options from backend
  const resOptions = await api.getWebAuthnAuthenticateOptions(identifier);
  const requestOptions = preparePublicKeyRequestOptions(resOptions);

  // 2. Call WebAuthn navigator API
  const assertion = (await navigator.credentials.get({
    publicKey: requestOptions,
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("No WebAuthn passkey assertion was returned.");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  // 3. POST /auth/webauthn/authenticate/verify
  return await api.verifyWebAuthnAuthenticate({
    client_data_json: bufferToBase64Url(response.clientDataJSON),
    authenticator_data: bufferToBase64Url(response.authenticatorData), // REQUIRED
    signature: bufferToBase64Url(response.signature),                   // REQUIRED
    credential_id: bufferToBase64Url(assertion.rawId),
    user_handle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    identifier: identifier || undefined,
  });
}
