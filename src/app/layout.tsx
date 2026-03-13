import type { Metadata } from "next";
import "./globals.css";
import SyncInitializer from "@/components/SyncInitializer";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Instant Virtual Urgent Care in Florida — Medazon Health",
  description: "Fast, private virtual urgent care in Florida. Licensed clinicians evaluate symptoms for cold/flu, UTI concerns, sinus infections, nausea, rashes, pink eye, allergies, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="canonical" href="https://medazonhealth.com/urgent-care/florida" />
        <meta name="theme-color" content="#0B0F12" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Medical Business (Primary Entity) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "name": "Medazon Health Urgent Care",
          "url": "https://medazonhealth.com/urgent-care/florida",
          "description": "Florida urgent care telehealth service providing virtual evaluations for mild symptoms such as cold/flu, sinus infections, pink eye, nausea, rashes, and urinary discomfort.",
          "areaServed": "Florida",
          "medicalSpecialty": [
            "UrgentCare",
            "Telemedicine",
            "PrimaryCare"
          ],
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "2700 NE 62ND Street",
            "addressLocality": "Fort Lauderdale",
            "addressRegion": "FL",
            "postalCode": "33308",
            "addressCountry": "US"
          }
        }
        `}} />

        {/* Medical Web Page — Urgent Care Page */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          "name": "Florida Virtual Urgent Care — Medazon Health",
          "url": "https://medazonhealth.com/urgent-care/florida",
          "description": "Educational information about Florida virtual urgent care including symptoms evaluated, care limitations, telehealth workflow, safety guidelines, pharmacy pickup expectations, and regional coverage.",
          "about": [
            { "@type": "MedicalCondition", "name": "Common Cold" },
            { "@type": "MedicalCondition", "name": "Influenza" },
            { "@type": "MedicalCondition", "name": "Urinary Symptoms" },
            { "@type": "MedicalCondition", "name": "Allergies" },
            { "@type": "MedicalCondition", "name": "Sinus Infection" },
            { "@type": "MedicalCondition", "name": "Pink Eye (Conjunctivitis)" },
            { "@type": "MedicalCondition", "name": "Skin Rash" },
            { "@type": "MedicalCondition", "name": "Migraine" },
            { "@type": "MedicalCondition", "name": "Nausea" }
          ],
          "inLanguage": "en-US",
          "publisher": {
            "@type": "Organization",
            "name": "Medazon Health"
          }
        }
        `}} />

        {/* Breadcrumb List — Urgent Care Navigation */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Services", "item": "https://medazonhealth.com/services" },
            { "@type": "ListItem", "position": 2, "name": "Urgent Care", "item": "https://medazonhealth.com/urgent-care" },
            { "@type": "ListItem", "position": 3, "name": "Florida Virtual Urgent Care", "item": "https://medazonhealth.com/urgent-care/florida" }
          ]
        }
        `}} />

        {/* Medical Conditions (Urgent Care Conditions) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        [
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Common Cold",
            "signOrSymptom": ["Runny nose", "Cough", "Sore throat"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Influenza",
            "signOrSymptom": ["Fever", "Body aches", "Chills"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Urinary Symptoms",
            "signOrSymptom": ["Burning urination", "Urinary frequency"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Pink Eye (Conjunctivitis)",
            "signOrSymptom": ["Eye redness", "Discharge", "Itching"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Skin Rash",
            "signOrSymptom": ["Redness", "Itching", "Irritation"]
          }
        ]
        `}} />

        {/* Medical Procedure — Urgent Care Evaluation */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalProcedure",
          "name": "Virtual Urgent Care Evaluation",
          "description": "A telehealth review of urgent care symptoms by a clinician licensed in Florida, determining whether virtual care is appropriate or if in-person evaluation is required.",
          "howPerformed": "Symptoms are submitted securely and reviewed by a clinician. Follow-up questions may be asked when needed.",
          "followup": "Advice is provided for in-person care, emergency symptoms, or pharmacy pickup when appropriate."
        }
        `}} />

        {/* Physician — E-E-A-T Boost */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "Physician",
          "name": "LaMonica A. Hodges, MSN, APRN, FNP-C",
          "jobTitle": "Family Nurse Practitioner",
          "description": "Florida-licensed clinician experienced in urgent care telehealth assessments including mild symptoms such as cold, flu, sinus pressure, urinary symptoms, rash, nausea, and pink eye.",
          "medicalSpecialty": [
            "UrgentCare",
            "PrimaryCare",
            "Telemedicine"
          ],
          "worksFor": {
            "@type": "Organization",
            "name": "Medazon Health"
          },
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "2700 NE 62ND Street",
            "addressLocality": "Fort Lauderdale",
            "addressRegion": "FL",
            "addressCountry": "US"
          }
        }
        `}} />

        {/* ItemList — Smart Search Symptom Index */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Urgent Care Symptom Search Index",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "item": "Cold symptoms" },
            { "@type": "ListItem", "position": 2, "item": "Flu symptoms" },
            { "@type": "ListItem", "position": 3, "item": "Sinus infection" },
            { "@type": "ListItem", "position": 4, "item": "Pink eye" },
            { "@type": "ListItem", "position": 5, "item": "Urinary discomfort" },
            { "@type": "ListItem", "position": 6, "item": "Rash or irritation" },
            { "@type": "ListItem", "position": 7, "item": "Migraine" },
            { "@type": "ListItem", "position": 8, "item": "Nausea" }
          ]
        }
        `}} />

        {/* SearchAction — For Symptom Smart Search */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://medazonhealth.com/intake?symptom={search_term}"
          },
          "query-input": "required name=search_term"
        }
        `}} />
      </head>
      <body suppressHydrationWarning>
        <SyncInitializer />
        <OfflineBanner />
        {children}
        {/* EditorPro inspection bridge — only activates when loaded inside EditorPro iframe */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var ALLOWED = ['https://streamsai-editor.vercel.app','http://localhost:3000'];
  if (window === window.top) return; // not in iframe — exit immediately
  var selEl = null;
  function toHex(c) {
    if (!c || c === 'transparent' || c.indexOf('0, 0, 0, 0') > -1) return '';
    var m = c.match(/\\d+/g); if (!m || m.length < 3) return '';
    var h = '#' + m.slice(0,3).map(function(n){return (+n).toString(16).padStart(2,'0')}).join('');
    return (h==='#000000'||h==='#ffffff'||h==='#fefefe') ? '' : h;
  }
  function getStyles(el) {
    var cs = window.getComputedStyle(el), r = el.getBoundingClientRect(), s = {};
    'color backgroundColor fontSize fontWeight fontFamily textAlign lineHeight letterSpacing textTransform paddingTop paddingBottom paddingLeft paddingRight marginTop marginBottom marginLeft marginRight width height maxWidth minHeight border borderRadius boxShadow display position flexDirection justifyContent alignItems gap opacity background borderColor'.split(' ').forEach(function(k){ s[k]=cs[k]; });
    return { tag: el.tagName.toLowerCase(), txt: (el.innerText||el.textContent||'').slice(0,200), rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, sty: s };
  }
  function send(data) { window.parent.postMessage(data, '*'); }
  document.addEventListener('mouseover', function(e) {
    document.querySelectorAll('[data-ep-hov]').forEach(function(n){ if(n!==selEl){n.style.outline='';n.removeAttribute('data-ep-hov');} });
    if (e.target !== selEl && e.target !== document.body && e.target !== document.documentElement) {
      e.target.style.outline = '2px solid rgba(249,115,22,0.5)';
      e.target.setAttribute('data-ep-hov','1');
    }
  }, true);
  document.addEventListener('mouseout', function(e) {
    if (e.target !== selEl) { e.target.style.outline=''; e.target.removeAttribute('data-ep-hov'); }
  }, true);
  document.addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation();
    if (selEl && selEl !== e.target) { selEl.style.outline=''; selEl.removeAttribute('data-ep-sel'); }
    selEl = e.target; selEl.style.outline='2px solid #f97316'; selEl.setAttribute('data-ep-sel','1');
    send({ type: 'ep-sel', ...getStyles(selEl) });
  }, true);
  window.addEventListener('message', function(e) {
    if (!selEl) return;
    if (e.data && e.data.type === 'ep-style') { selEl.style[e.data.prop] = e.data.value; send({ type: 'ep-sel', ...getStyles(selEl) }); }
    if (e.data && e.data.type === 'ep-text')  { selEl.innerText = e.data.value; }
    if (e.data && e.data.type === 'ep-desel') { if(selEl){selEl.style.outline='';selEl.removeAttribute('data-ep-sel');selEl=null;} }
  });
  setTimeout(function() {
    var colors=[], seen={};
    document.querySelectorAll('*').forEach(function(el){
      var cs=getComputedStyle(el);
      ['color','backgroundColor','borderTopColor'].forEach(function(k){ var h=toHex(cs[k]); if(h&&!seen[h]){seen[h]=1;colors.push(h);} });
    });
    send({ type: 'ep-colors', colors: colors.slice(0,64) });
    send({ type: 'ep-ready' });
  }, 1000);
})();
        `}} />
      </body>
    </html>
  );
}
