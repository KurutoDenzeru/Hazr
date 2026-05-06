import { siGithub, siInstagram } from "simple-icons";

function injectCurrentColor(svg: string): string {
  return svg.replace("<svg", '<svg fill="currentColor"');
}

export function getSocialIconSvg(slug: "github" | "instagram") {
  switch (slug) {
    case "github":
      return injectCurrentColor(siGithub.svg);
    case "instagram":
      return injectCurrentColor(siInstagram.svg);
  }
}