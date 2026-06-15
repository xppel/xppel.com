const asset = (path: string) => `/assets/${path}`;

export const site = {
  title: "A. Appel",
  name: "Andrew Appel",
  email: "andrew@xppel.com",
  description: "Portfolio of Andrew Appel, a multimedia designer, engineer, and artist.",
  updated: "June 15th, 2026",
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
