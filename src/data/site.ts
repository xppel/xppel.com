const asset = (path: string) => `/assets/${path}`;

function formatBuildDate(date: Date) {
  const day = date.getDate();
  const suffix = day % 10 === 1 && day % 100 !== 11
    ? "st"
    : day % 10 === 2 && day % 100 !== 12
      ? "nd"
      : day % 10 === 3 && day % 100 !== 13
        ? "rd"
        : "th";
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  return `${month} ${day}${suffix}, ${date.getFullYear()}`;
}

export const site = {
  title: "A. Appel",
  name: "Andrew Appel",
  email: "andrew@xppel.com",
  description: "Portfolio of Andrew Appel, a multimedia designer, engineer, and artist.",
  updated: formatBuildDate(new Date()),
  url: "https://xppel.com",
  previewImage: "/assets/social/home-preview.png",
  previewImageAlt: "A. Appel portfolio homepage preview",
  links: {
    email: "mailto:andrew@xppel.com",
    linkedIn: "https://linkedin.com/in/xppel/",
    instagram: "https://instagram.com/xppel/",
    resume: asset("pdfs/Andrew%20Appel%20CV.pdf"),
    portfolio: asset("pdfs/Andrew%20Appel%20Digital%20Portfolio%20%28Super%20Compressed%29.pdf")
  }
};
