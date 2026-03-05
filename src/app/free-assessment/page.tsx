import { Metadata } from 'next';
import AssessmentPageContent from '@/components/free-assessment/AssessmentPageContent';

// 1. This part runs on the Server (SEO)
export const metadata: Metadata = {
  title: "Free Health Assessment - Medazon Health",
  description: "Private, confidential telehealth care in Florida. Same-day treatment for UTI, anxiety, weight loss, and 50+ conditions.",
  alternates: {
    canonical: "https://medazonhealth.com/free-assessment",
  },
};

// 2. This renders your interactive Client Component
export default function FreeAssessmentPage() {
  return <AssessmentPageContent />;
}