"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { getStateBySlug, StateData } from "@/data/states";
import { getServiceBySlug, replaceStatePlaceholders } from "@/data/services";
import "./styles.css";

// Helper to replace state placeholders
function r(text: string, stateData: StateData) {
  return replaceStatePlaceholders(
    text, 
    stateData.name, 
    stateData.abbreviation, 
    stateData.teleheathStatute,
    stateData.majorCities
  );
}

export default function ServiceStatePage() {
  const params = useParams();
  const service = params?.service as string;
  const state = params?.state as string;
  
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [showProviderBio, setShowProviderBio] = useState(false);
  const [showEducationalGuide, setShowEducationalGuide] = useState(false);
  const [showCities, setShowCities] = useState(false);
  const [showZipCodes, setShowZipCodes] = useState(false);
  const [showAboutClinician, setShowAboutClinician] = useState(false);
  const [showWhyChoose, setShowWhyChoose] = useState(false);
  const [showCoverageAreas, setShowCoverageAreas] = useState(false);
  
  const serviceData = useMemo(() => getServiceBySlug(service), [service]);
  const stateData = useMemo(() => getStateBySlug(state), [state]);
  
  if (!serviceData || !stateData) {
    return (
      <div className="min-h-screen bg-[#0B0F12] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  const t = (text: string) => r(text, stateData);
  
  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };
  
  return (
    <div className="min-h-screen text-[#e5e9ec]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ===== HERO SECTION ===== */}
      <section className="hero">
        <div className="hero-content">
          {/* Subhead */}
          <p className="subhead">
            {t(serviceData.hero.badge)}
          </p>
          
          {/* Main Title */}
          <h1>
            {t(serviceData.hero.title)}
          </h1>
          
          {/* Subtitle */}
          <p className="sub">
            {t(serviceData.hero.subtitle)}
          </p>
          
          {/* CTA Group */}
          <div className="cta-group">
            {/* Green CTA */}
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary"
            >
              Start an Instant Visit →
            </button>
            
            {/* Orange CTA */}
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary"
            >
              Book My Appointment →
            </button>
          </div>
          
          {/* CTA Bullets */}
          <div>
            <ul className="hero-cta-bullets">
              {serviceData.hero.bullets.map((bullet, idx) => (
                <li key={idx}>{t(bullet)}</li>
              ))}
            </ul>
          </div>
          
          {/* Live Availability Indicator */}
        </div>
        <div className="availability-live">
          <span className="dot-live" />
          <span className="availability-text">{serviceData.provider.badge}</span>
        </div>
      </section>

      {/* ===== DOCTOR SECTION ===== */}
      <section className="py-[80px] px-5 flex justify-center" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card text-center max-w-[900px] w-full p-[3rem_2rem]">
          {/* Doctor Photo */}
          <div className="relative w-[160px] h-[160px] mx-auto mb-5">
            <Image
              src={serviceData.provider.image}
              alt={`${stateData.name} telehealth provider ${serviceData.provider.name}`}
              fill
              className="rounded-full object-cover border-[3px] border-[#00ddb0] shadow-[0_0_25px_rgba(0,221,176,0.4)]"
            />
          </div>
          
          {/* Doctor Name */}
          <h2 className="font-['Playfair_Display',serif] font-bold text-white text-[1.3rem] mb-1">
            {serviceData.provider.name}, {serviceData.provider.credentials}
          </h2>
          
          {/* Doctor Info */}
          <p className="text-[#dfe3e6] text-[1rem] mb-3">
            {serviceData.provider.title} · {serviceData.provider.experience} · Licensed in {stateData.name}
          </p>
          
          {/* Service Area */}
          <p className="text-[#00ddb0] text-[0.9rem] font-medium tracking-[0.5px] mb-8">
            {t(serviceData.provider.servingText)}
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4">
            {serviceData.provider.trustBadges.map((badge, idx) => (
              <span key={idx} className="border border-[rgba(255,255,255,0.1)] rounded-[25px] py-[0.6rem] px-[1.4rem] bg-[rgba(255,255,255,0.08)] shadow-[0_0_10px_rgba(0,221,176,0.35)] text-white text-[0.9rem]">
                {badge.icon} {t(badge.text)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONDITION OVERVIEW SECTION ===== */}
      <section id="condition" className="condition-section">
        <div className="condition-card">
          <h2 className="mint-outline">
            {t(serviceData.treatmentSection.title)}
          </h2>
          
          <p className="fold-sub">
            {t(serviceData.treatmentSection.subtitle)}
          </p>
          
          {/* Condition Grid */}
          <div className="condition-grid">
            {serviceData.treatmentSection.cards.map((card, idx) => (
              <div key={idx} className="cond-item">
                <Image
                  src={card.image || "/assets/service_uti.jpg"}
                  alt={card.title}
                  loading="lazy"
                  width={100}
                  height={100}
                />
                <h3>{card.title}</h3>
                <p>{t(card.description)}</p>
              </div>
            ))}
          </div>
          
          {/* Symptoms Section */}
          <section id="symptoms-section" className="symptoms-section">
            <div className="symptoms-inner">
              <h2 className="symptoms-title">{serviceData.symptomInput.title}</h2>
              <p className="symptoms-desc">
                {serviceData.symptomInput.subtitle}
              </p>
              
              {/* CTA Buttons */}
              <div className="cta-row">
                <button 
                  onClick={() => {
                    document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-primary"
                >
                  Start an Instant Visit →
                </button>
                
                <button 
                  onClick={() => {
                    document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-secondary"
                >
                  Book My Appointment →
                </button>
              </div>
              
              <ul className="cta-bullets">
                {serviceData.symptomInput.bullets.map((bullet, idx) => (
                  <li key={idx}>{t(bullet)}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="py-[80px] px-5 flex justify-center" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card text-center max-w-[1000px] w-full p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] mb-4">{serviceData.howItWorks.title}</h2>
          <p className="text-[#e4e7eb] text-[1.05rem] leading-[1.6] max-w-[640px] mx-auto mb-10">
            {t(serviceData.howItWorks.subtitle)}
          </p>
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {serviceData.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="bg-[rgba(11,15,18,0.6)] border border-[rgba(0,221,176,0.25)] rounded-[14px] p-7 text-center shadow-[0_0_20px_rgba(0,221,176,0.35)]">
                <div className="w-[52px] h-[52px] mx-auto mb-4 filter drop-shadow-[0_0_10px_rgba(0,229,190,0.8)]">
                  <img 
                    src={`/assets/download_(${3-idx}).svg`} 
                    alt={step.title}
                    width={52}
                    height={52}
                    loading="lazy"
                  />
                </div>
                <h3 className="text-white text-[1.05rem] font-semibold mb-3">{step.step} · {step.title}</h3>
                <p className="text-[#dfe3e6] text-[0.9rem] leading-[1.5]">{t(step.description)}</p>
              </div>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-5">
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              Start an Instant Visit <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              Book My Appointment <Calendar size={18} />
            </button>
          </div>
          
          <ul className="cta-bullets">
            {serviceData.howItWorks.bullets.map((bullet, idx) => (
              <li key={idx}>{t(bullet)}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== TESTIMONIAL SECTION ===== */}
      <section className="py-[70px] px-5 flex justify-center" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card text-center max-w-[800px] w-full p-[2.5rem_2rem]">
          <blockquote className="font-['Playfair_Display',serif] text-[1.25rem] leading-[1.6] text-[#f5f7fa] italic mb-6">
            &ldquo;{serviceData.testimonial.quote}&rdquo;
          </blockquote>
          <p className="text-[#00ddb0] text-[0.95rem] font-semibold mb-1">
            — {serviceData.testimonial.attribution}, {serviceData.testimonial.location} (Verified Visit)
          </p>
          <p className="text-[rgba(255,255,255,0.7)] text-[0.85rem]">
            {serviceData.testimonial.badge}
          </p>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-[80px] px-5 flex justify-center" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card text-center max-w-[900px] w-full p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] mb-4">{serviceData.faqSection.title}</h2>
          <p className="text-[#e4e7eb] text-[1.05rem] leading-[1.6] max-w-[640px] mx-auto mb-10">
            {t(serviceData.faqSection.subtitle)}
          </p>
          
          {/* FAQ Items */}
          <div className="max-w-[760px] mx-auto text-left">
            {serviceData.faqSection.faqs.map((faq, idx) => {
              if (!showAllFaqs && idx >= 6) return null;
              return (
                <div key={idx} className={`border-b border-[rgba(255,255,255,0.1)] py-[14px] faq-item ${expandedFaq === idx ? 'active' : ''}`}>
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="faq-question w-full text-left font-semibold text-[1rem] text-[#00ddb0] cursor-pointer py-[10px] flex justify-between items-center bg-transparent border-none"
                  >
                    <span>{t(faq.question)}</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-400 ${expandedFaq === idx ? 'max-h-[300px] mt-[6px]' : 'max-h-0'}`}>
                    <p className="text-[#dfe3e6] text-[0.9rem] leading-[1.55]">{t(faq.answer)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* See More/Less Button for FAQs */}
          {serviceData.faqSection.faqs.length > 6 && (
            <div className="text-center mt-6">
              <button 
                onClick={() => setShowAllFaqs(!showAllFaqs)}
                className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
              >
                {showAllFaqs ? 'See Less' : 'See More'}
              </button>
            </div>
          )}
          
          {/* CTA after FAQ */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 mb-5">
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              Start an Instant Visit <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              Book My Appointment <Calendar size={18} />
            </button>
          </div>
          
          <ul className="cta-bullets">
            {serviceData.finalCta.bullets.map((bullet, idx) => (
              <li key={idx}>{t(bullet)}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== PROVIDER E-E-A-T SECTION (Collapsible) ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] text-center mb-6">{t(serviceData.providerBio.sectionTitle)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowProviderBio(!showProviderBio)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showProviderBio ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showProviderBio ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <div className="max-w-[760px] mx-auto text-left leading-[1.65] text-[0.95rem]">
              <p className="mb-6">{t(serviceData.providerBio.sectionSubtitle)}</p>
              
              <h3 className="text-[#00ddb0] text-[1.25rem] mb-3">{serviceData.providerBio.name}, {serviceData.providerBio.credentials}</h3>
              <p className="mb-5">{t(serviceData.providerBio.bio)}</p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.providerBio.education.title}</h4>
              <ul className="ml-5 leading-[1.55]">
                {serviceData.providerBio.education.items.map((item, idx) => (
                  <li key={idx}>{t(item)}</li>
                ))}
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.providerBio.clinicalFocus.title}</h4>
              <ul className="ml-5 leading-[1.55]">
                {serviceData.providerBio.clinicalFocus.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.providerBio.professionalApproach.title}</h4>
              <p className="leading-[1.55]">{serviceData.providerBio.professionalApproach.content}</p>
              
              <p className="text-[#00ddb0] font-semibold mt-6 text-center">*This section is for general educational purposes and does not replace medical evaluation.*</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== EDUCATIONAL GUIDE SECTION ===== */}
      <section id="education" className="education-section">
        <div className="edu-card">
          <h2>Educational Guide: Understanding UTI &amp; STD Care in {stateData.name}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowEducationalGuide(!showEducationalGuide)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showEducationalGuide ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showEducationalGuide ? 'max-h-[10000px]' : 'max-h-0'}`}>
          <p>
            This educational guide explains common urinary tract infection (UTI) and sexually transmitted infection (STD/STI)
            symptoms, what typically happens during telehealth evaluation, when in-person care may be recommended, general
            prevention tips, {stateData.name}-specific considerations, and how licensed clinicians review concerns. This information
            is not a diagnosis or treatment plan; it is meant to help patients understand the telehealth process and when
            online care may be appropriate under {stateData.name}&apos;s telehealth laws.
          </p>
          
          {/* Symptoms Section */}
          <section id="symptoms-section" className="symptoms-section">
            <div className="symptoms-inner">
              <h2 className="symptoms-title">What brings you in today?</h2>
              <p className="symptoms-desc">
                A brief description helps the provider review quickly.
              </p>
              
              <p style={{
                fontSize: '0.95rem',
                lineHeight: '1.55',
                color: 'rgba(255,255,255,0.75)',
                maxWidth: '620px',
                margin: '0 auto 20px',
              }}>
                Smart Search.
              </p>
              
              {/* Crawlable keyword index */}
              <div className="search-keyword-index">
                <span>UTI</span>
                <span>Urinary discomfort</span>
                <span>Burning urination</span>
                <span>Frequent urination</span>
                <span>Possible STD symptoms</span>
                <span>Exposure concern</span>
                <span>Private / sensitive issue</span>
                <span>Discharge</span>
                <span>Pelvic discomfort</span>
                <span>Rash or irritation</span>
                <span>Cold / flu symptoms</span>
                <span>Sinus infection</span>
                <span>Migraine</span>
                <span>Nausea</span>
                <span>Back pain</span>
                <span>Medication refill</span>
                <span>Follow-up visit</span>
                <span>Birth control</span>
                <span>Asthma / inhaler</span>
                <span>Hair loss</span>
                <span>Anxiety or stress</span>
              </div>
              
              <div style={{ position: 'relative', maxWidth: '420px', margin: 'auto' }}>
                <input 
                  id="symptomSearch" 
                  type="text" 
                  placeholder="Type your symptom or condition..." 
                  autoComplete="off" 
                  disabled
                />
                <ul id="suggestions" className="suggestions"></ul>
              </div>
              <div id="visitButtons"></div>
            </div>
          </section>
          
          {/* CTA Buttons */}
          <div className="cta-row">
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-primary"
            >
              Start an Instant Visit →
            </button>
            
            <button 
              onClick={() => {
                document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary"
            >
              Book My Appointment →
            </button>
          </div>
          
          {/* UTI Overview */}
          <h3>What Is a Urinary Tract Infection?</h3>
          
          <p>
            A urinary tract infection occurs when bacteria enter the urinary system and cause irritation or inflammation.
            UTIs can involve the bladder, urethra, or kidneys. Most people who seek telehealth support are experiencing
            mild symptoms that started recently and want fast, private access to a clinician licensed in {stateData.name}.
          </p>
          
          <h4>Common UTI Symptoms Reported by Patients</h4>
          <ul>
            <li>Burning or discomfort during urination</li>
            <li>Frequent urge to urinate</li>
            <li>Lower abdominal pressure or mild pelvic discomfort</li>
            <li>Cloudy urine or strong odor</li>
            <li>Mild back or flank tension (non-severe)</li>
          </ul>
          
          <h4>Common Causes of UTIs</h4>
          <p>
            UTIs can occur for many reasons, including dehydration, sexual activity, use of irritating hygiene products,
            hormonal changes, or a history of previous infections. Some people are more prone to UTIs based on anatomy or
            underlying conditions, and clinicians take this information into consideration during review.
          </p>
          
          <h4>UTI Risk Factors</h4>
          <ul>
            <li>Previous UTIs</li>
            <li>Low hydration</li>
            <li>Certain hygiene or personal care products</li>
            <li>Sexual activity</li>
            <li>Post-menopausal changes</li>
          </ul>
          
          {/* STD Overview */}
          <h3>Understanding STDs / STIs</h3>
          
          <p>
            Common sexually transmitted infections include chlamydia, gonorrhea, trichomoniasis, and, for some individuals,
            outbreaks of genital herpes (HSV). Many STDs require laboratory testing for confirmation. Telehealth clinicians
            review symptoms, timing, exposure history, and medical background to help determine next steps.
          </p>
          
          <h4>Common STD Symptoms Reported</h4>
          <ul>
            <li>Genital discomfort or irritation</li>
            <li>Mild discharge or urinary burning</li>
            <li>New sores, bumps, or lesions</li>
            <li>Recent exposure to a partner with a known infection</li>
            <li>Requests for general evaluation or follow-up</li>
          </ul>
          
          <h4>When Lab Tests Are Recommended</h4>
          <p>
            Many STDs benefit from lab confirmation. Telehealth clinicians may recommend testing through a {stateData.name} clinic,
            primary care office, urgent care center, or county health department depending on symptoms and exposure history.
            Testing guidance is provided on a case-by-case basis.
          </p>
          
          <h4>Partner Notification (General Education)</h4>
          <p>
            Individuals diagnosed with an STD are often encouraged to notify recent partners so they can be evaluated or
            tested. Telehealth clinicians may provide general guidance, but each individual&apos;s circumstances vary.
          </p>
          
          {/* How Telehealth Works */}
          <h3>How Telehealth Works for UTI &amp; STD Concerns</h3>
          
          <p>
            Licensed {stateData.name} clinicians evaluate symptoms submitted through the secure intake. They may ask questions about
            timing, severity, allergies, previous conditions, and exposure history. Based on this information, the clinician
            decides whether telehealth is appropriate or whether in-person care is recommended.
          </p>
          
          <h4>What Clinicians Commonly Review</h4>
          <ul>
            <li>Duration of symptoms</li>
            <li>Severity and progression</li>
            <li>Allergy history</li>
            <li>Current medications</li>
            <li>Previous infections or conditions</li>
            <li>Pregnancy status (when applicable)</li>
            <li>Recent exposure to partners with symptoms or confirmed diagnoses</li>
          </ul>
          
          <h4>Treatment Expectations (General Education)</h4>
          <p>
            If a clinician determines that treatment is suitable, they may electronically send medication to a {stateData.name}
            pharmacy selected during the visit. Medication choices depend on allergies, symptoms, medication history,
            and clinical judgment. This page does not list specific medications or guaranteed treatments.
          </p>
          
          {/* When Telehealth Is Not Appropriate */}
          <h3>When Telehealth May Not Be Appropriate</h3>
          
          <p>
            Some symptoms require in-person evaluation. Telehealth clinicians may redirect patients to in-person care if
            symptoms fall outside the scope of remote evaluation.
          </p>
          
          <ul>
            <li>High fever</li>
            <li>Severe abdominal or pelvic pain</li>
            <li>Blood in urine with significant discomfort</li>
            <li>Vomiting or inability to keep fluids down</li>
            <li>Pregnancy with concerning symptoms</li>
            <li>Symptoms lasting significantly longer than expected</li>
            <li>Possible kidney infection indicators</li>
          </ul>
          
          <p>
            If any severe symptoms occur, in-person urgent evaluation may be recommended.
          </p>
          
          {/* Prevention */}
          <h3>General Prevention Tips</h3>
          
          <h4>Reducing UTI Risk</h4>
          <ul>
            <li>Stay hydrated</li>
            <li>Urinate after sexual activity</li>
            <li>Avoid irritating hygiene products</li>
            <li>Wear breathable fabrics</li>
          </ul>
          
          <h4>Reducing STD Risk</h4>
          <ul>
            <li>Use protection consistently</li>
            <li>Limit exposure to unknown partners</li>
            <li>Seek testing when needed</li>
            <li>Discuss concerns with partners</li>
          </ul>
          
          {/* Florida-Specific Information */}
          <h3>{stateData.name}-Specific Telehealth Insights</h3>
          
          <p>
            {stateData.name} supports telehealth evaluations under {stateData.teleheathStatute || 'state telehealth regulations'}, which permits licensed {stateData.name} clinicians
            to review symptoms and provide guidance or prescriptions when appropriate. Because of {stateData.name}&apos;s large size and
            diverse regions, telehealth is commonly used by residents in both metropolitan and rural areas.
          </p>
          
          <h4>Major {stateData.name} Regions Commonly Using Telehealth</h4>
          <ul>
            {stateData.majorCities.slice(0, 5).map((city, idx) => (
              <li key={idx}>{city}</li>
            ))}
          </ul>
          
          <h4>{stateData.name} Pharmacy Convenience</h4>
          <p>
            {stateData.name}&apos;s statewide network of Publix, CVS, Walgreens, Walmart, and independent pharmacies provides broad access
            for same-day pickup when a clinician determines treatment is appropriate.
          </p>
          
          {/* Related Conditions */}
          <h3>Related Visit Reasons</h3>
          <ul>
            <li><a href="/private/visit/bv">Bacterial Vaginosis (BV)</a></li>
            <li><a href="/private/visit/yeast">Yeast Infection</a></li>
            <li><a href="/private/visit/sinus">Sinus Infection</a></li>
            <li><a href="/private/visit/cold-flu">Cold / Flu / URI</a></li>
            <li><a href="/private/visit/refill">Medication Refill</a></li>
            <li><a href="/private/visit/private">Private / Sensitive Visit</a></li>
          </ul>
          </div>
        </div>
      </section>      

      {/* ===== FLORIDA CITIES SECTION ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem] text-center">
          <h2 className="gradient-title text-[1.8rem] mb-6">{t(serviceData.citiesSection.title)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowCities(!showCities)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showCities ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showCities ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-[1.05rem] leading-[1.6] max-w-[760px] mx-auto mb-8">
              {t(serviceData.citiesSection.subtitle)}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[18px]">
              {stateData.majorCities.map((city) => (
                <span 
                  key={city}
                  className="bg-[rgba(255,255,255,0.06)] py-[14px] px-[18px] rounded-[12px] border border-[rgba(255,255,255,0.08)] text-[#00ddb0] font-semibold shadow-[0_0_10px_rgba(0,221,176,0.25)] hover:bg-[rgba(255,255,255,0.1)] transition-all cursor-pointer"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== ZIP CODES SECTION ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] text-center mb-6">{t(serviceData.zipSection.title)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowZipCodes(!showZipCodes)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showZipCodes ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showZipCodes ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-[1.05rem] leading-[1.6] text-center max-w-[760px] mx-auto mb-8">
              {t(serviceData.zipSection.subtitle)}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[14px] text-center">
              {Object.entries(stateData.zipClusters).map(([city, zips]) => (
                <div key={city} className="bg-[rgba(255,255,255,0.06)] p-[14px] rounded-[12px] border border-[rgba(255,255,255,0.08)]">
                  <h4 className="text-[#00ddb0] mb-2 font-semibold">{city}</h4>
                  <p className="text-[#dfe3e6] text-[0.9rem] leading-[1.5]">
                    {zips.map((zip, idx) => (
                      <span key={zip}>{zip}{idx < zips.length - 1 && <br />}</span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE SECTION ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] text-center mb-6">{t(serviceData.whyChoose.title)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowWhyChoose(!showWhyChoose)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showWhyChoose ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showWhyChoose ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-[1.05rem] leading-[1.6] text-center max-w-[760px] mx-auto mb-8">
              {t(serviceData.whyChoose.subtitle)}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceData.whyChoose.reasons.map((reason, idx) => (
                <div key={idx} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[14px] p-5 shadow-[0_0_15px_rgba(0,221,176,0.25)]">
                  <h3 className="text-[#00ddb0] text-[1.05rem] font-semibold mb-2">{t(reason.title)}</h3>
                  <p className="text-[#dfe3e6] text-[0.9rem] leading-[1.55]">{t(reason.description)}</p>
                </div>
              ))}
            </div>
            
            <p className="text-[#00ddb0] font-semibold mt-8 text-center">*This information is for general educational purposes.*</p>
          </div>
        </div>
      </section>

      {/* ===== COVERAGE AREAS SECTION ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] text-center mb-6">{t(serviceData.coverageAreas.title)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowCoverageAreas(!showCoverageAreas)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showCoverageAreas ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showCoverageAreas ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-[1.05rem] leading-[1.6] text-center max-w-[760px] mx-auto mb-8">
              {t(serviceData.coverageAreas.subtitle)}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {stateData.coverageRegions.map((region, idx) => (
                <div key={idx} className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[14px] p-5 shadow-[0_0_15px_rgba(0,221,176,0.25)]">
                  <h3 className="text-[#00ddb0] text-[1.05rem] font-semibold mb-3">{region.name}</h3>
                  <p className="text-[#dfe3e6] text-[0.9rem] leading-[1.55]">
                    {region.counties.map((county, cIdx) => (
                      <span key={cIdx}>{county}{cIdx < region.counties.length - 1 && <br />}</span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Availability Note */}
            <div className="text-center">
              <h3 className="text-[#00ddb0] text-[1.3rem] mb-3">{stateData.name} Telehealth Availability</h3>
              <p className="max-w-[760px] mx-auto text-[#dfe3e6] leading-[1.6]">{serviceData.coverageAreas.availabilityNote}</p>
            </div>
            
            <p className="text-[#00ddb0] font-semibold mt-8 text-center">*This section is for general educational and informational use.*</p>
          </div>
        </div>
      </section>

      {/* ===== ABOUT CLINICIAN SECTION ===== */}
      <section className="py-[80px] px-5" style={{ background: 'linear-gradient(180deg, #0B0F12 0%, #141B1E 100%)' }}>
        <div className="glass-card max-w-[1000px] mx-auto p-[3rem_2rem]">
          <h2 className="gradient-title text-[1.8rem] text-center mb-6">{t(serviceData.aboutClinician.title)}</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowAboutClinician(!showAboutClinician)}
              className="bg-[#003d35] border border-[#00ddb0] text-white font-bold py-3 px-6 rounded-[10px] cursor-pointer shadow-[0_0_10px_rgba(0,221,176,0.35)] transition-all hover:bg-[#00584b]"
            >
              {showAboutClinician ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showAboutClinician ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-[1.05rem] leading-[1.6] text-center max-w-[760px] mx-auto mb-8">
              This section provides general educational background about the licensed clinician who reviews symptoms submitted by adults located in {stateData.name} during private telehealth visits.
            </p>
            
            <div className="max-w-[760px] mx-auto text-left leading-[1.65] text-[0.95rem]">
              <h3 className="text-[#00ddb0] text-[1.25rem] mb-3">
                {serviceData.aboutClinician.name}, {serviceData.aboutClinician.credentials}
              </h3>
              <p className="mb-5">{t(serviceData.aboutClinician.bio)}</p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.aboutClinician.education.title}</h4>
              <ul className="ml-5 leading-[1.55]">
                {serviceData.aboutClinician.education.items.map((item, idx) => (
                  <li key={idx}>{t(item)}</li>
                ))}
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.aboutClinician.focus.title}</h4>
              <ul className="ml-5 leading-[1.55]">
                {serviceData.aboutClinician.focus.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.aboutClinician.telehealth.title}</h4>
              <p className="mb-4">{t(serviceData.aboutClinician.telehealth.description)}</p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">{serviceData.aboutClinician.safety.title}</h4>
              <p className="mb-4">{t(serviceData.aboutClinician.safety.description)}</p>
              
              <p className="text-[#00ddb0] font-semibold mt-6 text-center border-t border-[rgba(255,255,255,0.08)] pt-6">
                {serviceData.aboutClinician.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER SECTION ===== */}
      <footer className="bg-[#0a0f14] text-white text-center py-[80px] px-5 border-t border-[rgba(255,255,255,0.08)]">
        <div className="glass-card max-w-[900px] mx-auto p-[3rem_2rem] mb-10">
          <h3 className="text-[1.5rem] font-bold text-[#00ddb0] mb-2">{serviceData.footer.brandText}</h3>
          <p className="text-[rgba(255,255,255,0.7)] text-[0.95rem] mb-5">
            Secure · Licensed · Private Telehealth Care in {stateData.name}
          </p>
          
          {/* Compliance Links */}
          <div className="flex flex-wrap justify-center gap-[14px] mb-5">
            {serviceData.footer.links.map((link, idx) => (
              <Link key={idx} href={link.href} className="text-[rgba(255,255,255,0.6)] text-[0.85rem] hover:text-[#00ddb0] transition-colors">
                {link.text}
              </Link>
            ))}
          </div>
          
          {/* Legal Text */}
          <p className="text-[0.85rem] text-[rgba(255,255,255,0.6)] leading-[1.6] mb-5">
            {serviceData.footer.copyright}<br />
            {t(serviceData.footer.address)}<br />
            {t(serviceData.footer.legalNote)}
          </p>
          
          {/* Social Icons */}
          <div className="flex justify-center gap-3">
            <span className="text-[1.1rem] text-[rgba(255,255,255,0.7)] hover:text-[#00ddb0] cursor-pointer transition-colors">🌐</span>
            <span className="text-[1.1rem] text-[rgba(255,255,255,0.7)] hover:text-[#00ddb0] cursor-pointer transition-colors">📸</span>
            <span className="text-[1.1rem] text-[rgba(255,255,255,0.7)] hover:text-[#00ddb0] cursor-pointer transition-colors">💼</span>
          </div>
        </div>
        
        {/* SEO Footer */}
        <p className="text-[rgba(255,255,255,0.5)] text-[0.8rem] max-w-[900px] mx-auto leading-[1.6]">
          Medazon Health offers private UTI and STD treatment online for {stateData.name} residents, serving {stateData.majorCities.slice(0, 4).join(", ")} with same-day telehealth care and prescriptions.
        </p>
      </footer>
    </div>
  );
}
