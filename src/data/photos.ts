import { getCollection, type CollectionEntry } from "astro:content";

export type PhotoEntry = CollectionEntry<"photos">;

const photoOrder = [
  "nyc-3",
  "brunel-2",
  "california-1",
  "genoa-2",
  "bnw-california-9",
  "nyc-2",
  "nice-1",
  "brunel-1",
  "guatemala-1",
  "genoa-1",
  "nyc-4",
  "california-3",
  "bnw-california-7",
  "bnw-california-1",
  "nyc-1"
];

const photoColumns = [
  ["nyc-3", "bnw-california-9", "nice-1", "california-3", "bnw-california-1"],
  ["brunel-2", "genoa-2", "nyc-2", "guatemala-1", "nyc-4"],
  ["california-1", "brunel-1", "genoa-1", "bnw-california-7", "nyc-1"]
];

async function getPhotoMap() {
  const photos = await getCollection("photos");
  return new Map(photos.map((photo) => [photo.id, photo]));
}

export async function getPhotos() {
  const byId = await getPhotoMap();
  return photoOrder
    .map((id) => byId.get(id))
    .filter((photo): photo is PhotoEntry => Boolean(photo));
}

export async function getPhotoColumns() {
  const byId = await getPhotoMap();
  return photoColumns.map((column) =>
    column
      .map((id) => byId.get(id))
      .filter((photo): photo is PhotoEntry => Boolean(photo))
  );
}
