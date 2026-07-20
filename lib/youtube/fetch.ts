import type { YouTubeData, YouTubeVideo } from "@/types/portfolio";

// Fonction pure réutilisable hors HTTP (job de fraîcheur, etc.) — même
// logique que l'ancienne route API, qui n'est plus qu'un mince wrapper
// autour de celle-ci (voir app/api/youtube/fetch/route.ts).

const YT_KEY = process.env.YOUTUBE_API_KEY ?? "";

async function ytFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

// limit=10 par défaut (génération/rafraîchissement) ; le picker de l'éditeur
// ("parcourir toutes mes vidéos") passe une limite plus large. L'API YouTube
// plafonne playlistItems à 50 résultats par page.
export async function fetchYouTubeData(handle: string, limit = 10): Promise<YouTubeData> {
  if (!YT_KEY) throw new Error("YOUTUBE_API_KEY non configurée");
  const maxResults = Math.min(50, Math.max(1, limit));

  // 1. Resolve channel — try forHandle first (works for @handle), fallback to forUsername
  let channelRes = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${YT_KEY}`
  );

  let items = (channelRes.items as unknown[]) ?? [];

  if (items.length === 0) {
    // Fallback: try forUsername (older channels without @handle)
    channelRes = await ytFetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=${encodeURIComponent(handle)}&key=${YT_KEY}`
    );
    items = (channelRes.items as unknown[]) ?? [];
  }

  if (items.length === 0) {
    throw new Error("Chaîne YouTube introuvable. Vérifie le nom d'utilisateur.");
  }

  const channel = items[0] as {
    snippet: { title: string; description: string; thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } } };
    statistics: { subscriberCount: string; videoCount: string; viewCount: string };
    contentDetails: { relatedPlaylists: { uploads: string } };
  };

  const channelName      = channel.snippet.title;
  const channelAvatarUrl = channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.medium?.url ?? channel.snippet.thumbnails?.default?.url;
  const description      = channel.snippet.description?.slice(0, 500) ?? "";
  const subscriberCount  = parseInt(channel.statistics.subscriberCount ?? "0", 10);
  const videoCount       = parseInt(channel.statistics.videoCount ?? "0", 10);
  const viewCount        = parseInt(channel.statistics.viewCount ?? "0", 10);
  const uploadsPlaylist  = channel.contentDetails.relatedPlaylists.uploads;

  // 2. Get recent video IDs from uploads playlist
  const playlistRes = await ytFetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylist}&maxResults=${maxResults}&key=${YT_KEY}`
  );

  const playlistItems = (playlistRes.items as { snippet: { resourceId: { videoId: string }; publishedAt: string } }[]) ?? [];
  const videoIds = playlistItems.map((item) => item.snippet.resourceId.videoId).filter(Boolean);

  if (videoIds.length === 0) {
    return { channelName, channelAvatarUrl, subscriberCount, videoCount, viewCount, description, videos: [] };
  }

  // 3. Batch fetch video details (title, stats, thumbnail)
  const videosRes = await ytFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${YT_KEY}`
  );

  const videos: YouTubeVideo[] = ((videosRes.items as {
    id: string;
    snippet: { title: string; description: string; publishedAt: string; thumbnails?: { medium?: { url: string } } };
    statistics: { viewCount?: string };
  }[]) ?? []).map((v) => ({
    videoId:     v.id,
    title:       v.snippet.title,
    description: v.snippet.description?.slice(0, 200) ?? undefined,
    publishedAt: v.snippet.publishedAt,
    viewCount:   v.statistics?.viewCount ?? undefined,
    thumbnail:   v.snippet.thumbnails?.medium?.url ?? undefined,
  }));

  return { channelName, channelAvatarUrl, subscriberCount, videoCount, viewCount, description, videos };
}
