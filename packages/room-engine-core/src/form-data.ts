import type {
  AccessibilityObstructionsSection,
  BuildingInspectionFormData,
  ExternalSection,
  InspectorDeclarationSection,
  JobInformationSection,
  KitchenSection,
  LaundrySection,
  PropertyDescriptionSection,
  RoofExteriorSection,
  RoofSpaceSection,
  ServicesSection,
  SiteConditionsSection,
  ConclusionSection,
  RecommendationsSection,
  SubfloorSection,
  FencingSection,
  OutbuildingsSection,
  CorrosionSection,
  MinorDefectsSection,
  MajorDefectsSection,
  ThermalImagingSection,
  MoistureTestingSection,
  RiskAssessmentSection,
  PrefillJobContext,
} from './types.js';
import type { PestInspectionSections } from './pest-types.js';
import { createEmptyFormData, normalizeAccessibilityAreas } from './defaults.js';
import { createEmptyPestSections, applyPestSectionDefaults } from './pest-defaults.js';
import {
  applyConclusionUpdates,
  generateAutoRecommendations,
  generateRiskExplanation,
} from './conclusion.js';
import { applyPestSectionUpdates } from './pest-conclusion.js';

export const INSPECTION_FORM_VERSION = 2 as const;

/** Shared by building, pest, and combined — Job Information through Roof Space (kitchen excluded). */
export interface SharedInspectionSections {
  jobInformation: JobInformationSection;
  services: ServicesSection;
  propertyDescription: PropertyDescriptionSection;
  accessibilityObstructions: AccessibilityObstructionsSection;
  siteConditions: SiteConditionsSection;
  external: ExternalSection;
  roofExterior: RoofExteriorSection;
  roofSpace: RoofSpaceSection;
}

export type SharedInspectionSectionKey = keyof SharedInspectionSections;

export const SHARED_INSPECTION_SECTION_KEYS: SharedInspectionSectionKey[] = [
  'jobInformation',
  'services',
  'propertyDescription',
  'accessibilityObstructions',
  'siteConditions',
  'external',
  'roofExterior',
  'roofSpace',
];

export const SHARED_INSPECTION_SECTION_LABELS: Record<SharedInspectionSectionKey, string> = {
  jobInformation: 'Job Information',
  services: 'Services',
  propertyDescription: 'Property Description',
  accessibilityObstructions: 'Accessibility',
  siteConditions: 'Site Conditions',
  external: 'External',
  roofExterior: 'Roof Exterior',
  roofSpace: 'Roof Space',
};

/** Building-only sections from Kitchen onward. */
export interface BuildingExtensionSections {
  kitchen: KitchenSection;
  laundry: LaundrySection;
  subfloor: SubfloorSection;
  fencing: FencingSection;
  outbuildings: OutbuildingsSection;
  corrosion: CorrosionSection;
  minorDefects: MinorDefectsSection;
  majorDefects: MajorDefectsSection;
  thermalImaging: ThermalImagingSection;
  moistureTesting: MoistureTestingSection;
  riskAssessment: RiskAssessmentSection;
  conclusion: ConclusionSection;
  recommendations: RecommendationsSection;
  inspectorDeclaration: InspectorDeclarationSection;
}

export type BuildingExtensionSectionKey = keyof BuildingExtensionSections;

export const BUILDING_EXTENSION_SECTION_KEYS: BuildingExtensionSectionKey[] = [
  'kitchen',
  'laundry',
  'subfloor',
  'fencing',
  'outbuildings',
  'corrosion',
  'minorDefects',
  'majorDefects',
  'thermalImaging',
  'moistureTesting',
  'riskAssessment',
  'conclusion',
  'recommendations',
  'inspectorDeclaration',
];

