import { siGithub, siInstagram } from "simple-icons";

function injectCurrentColor(svg: string): string {
  return svg.replace("<svg", '<svg fill="currentColor"');
}

const linkedinSvg = await fetch("https://cdn.simpleicons.org/linkedin")
  .then((r) => r.text())
  .then(injectCurrentColor);

export function getSocialIconSvg(slug: "github" | "instagram" | "linkedin") {
  switch (slug) {
    case "github":
      return injectCurrentColor(siGithub.svg);
    case "instagram":
      return injectCurrentColor(siInstagram.svg);
    case "linkedin":
      return linkedinSvg;
  }
}