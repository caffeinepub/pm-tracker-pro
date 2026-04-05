/**
 * rawActor.ts
 * Creates a raw _SERVICE actor with all backend methods available.
 * This bypasses the auto-generated backend.ts wrapper which only has old methods.
 */
import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { loadConfig } from "../config";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";
import { getSecretParameter } from "./urlParams";

let _actor: _SERVICE | null = null;
let _initPromise: Promise<_SERVICE> | null = null;

export async function getRawActor(): Promise<_SERVICE> {
  if (_actor) return _actor;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const config = await loadConfig();
    const agent = new HttpAgent({
      host: config.backend_host,
    });
    if (config.backend_host?.includes("localhost")) {
      await agent.fetchRootKey().catch(console.warn);
    }
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
      agent,
      canisterId: config.backend_canister_id,
    });
    // Initialize access control
    const adminToken = getSecretParameter("caffeineAdminToken") || "";
    if (adminToken) {
      await actor._initializeAccessControlWithSecret(adminToken);
    }
    _actor = actor;
    return actor;
  })();

  return _initPromise;
}

/** Reset singleton (used after logout or for testing) */
export function resetRawActor() {
  _actor = null;
  _initPromise = null;
}