export const BUILDING_EXTENSION_SECTION_LABELS: Record<BuildingExtensionSectionKey, string> = {
  kitchen: 'Kitchen',
  laundry: 'Laundry',
  subfloor: 'Subfloor',
  fencing: 'Fencing',
  outbuildings: 'Outbuildings',
  corrosion: 'Corrosion',
  minorDefects: 'Minor Defects',
  majorDefects: 'Major Defects',
  thermalImaging: 'Thermal Imaging',
  moistureTesting: 'Moisture Testing',
  riskAssessment: 'Risk Assessment',
  conclusion: 'Conclusion',
  recommendations: 'Recommendations',
  inspectorDeclaration: 'Inspector Declaration',
};

export type InspectionFormRealm = 'shared' | 'building' | 'pest';

export interface InspectionFormDataV2 {
  version: typeof INSPECTION_FORM_VERSION;
  shared: SharedInspectionSections;
  building?: BuildingExtensionSections;
  pest?: PestInspectionSections;
}

export type InspectionJobFormKind = 'BUILDING' | 'PEST' | 'COMBINED';

function splitLegacyBuildingFormData(legacy: BuildingInspectionFormData): InspectionFormDataV2 {
  const {
    jobInformation,
    services,
    propertyDescription,
    accessibilityObstructions,
    siteConditions,
    external,
    roofExterior,
    roofSpace,
    ...buildingRest
  } = legacy;

  return {
    version: INSPECTION_FORM_VERSION,
    shared: {
      jobInformation,
      services,
      propertyDescription,
      accessibilityObstructions,
      siteConditions,
      external,
      roofExterior,
      roofSpace,
    },
    building: buildingRest as BuildingExtensionSections,
  };
}

function extractSharedFromLegacy(legacy: BuildingInspectionFormData): SharedInspectionSections {
  return splitLegacyBuildingFormData(legacy).shared;
}

export function normalizeInspectionFormData(
  raw: unknown,
  jobFormKind: InspectionJobFormKind = 'BUILDING',
): InspectionFormDataV2 {
  if (raw && typeof raw === 'object' && (raw as InspectionFormDataV2).version === INSPECTION_FORM_VERSION) {
    const v2 = raw as InspectionFormDataV2;
    return {
      version: INSPECTION_FORM_VERSION,
      shared: v2.shared,
      building: v2.building,
      pest: v2.pest ? applyPestSectionDefaults(v2.pest) : undefined,
    };
  }

  const legacy = raw as BuildingInspectionFormData;
  if (legacy?.jobInformation) {
    const migrated = splitLegacyBuildingFormData(legacy);
    if (jobFormKind === 'PEST') {
      return {
        version: INSPECTION_FORM_VERSION,
        shared: migrated.shared,
        pest: createEmptyPestSections(),
      };
    }
    if (jobFormKind === 'COMBINED') {
      return {
        version: INSPECTION_FORM_VERSION,
        shared: migrated.shared,
        building: migrated.building,
        pest: createEmptyPestSections(),
      };
    }
    return migrated;
  }

  return createEmptyInspectionFormData(jobFormKind);
}

export function createEmptyInspectionFormData(
  jobFormKind: InspectionJobFormKind,
  prefill?: PrefillJobContext,
): InspectionFormDataV2 {
  const legacy = createEmptyFormData(prefill);
  const { shared, building } = splitLegacyBuildingFormData(legacy);

  if (jobFormKind === 'PEST') {
    return {
      version: INSPECTION_FORM_VERSION,
      shared,
      pest: createEmptyPestSections(prefill),
    };
  }

  if (jobFormKind === 'COMBINED') {
    return {
      version: INSPECTION_FORM_VERSION,
      shared,
      building,
      pest: createEmptyPestSections(prefill),
    };
  }

  return {
    version: INSPECTION_FORM_VERSION,
    shared,
    building,
  };
}

export function jobTypeToFormKind(jobType: string): InspectionJobFormKind {
  if (jobType === 'PEST') return 'PEST';
  if (jobType === 'COMBINED') return 'COMBINED';
  return 'BUILDING';
}

