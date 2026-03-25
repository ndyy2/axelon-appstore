const cache = new Map();
const inFlight = new Map();

export async function fetchFlathubAppData(appId) {
  if (cache.has(appId)) return cache.get(appId);
  if (inFlight.has(appId)) return inFlight.get(appId);

  const promise = (async () => {
    try {
      // Endpoint provides rich appstream metadata (icon url, screenshots, description)
      const res = await fetch(`https://flathub.org/api/v2/appstream/${appId}`);
      if (!res.ok) throw new Error('Not found on Flathub');
      const data = await res.json();
      cache.set(appId, data);
      return data;
    } catch (e) {
      cache.set(appId, null);
      return null;
    } finally {
      inFlight.delete(appId);
    }
  })();

  inFlight.set(appId, promise);
  return promise;
}

export async function fetchFlathubStats(appId) {
  try {
    const res = await fetch(`https://flathub.org/api/v1/apps/${appId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}