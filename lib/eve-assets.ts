/**
 * Server-side helpers for querying EVE Frontier blockchain assets.
 * Uses the Sui testnet GraphQL endpoint directly (no browser APIs).
 */

const GRAPHQL_ENDPOINT = "https://graphql.testnet.sui.io/graphql";
const EVE_WORLD_PACKAGE = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c";
const CHARACTER_PLAYER_PROFILE_TYPE = `${EVE_WORLD_PACKAGE}::character::PlayerProfile`;

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const msg = `GraphQL HTTP ${res.status}`;
    import("@/lib/incident-log").then(({ logIncident }) => logIncident("error", "graphql", msg));
    throw new Error(msg);
  }
  const data = await res.json();
  if (data.errors?.length) {
    const msg = data.errors[0].message as string;
    import("@/lib/incident-log").then(({ logIncident }) => logIncident("error", "graphql", msg));
    throw new Error(msg);
  }
  return data.data as T;
}

export interface EveCharacter {
  /** On-chain character object address */
  id: string;
  name: string;
  corpId?: number;
}

/**
 * Returns the EVE character linked to a wallet address, or null if none found.
 */
export async function getCharacterByWallet(walletAddress: string): Promise<EveCharacter | null> {
  const query = `
    query GetWalletCharacter($owner: SuiAddress!, $type: String!) {
      address(address: $owner) {
        objects(last: 1, filter: { type: $type }) {
          nodes {
            contents {
              extract(path: "character_id") {
                asAddress {
                  asObject {
                    address
                    asMoveObject {
                      contents {
                        json
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await graphql<any>(query, {
      owner: walletAddress,
      type: CHARACTER_PLAYER_PROFILE_TYPE,
    });

    const node = data?.address?.objects?.nodes?.[0];
    const charObj = node?.contents?.extract?.asAddress?.asObject;
    if (!charObj) return null;

    const json = charObj.asMoveObject?.contents?.json;
    return {
      id: charObj.address,
      name: json?.metadata?.name ?? json?.name ?? "",
      corpId: json?.tribe_id ?? json?.corp_id ?? undefined,
    };
  } catch {
    return null;
  }
}

export interface CharacterSummary {
  /** EVE character address — used to query OwnerCap<StorageUnit> */
  id: string;
  name: string;
  corpId?: number;
  /** Sui PlayerProfile object address */
  profileAddress: string;
}

// ---------------------------------------------------------------------------
// In-process character cache — shared across all users, persists for the
// lifetime of the Node.js process. TTL: 1 hour; stale-while-revalidate.
// ---------------------------------------------------------------------------
const CHAR_CACHE_TTL = 60 * 60 * 1000;
let _charCache: CharacterSummary[] | null = null;
let _charCacheTime = 0;
let _charCacheBuild: Promise<CharacterSummary[]> | null = null;

export async function getCachedCharacters(): Promise<CharacterSummary[]> {
  const fresh = _charCache && Date.now() - _charCacheTime < CHAR_CACHE_TTL;
  if (fresh) return _charCache!;

  // Stale but available → return immediately and refresh in background
  if (_charCache && !_charCacheBuild) {
    _charCacheBuild = getAllCharacters()
      .then((data) => { _charCache = data; _charCacheTime = Date.now(); _charCacheBuild = null; return data; })
      .catch(() => { _charCacheBuild = null; return _charCache!; });
    return _charCache;
  }

  // No cache yet → build it and wait
  if (!_charCacheBuild) {
    _charCacheBuild = getAllCharacters()
      .then((data) => { _charCache = data; _charCacheTime = Date.now(); _charCacheBuild = null; return data; })
      .catch((err) => { _charCacheBuild = null; throw err; });
  }
  return _charCacheBuild;
}

export async function getAllCharacters(): Promise<CharacterSummary[]> {
  const query = `
    query GetAllPlayerProfiles($type: String!, $after: String) {
      objects(filter: { type: $type }, first: 50, after: $after) {
        nodes {
          address
          asMoveObject {
            contents {
              extract(path: "character_id") {
                asAddress {
                  asObject {
                    address
                    asMoveObject {
                      contents {
                        json
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const results: CharacterSummary[] = [];
  let after: string | null = null;
  let consecutiveErrors = 0;

  // No hard page cap — stop only when blockchain says hasNextPage=false or after 3 consecutive errors
  while (true) {
    try {
      const variables: Record<string, unknown> = { type: CHARACTER_PLAYER_PROFILE_TYPE };
      if (after) variables.after = after;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await graphql<any>(query, variables);

      consecutiveErrors = 0;
      const nodes = data?.objects?.nodes ?? [];
      for (const node of nodes) {
        const profileAddress: string = node.address;
        const charObj = node.asMoveObject?.contents?.extract?.asAddress?.asObject;
        if (!charObj) continue;
        const json = charObj.asMoveObject?.contents?.json ?? {};
        results.push({
          id: charObj.address,
          name: json?.metadata?.name ?? json?.name ?? "",
          corpId: json?.tribe_id ?? json?.corp_id ?? undefined,
          profileAddress,
        });
      }

      const pageInfo = data?.objects?.pageInfo ?? {};
      if (!pageInfo.hasNextPage) break;
      after = pageInfo.endCursor;
    } catch (err) {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        import("@/lib/incident-log").then(({ logIncident }) =>
          logIncident("error", "eve-assets/getAllCharacters", `Aborted after 3 consecutive failures: ${err instanceof Error ? err.message : String(err)}`)
        );
        break;
      }
    }
  }

  return results;
}

export interface EveSsu {
  /** On-chain SSU object address */
  id: string;
  name: string;
  status: string;
}

/**
 * Returns Smart Storage Units owned by the given character address.
 */
export async function getSsusByCharacter(characterId: string): Promise<EveSsu[]> {
  const SSU_TYPE = `${EVE_WORLD_PACKAGE}::smart_storage_unit::SmartStorageUnit`;

  const query = `
    query GetCharacterSsus($owner: SuiAddress!, $type: String!) {
      address(address: $owner) {
        objects(filter: { type: $type }) {
          nodes {
            address
            asMoveObject {
              contents {
                json
              }
            }
          }
        }
      }
    }
  `;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await graphql<any>(query, {
      owner: characterId,
      type: SSU_TYPE,
    });

    const nodes = data?.address?.objects?.nodes ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return nodes.map((node: any) => {
      const json = node?.asMoveObject?.contents?.json ?? {};
      return {
        id: node.address,
        name: json?.metadata?.name ?? "",
        status: json?.status?.status?.variant ?? "UNKNOWN",
      };
    });
  } catch {
    return [];
  }
}