export function flattenToLegacyBuildingFormData(form: InspectionFormDataV2): BuildingInspectionFormData {
  if (!form.building) {
    throw new Error('Building extension data is required to flatten legacy building form');
  }
  return {
    ...form.shared,
    ...form.building,
  };
}

/** Building auto-enrichment using flattened legacy shape for existing generators. */
export function enrichBuildingExtension(building: BuildingExtensionSections, shared: SharedInspectionSections): BuildingExtensionSections {
  const flat = { ...shared, ...building } as BuildingInspectionFormData;
  return {
    ...building,
    conclusion: applyConclusionUpdates(building.conclusion),
    recommendations: {
      ...building.recommendations,
      autoRecommendations: generateAutoRecommendations(flat),
    },
  };
}

export function enrichSharedSections(shared: SharedInspectionSections): SharedInspectionSections {
  return {
    ...shared,
    accessibilityObstructions: {
      ...shared.accessibilityObstructions,
      accessibilityAreas: normalizeAccessibilityAreas(shared.accessibilityObstructions.accessibilityAreas),
      riskExplanation: generateRiskExplanation(shared.accessibilityObstructions.undetectedStructuralRisk),
    },
  };
}

export function enrichInspectionFormData(form: InspectionFormDataV2): InspectionFormDataV2 {
  const shared = enrichSharedSections(form.shared);
  const building = form.building ? enrichBuildingExtension(form.building, shared) : undefined;
  const pest = form.pest ? applyPestSectionUpdates(form.pest) : undefined;
  return {
    version: INSPECTION_FORM_VERSION,
    shared,
    building,
    pest,
  };
}

export function calculateInspectionProgress(form: InspectionFormDataV2): number {
  let filled = 0;
  let total = 0;

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      total += 1;
      if (value.trim()) filled += 1;
      return;
    }
    if (typeof value === 'number') {
      total += 1;
      if (value > 0) filled += 1;
      return;
    }
    if (typeof value === 'boolean') {
      total += 1;
      if (value) filled += 1;
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        total += 1;
        return;
      }
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };

  walk(form.shared);
  if (form.building) walk(form.building);
  if (form.pest) walk(form.pest);

  if (total === 0) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

export function getSectionData(
  form: InspectionFormDataV2,
  realm: InspectionFormRealm,
  section: string,
): Record<string, unknown> | undefined {
  if (realm === 'shared') {
    return form.shared[section as SharedInspectionSectionKey] as unknown as Record<string, unknown>;
  }
  if (realm === 'building' && form.building) {
    return form.building[section as BuildingExtensionSectionKey] as unknown as Record<string, unknown>;
  }
  if (realm === 'pest' && form.pest) {
    return form.pest[section as keyof PestInspectionSections] as unknown as Record<string, unknown>;
  }
  return undefined;
}

export function patchSectionData(
  form: InspectionFormDataV2,
  realm: InspectionFormRealm,
  section: string,
  partial: Record<string, unknown>,
): InspectionFormDataV2 {
  if (realm === 'shared') {
    const key = section as SharedInspectionSectionKey;
    return {
      ...form,
      shared: {
        ...form.shared,
        [key]: { ...(form.shared[key] as object), ...partial },
      },
    };
  }
  if (realm === 'building' && form.building) {
    const key = section as BuildingExtensionSectionKey;
    return {
      ...form,
      building: {
        ...form.building,
        [key]: { ...(form.building[key] as object), ...partial },
      },
    };
  }
  if (realm === 'pest' && form.pest) {
    const key = section as keyof PestInspectionSections;
    return {
      ...form,
      pest: {
        ...form.pest,
        [key]: { ...(form.pest[key] as object), ...partial },
      },
    };
  }
  return form;
}

/** Property description lives under shared in v2 form. */
export function getPropertyDescription(form: InspectionFormDataV2) {
  return form.shared.propertyDescription;
}

export { extractSharedFromLegacy };
