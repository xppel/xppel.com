import { getCollection, type CollectionEntry } from "astro:content";

export type ProjectEntry = CollectionEntry<"projects">;
export type ProjectTaxonomyKey = "format" | "status" | "disciplines" | "genres";

export type ProjectGroup = {
  year: number;
  projects: ProjectEntry[];
};

export type ProjectNote = ProjectEntry["data"]["info"]["notes"][number];

export const taxonomyOrder = {
  format: ["physical product", "web/app interface", "service concept", "prototype hardware"],
  status: ["concept", "exhibited", "functional prototype", "personal project"],
  disciplines: [
    "industrial design",
    "graphics/branding",
    "UI/UX optimization",
    "website/app development",
    "electronics/PCB design",
    "mechanical engineering",
    "service systems"
  ],
  genres: [
    "consumer electronics",
    "creative tools",
    "home goods",
    "sport/health/wellness",
    "music technology",
    "industrial tools",
    "furniture/lighting"
  ]
} satisfies Record<ProjectTaxonomyKey, string[]>;

export async function getProjects() {
  const projects = await getCollection("projects");

  return projects.sort((a, b) => {
    if (a.data.year !== b.data.year) return b.data.year - a.data.year;
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.title.localeCompare(b.data.title);
  });
}

export function getProjectHref(project: ProjectEntry) {
  return `/projects/${project.data.slug}/`;
}

export function getHomeProjects(projects: ProjectEntry[]) {
  return projects
    .filter((project) => project.data.home.show)
    .sort((a, b) => a.data.home.order - b.data.home.order || a.data.title.localeCompare(b.data.title));
}

export function getProjectInfoLines(project: ProjectEntry) {
  return [
    { text: `Designed ${project.data.info.date} at ${project.data.info.locationClient}.` },
    ...project.data.info.notes
  ];
}

export function getProjectDescriptionText(project: ProjectEntry) {
  const firstParagraph = project.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean);

  return (firstParagraph ?? project.data.subtitle)
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function groupProjectsByYear(projects: ProjectEntry[]): ProjectGroup[] {
  const groups = new Map<number, ProjectEntry[]>();

  for (const project of projects) {
    const group = groups.get(project.data.year) ?? [];
    group.push(project);
    groups.set(project.data.year, group);
  }

  return Array.from(groups, ([year, groupProjects]) => ({
    year,
    projects: groupProjects
  }));
}

export async function getProjectGroups() {
  return groupProjectsByYear(await getProjects());
}

export function slugifyTag(tag: string) {
  return tag
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatTagLabel(tag: string) {
  const abbreviations = new Map([
    ["ui", "UI"],
    ["ux", "UX"],
    ["pcb", "PCB"],
    ["dsp", "DSP"],
    ["mcu", "MCU"],
    ["midi", "MIDI"],
    ["pda", "PDA"],
    ["rgb", "RGB"]
  ]);

  return tag.toLowerCase().replace(/[a-z0-9]+/g, (token) => abbreviations.get(token) ?? token);
}

export function getProjectTags(project: ProjectEntry) {
  return Object.entries(project.data.taxonomy).flatMap(([group, values]) =>
    values
      .filter((value) => {
        const key = group as ProjectTaxonomyKey;
        return taxonomyOrder[key].map((label) => slugifyTag(label)).includes(slugifyTag(value));
      })
      .map((value) => ({
        group: group as ProjectTaxonomyKey,
        label: value,
        slug: slugifyTag(value)
      }))
  );
}

export function getProjectSearchText(project: ProjectEntry) {
  return [
    project.data.title,
    project.data.subtitle,
    getProjectDescriptionText(project),
    project.data.info.date,
    project.data.info.locationClient,
    ...project.data.info.notes.map((note) => note.text),
    ...getProjectTags(project).map((tag) => tag.label)
  ].join(" ");
}

export function getTaxonomyOptions(projects: ProjectEntry[]) {
  const options: Record<ProjectTaxonomyKey, { label: string; slug: string }[]> = {
    format: [],
    status: [],
    disciplines: [],
    genres: []
  };

  for (const key of Object.keys(options) as ProjectTaxonomyKey[]) {
    const seen = new Map<string, { label: string; count: number }>();
    for (const project of projects) {
      for (const value of project.data.taxonomy[key]) {
        const slug = slugifyTag(value);
        if (!taxonomyOrder[key].map((label) => slugifyTag(label)).includes(slug)) continue;
        const current = seen.get(slug);
        seen.set(slug, { label: value, count: (current?.count ?? 0) + 1 });
      }
    }
    const canonical = taxonomyOrder[key].map((label) => slugifyTag(label));
    options[key] = Array.from(seen, ([slug, value]) => ({ slug, label: value.label, count: value.count }))
      .sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count;
        const aIndex = canonical.indexOf(a.slug);
        const bIndex = canonical.indexOf(b.slug);
        if (aIndex !== bIndex) return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
        return a.label.localeCompare(b.label);
      })
      .map(({ slug, label }) => ({ slug, label }));
  }

  return options;
}
