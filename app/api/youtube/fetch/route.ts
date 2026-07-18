import { NextRequest, NextResponse } from "next/server";
import type { YouTubeData, YouTubeVideo } from "@/types/portfolio";

const YT_KEY = process.env.YOUTUBE_API_KEY ?? "";

async function ytFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function GET(request: NextRequest) {
  if (!YT_KEY) return NextResponse.json({ error: "YOUTUBE_API_KEY non configurée" }, { status: 500 });

  const handle = request.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Paramètre handle manquant" }, { status: 400 });

  try {
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
      return NextResponse.json({ error: "Chaîne YouTube introuvable. Vérifie le nom d'utilisateur." }, { status: 404 });
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

    // 2. Get recent 10 video IDs from uploads playlist
    const playlistRes = await ytFetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylist}&maxResults=10&key=${YT_KEY}`
    );

    const playlistItems = (playlistRes.items as { snippet: { resourceId: { videoId: string }; publishedAt: string } }[]) ?? [];
    const videoIds = playlistItems.map((item) => item.snippet.resourceId.videoId).filter(Boolean);

    if (videoIds.length === 0) {
      const youtubeData: YouTubeData = { channelName, channelAvatarUrl, subscriberCount, videoCount, viewCount, description, videos: [] };
      return NextResponse.json({ youtubeData });
    }

    // 3. Batch fetch video details (title, stats, thumbnail)
    const videosRes = await ytFetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${YT_KEY}`
    );

    const videos: YouTubeVideo[] = ((videosRes.items as {
      snippet: { title: string; description: string; publishedAt: string; thumbnails?: { medium?: { url: string } } };
      statistics: { viewCount?: string };
    }[]) ?? []).map((v) => ({
      title:       v.snippet.title,
      description: v.snippet.description?.slice(0, 200) ?? undefined,
      publishedAt: v.snippet.publishedAt,
      viewCount:   v.statistics?.viewCount ?? undefined,
      thumbnail:   v.snippet.thumbnails?.medium?.url ?? undefined,
    }));

    const youtubeData: YouTubeData = { channelName, channelAvatarUrl, subscriberCount, videoCount, viewCount, description, videos };
    return NextResponse.json({ youtubeData });

  } catch (err) {
    console.error("[youtube/fetch] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
