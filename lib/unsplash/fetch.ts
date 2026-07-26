export interface UnsplashPhoto {
  url: string;
  credit: { name: string; profileUrl: string; photoUrl: string };
}

// Pioche une photo aléatoire correspondant à `query` parmi tout le
// catalogue Unsplash (pas juste une poignée d'URLs figées) — à chaque
// génération de portfolio, deux personnes du même métier obtiennent donc
// des fonds différents. Ne lance jamais d'exception : retourne `null` si la
// clé n'est pas configurée ou si l'appel échoue, pour que l'appelant retombe
// sur l'URL statique de repli du preset sans jamais casser la génération.
export async function fetchRandomPhoto(query: string): Promise<UnsplashPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    // Requis par les Unsplash API Guidelines dès qu'une photo obtenue via
    // l'API est réellement utilisée — best-effort, ne bloque jamais la
    // génération si ce ping échoue.
    if (data?.links?.download_location) {
      fetch(`${data.links.download_location}?client_id=${key}`).catch(() => {});
    }

    if (!data?.urls?.regular || !data?.user?.name || !data?.links?.html || !data?.user?.links?.html) return null;
    return {
      url: data.urls.regular,
      credit: { name: data.user.name, profileUrl: data.user.links.html, photoUrl: data.links.html },
    };
  } catch {
    return null;
  }
}
