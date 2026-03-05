import { Metadata } from "next";
import { getStateBySlug } from "@/data/states";
import { getServiceBySlug, replaceStatePlaceholders } from "@/data/services";

// Generate metadata for SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ service: string; state: string }> 
}): Promise<Metadata> {
  const { service, state } = await params;
  const serviceData = getServiceBySlug(service);
  const stateData = getStateBySlug(state);
  
  if (!serviceData || !stateData) {
    return { title: "Page Not Found | Medazon Health" };
  }
  
  const title = `Private ${serviceData.name} in ${stateData.name} | Medazon Health`;
  const description = replaceStatePlaceholders(
    serviceData.hero.subtitle,
    stateData.name,
    stateData.abbreviation,
    stateData.teleheathStatute,
    stateData.majorCities
  );
  
  return {
    title,
    description,
    keywords: [
      `${serviceData.shortName} treatment ${stateData.name}`,
      `telehealth ${stateData.name}`,
      `online doctor ${stateData.name}`,
      `UTI treatment online ${stateData.name}`,
      `STD treatment online ${stateData.name}`,
      `same day prescription ${stateData.name}`,
      ...stateData.majorCities.map(city => `${serviceData.shortName} treatment ${city}`),
    ],
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Medazon Health",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function ServiceStateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

