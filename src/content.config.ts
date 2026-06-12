import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const noteSchema = z.object({
  text: z.string(),
  href: z.string().optional(),
  external: z.boolean().default(false)
});

const mediaSourceSchema = z.object({
  src: z.string(),
  type: z.string()
});

const projectMediaSchema = ({ image }: { image: () => z.ZodTypeAny }) =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("image"),
      image: image(),
      alt: z.string().optional()
    }),
    z.object({
      type: z.literal("youtube"),
      videoId: z.string(),
      title: z.string(),
      poster: image().optional(),
      alt: z.string().optional()
    }),
    z.object({
      type: z.literal("video"),
      poster: image().optional(),
      sources: z.array(mediaSourceSchema).default([]),
      alt: z.string().optional()
    })
  ]);

const projects = defineCollection({
  loader: glob({
    base: "./src/content/projects",
    pattern: "**/index.md",
    generateId: ({ data }) => String(data.slug)
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: z.string(),
      subtitle: z.string(),
      projectId: z.number().int().positive(),
      completed: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      thumbnail: image(),
      home: z.object({
        show: z.boolean().default(true)
      }),
      frame: projectMediaSchema({ image }),
      taxonomy: z.object({
        format: z.array(z.string()).default([]),
        status: z.array(z.string()).default([]),
        disciplines: z.array(z.string()).default([]),
        genres: z.array(z.string()).default([])
      }),
      info: z.object({
        locationClient: z.string(),
        notes: z.array(noteSchema).default([])
      }),
      gallery: z.array(projectMediaSchema({ image })).default([]),
      portfolioLink: z.boolean().default(false)
    })
});

const photos = defineCollection({
  loader: glob({
    base: "./src/content/photos",
    pattern: "**/index.md"
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      image: image(),
      alt: z.string().optional()
    })
});

const music = defineCollection({
  loader: glob({
    base: "./src/content/music",
    pattern: "**/index.md"
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    audio: z.string().optional(),
    hidden: z.boolean().default(false)
  })
});

export const collections = { projects, photos, music };
