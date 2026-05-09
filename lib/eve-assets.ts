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

/**
 * Returns all EVE Frontier characters by paginating through all PlayerProfile objects.
 * Results are meant to be cached at the API layer (revalidate: 300s).
 */
const CHAR_CACHE_TTL = 5 * 60 * 1000;
const CHAR_CREATED_EVENT = `${EVE_WORLD_PACKAGE}::character::CharacterCreatedEvent`;

interface CharCacheState {
  data: CharacterSummary[];
  checkpoint: number;
  refreshedAt: number;
}

let _charCache: CharCacheState | null = null;
let _charCacheBuild: Promise<CharCacheState> | null = null;

async function getCurrentCheckpoint(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await graphql<any>(`{ checkpoint { sequenceNumber } }`, {});
  return Number(data.checkpoint.sequenceNumber);
}

async function fetchNewCharactersSince(afterCheckpoint: number): Promise<CharacterSummary[]> {
  const eventQuery = `
    query($type: String!, $afterCheckpoint: Int!, $after: String) {
      events(
        filter: { type: $type, afterCheckpoint: $afterCheckpoint },
        first: 200,
        after: $after
      ) {
        nodes { contents { json } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;
  const fetchQuery = `
    query($ids: [SuiAddress!]!) {
      multiGetObjects(ids: $ids) {
        address
        asMoveObject { contents { json } }
      }
    }
  `;

  const newEntries: { id: string; tribeId: number | undefined }[] = [];
  let after: string | null = null;
  while (true) {
    const vars: Record<string, unknown> = { type: CHAR_CREATED_EVENT, afterCheckpoint };
    if (after) vars.after = after;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await graphql<any>(eventQuery, vars);
    for (const node of (data?.events?.nodes ?? [])) {
      const json = node.contents?.json ?? {};
      if (json.character_id) newEntries.push({ id: json.character_id, tribeId: json.tribe_id ?? undefined });
    }
    if (!data?.events?.pageInfo?.hasNextPage) break;
    after = data.events.pageInfo.endCursor;
  }

  if (newEntries.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objData: any = await graphql<any>(fetchQuery, { ids: newEntries.map((e) => e.id) });
  const results: CharacterSummary[] = [];
  for (const obj of (objData?.multiGetObjects ?? [])) {
    if (!obj?.address) continue;
    const json = obj.asMoveObject?.contents?.json ?? {};
    const entry = newEntries.find((e) => e.id === obj.address);
    results.push({
      id: obj.address,
      name: json?.metadata?.name ?? json?.name ?? "",
      corpId: entry?.tribeId,
      profileAddress: "",
    });
  }
  return results;
}

async function buildFullCache(): Promise<CharCacheState> {
  const [data, checkpoint] = await Promise.all([getAllCharacters(), getCurrentCheckpoint()]);
  return { data, checkpoint, refreshedAt: Date.now() };
}

async function refreshCacheIncremental(): Promise<void> {
  if (!_charCache) return;
  try {
    const [newChars, checkpoint] = await Promise.all([
      fetchNewCharactersSince(_charCache.checkpoint),
      getCurrentCheckpoint(),
    ]);
    const existingIds = new Set(_charCache.data.map((c) => c.id));
    _charCache = {
      data: [..._charCache.data, ...newChars.filter((c) => !existingIds.has(c.id))],
      checkpoint,
      refreshedAt: Date.now(),
    };
  } finally {
    _charCacheBuild = null;
  }
}

async function getCharacterCache(): Promise<CharCacheState> {
  if (_charCache && Date.now() - _charCache.refreshedAt < CHAR_CACHE_TTL) {
    return _charCache;
  }
  if (!_charCache) {
    if (!_charCacheBuild) {
      _charCacheBuild = buildFullCache().then((cache) => {
        _charCache = cache;
        _charCacheBuild = null;
        return cache;
      });
    }
    return _charCacheBuild;
  }
  // Cache stale: refresh in background, return stale data immediately
  if (!_charCacheBuild) {
    _charCacheBuild = refreshCacheIncremental().then(() => _charCache!).catch(() => { _charCacheBuild = null; return _charCache!; });
  }
  return _charCache;
}

export async function searchCharacters(query: string, maxResults = 50): Promise<CharacterSummary[]> {
  const cache = await getCharacterCache();
  const q = query.toLowerCase();
  return cache.data.filter((c) => c.name.toLowerCase().includes(q)).slice(0, maxResults);
}

export async function getAllCharacters(): Promise<CharacterSummary[]> {
  const query = `
    query GetAllPlayerProfiles($type: String!, $after: String) {
      objects(filter: { type: $type }, first: 200, after: $after) {
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
  const MAX_PAGES = 200;
  let consecutiveErrors = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
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
