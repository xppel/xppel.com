import { getCollection, render, type CollectionEntry } from "astro:content";

export type TrackEntry = CollectionEntry<"music">;

const audioModules = import.meta.glob("../content/music/**/*.{mp3,m4a,wav,aiff}", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

export async function getTracks() {
  const tracks = (await getCollection("music")).filter((track) => !track.data.hidden);

  return tracks.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export async function getRenderableTracks() {
  const tracks = await getTracks();

  return Promise.all(tracks.map(async (track) => {
    const { Content } = await render(track);
    const audioPath = track.data.audio ? `../content/music/${track.id}/${track.data.audio.replace("./", "")}` : "";

    return {
      track,
      Content,
      audio: audioPath ? audioModules[audioPath] ?? "" : ""
    };
  }));
}
