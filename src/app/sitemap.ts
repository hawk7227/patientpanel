import { MetadataRoute } from "next";
import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://medazonhealth.com";

  const urls: MetadataRoute.Sitemap = [];

  // ------------------------------------------------------
  // 1) NATIONWIDE PAGES
  // ------------------------------------------------------
  urls.push(
    {
      url: `${baseUrl}/urgent-care`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/conditions`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    }
  );

  // ------------------------------------------------------
  // 2) GLOBAL CONDITION LANDING PAGES
  // /conditions/[condition]
  // ------------------------------------------------------
  Object.keys(conditionCards).forEach((condition) => {
    urls.push({
      url: `${baseUrl}/conditions/${condition}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    });
  });

  // ------------------------------------------------------
  // 3) STATE LANDING PAGES
  // /urgent-care/[state]
  // ------------------------------------------------------
  Object.keys(states).forEach((state) => {
    urls.push({
      url: `${baseUrl}/urgent-care/${state}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    });
  });

  // ------------------------------------------------------
  // 4) ALL STATE-CONDITION PAGES (22 × 28 = 616 URLs)
  // /urgent-care/[state]/[condition]
  // ------------------------------------------------------
  Object.keys(states).forEach((state) => {
    Object.keys(conditionCards).forEach((condition) => {
      urls.push({
        url: `${baseUrl}/urgent-care/${state}/${condition}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    });
  });

  // ------------------------------------------------------
  // OPTIONAL — PROVIDERS PAGE
  // ------------------------------------------------------
  urls.push({
    url: `${baseUrl}/providers`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  });

  return urls;
}
