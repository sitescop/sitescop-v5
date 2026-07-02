import type { PestInspectionSections } from './pest-types.js';
import {
  D10_EVIDENCE_REPORT_PREFIX,
  D10_STAINS_REPORT_PREFIX,
  D3_EVIDENCE_REPORT_PREFIX,
  MANAGEMENT_PROPOSAL_OPTIONS,
} from './pest-options.js';

export function generateTimberPestRiskExplanation(riskLevel: string): string {
  return `Due to the level of accessibility for inspection including the presence of obstructions, the overall degree of undetected Timber Pest Attack and Conditions Conducive to Timber Pest Attack was considered: ${riskLevel}.`;
}

export function generateD1ReportStatement(section: PestInspectionSections['d1ActiveTermites']): string {
  if (section.evidenceAnswer !== 'The following evidence was found') return '';
  const species =
    [...section.species.selected, ...section.species.custom].filter((s) => s !== 'Undetermined').join(', ') ||
    'Undetermined';
  const location = section.locationNarrative.trim() || 'the areas noted above';
  return `At time of inspection active termites were located in, but not necessarily limited to: ${location}. The species was ${species} and has the potential to cause extensive damage to timbers in service. Treatment of the active termites is considered essential at the first available opportunity.`;
}

export function generateD2ReportStatement(section: PestInspectionSections['d2ManagementProposal']): string {
  if (section.recommendation !== MANAGEMENT_PROPOSAL_OPTIONS[0]) return '';
  return section.recommendation;
}

export function generateD3ReportStatement(section: PestInspectionSections['d3TermiteWorkings']): string {
  if (section.summaryAnswer !== 'Evidence Found' && section.evidenceAnswer !== 'The following evidence was found') {
    return '';
  }
  const location = section.locationNarrative.trim() || 'the areas noted above';
  return `${D3_EVIDENCE_REPORT_PREFIX} ${location}`;
}

export function generateD4ReportStatement(section: PestInspectionSections['d4PreviousTreatment']): string {
  if (section.evidenceAnswer !== 'The following evidence was found') return '';
  const items = [...section.evidenceFound.selected, ...section.evidenceFound.custom];
  return `The following evidence was found: ${items.join('; ') || 'Evidence of previous program noted'}.`;
}

export function generateD10ReportStatement(section: PestInspectionSections['d10ExcessiveMoisture']): string {
  if (section.answer !== 'The following evidence was found:') return '';
  const locations = [...section.moistureLocations.selected, ...section.moistureLocations.custom];
  const stains = [...section.moistureStains.selected, ...section.moistureStains.custom];
  const parts: string[] = [];
  if (locations.length) {
    parts.push(`${D10_EVIDENCE_REPORT_PREFIX} ${locations.join(', ')}`);
  }
  if (stains.length) {
    parts.push(`${D10_STAINS_REPORT_PREFIX} ${stains.join(', ')}`);
  }
  return parts.join('\n\n');
}

export function applyPestSectionUpdates(pest: PestInspectionSections): PestInspectionSections {
  return {
    ...pest,
    undetectedTimberPestRisk: {
      ...pest.undetectedTimberPestRisk,
      riskExplanation: generateTimberPestRiskExplanation(pest.undetectedTimberPestRisk.riskLevel),
    },
    d1ActiveTermites: {
      ...pest.d1ActiveTermites,
      reportStatement: generateD1ReportStatement(pest.d1ActiveTermites),
    },
    d2ManagementProposal: {
      ...pest.d2ManagementProposal,
      reportStatement: generateD2ReportStatement(pest.d2ManagementProposal),
    },
    d3TermiteWorkings: {
      ...pest.d3TermiteWorkings,
      reportStatement: generateD3ReportStatement(pest.d3TermiteWorkings),
    },
    d4PreviousTreatment: {
      ...pest.d4PreviousTreatment,
      reportStatement: generateD4ReportStatement(pest.d4PreviousTreatment),
    },
    d10ExcessiveMoisture: {
      ...pest.d10ExcessiveMoisture,
      reportStatement: generateD10ReportStatement(pest.d10ExcessiveMoisture),
    },
  };
}
