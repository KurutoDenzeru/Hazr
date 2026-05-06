import * as React from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const handleChange = () => setIsTablet(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isTablet;
}
