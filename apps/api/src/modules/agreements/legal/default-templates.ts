import { JobType } from '@prisma/client';
import type { AgreementLegalContent } from '@sitescop/shared-types';

const buildingSections: AgreementLegalContent['sections'] = [
  {
    id: 'scope',
    title: 'Scope of Inspection',
    content: `The inspection will be a visual assessment of the readily accessible areas of the property in accordance with Australian Standard AS 4349.1. The inspection covers the interior and exterior of the building, roof exterior (where safely accessible), subfloor (where safely accessible), and site within 30 metres of the building.`,
  },
  {
    id: 'limitations',
    title: 'Inspection Limitations',
    content: `This inspection is not a structural engineering assessment, pest inspection, asbestos inspection, or compliance certificate. Concealed defects, latent defects, and areas inaccessible due to safety, weather, furniture, or locked areas are excluded. Services (plumbing, electrical, gas) are not tested unless otherwise agreed in writing.`,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    content: `The Client engages the inspection company to perform the agreed inspection services. Reports are prepared for the Client's use only. Liability is limited to the extent permitted by law. The inspection company may subcontract qualified inspectors. Cancellation fees may apply if less than 24 hours notice is given.`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    content: `Personal information collected for this agreement is used to deliver inspection services, communicate about the booking, and meet legal obligations. Information may be shared with appointed inspectors and relevant parties involved in the property transaction. Clients may request access to their personal information in accordance with the Privacy Act 1988 (Cth).`,
  },
  {
    id: 'declaration',
    title: 'Client Declaration',
    content: `By signing this agreement I confirm that I have read and understood the Scope of Inspection, Inspection Limitations, Terms & Conditions, and Privacy Policy. I authorise the inspection to proceed at the nominated property and accept the quoted fee.`,
  },
];

const pestSections: AgreementLegalContent['sections'] = [
  {
    id: 'scope',
    title: 'Scope of Timber Pest Inspection',
    content: `The inspection will assess the property for timber pests including termites, borers, and fungal decay in accessible timber elements, in accordance with AS 4349.3 and AS 3660. The inspection covers readily accessible areas of the building and site within the boundary.`,
  },
  {
    id: 'limitations',
    title: 'Inspection Limitations',
    content: `This inspection does not guarantee absence of timber pests in concealed or inaccessible areas. No invasive testing is performed unless separately agreed. Environmental conditions on the day of inspection may affect detectability of active infestation.`,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    content: `The Client engages the inspection company to perform the agreed timber pest inspection. Reports are for the Client's use in relation to the nominated property transaction. Fees are payable as quoted. Re-inspection fees may apply for access failures or rescheduled appointments.`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    content: `Personal and property information is collected to deliver pest inspection services and associated reporting. Data is stored securely and used only for legitimate business purposes related to this inspection agreement.`,
  },
  {
    id: 'declaration',
    title: 'Client Declaration',
    content: `By signing this agreement I confirm that I have read and accepted all inspection documents, authorise access to the property for timber pest inspection, and agree to the quoted fee.`,
  },
];

const combinedSections: AgreementLegalContent['sections'] = [
  {
    id: 'scope',
    title: 'Scope of Combined Inspection',
    content: `The inspection includes both a building inspection (AS 4349.1) and timber pest inspection (AS 4349.3 / AS 3660) of the readily accessible areas of the property and site.`,
  },
  {
    id: 'limitations',
    title: 'Inspection Limitations',
    content: `Combined inspections are subject to the limitations of each inspection type. Concealed, inaccessible, or unsafe areas are excluded. This is not a structural engineering, compliance, or invasive inspection unless separately agreed.`,
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    content: `The Client engages the inspection company to perform the combined building and pest inspection services. Reports are prepared for the Client's nominated purpose. Standard cancellation and rescheduling terms apply.`,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    content: `Personal information is handled in accordance with the Privacy Act 1988 (Cth) and used solely to deliver the agreed combined inspection services.`,
  },
  {
    id: 'declaration',
    title: 'Client Declaration',
    content: `By signing I confirm I have read all agreement documents, authorise the combined inspection at the nominated address, and accept the total quoted fee including GST where applicable.`,
  },
];

const DEFAULT_BY_TYPE: Record<string, AgreementLegalContent['sections']> = {
  [JobType.BUILDING]: buildingSections,
  [JobType.PEST]: pestSections,
  [JobType.COMBINED]: combinedSections,
  [JobType.PRE_PURCHASE]: buildingSections,
  [JobType.PRE_SALE]: buildingSections,
  [JobType.OTHER]: buildingSections,
};

export function getDefaultLegalSections(type: JobType): AgreementLegalContent {
  return { sections: DEFAULT_BY_TYPE[type] ?? buildingSections };
}

export function mergeLegalSections(
  type: JobType,
  companyOverrides?: Record<string, AgreementLegalContent> | null,
): AgreementLegalContent {
  const override = companyOverrides?.[type];
  if (override?.sections?.length) {
    return override;
  }
  return getDefaultLegalSections(type);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
