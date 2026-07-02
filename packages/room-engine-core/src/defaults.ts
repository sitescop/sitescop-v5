import type {
  BathroomRoomData,
  BedroomRoomData,
  BuildingInspectionFormData,
  CheckboxFieldState,
  GarageRoomData,
  LivingRoomData,
  PrefillJobContext,
  RoomCounts,
  RoomEngineType,
} from './types.js';
import { ACCESSIBILITY_AREAS, LIVING_AREA_NAMES } from './options.js';

export function emptyCheckboxField(): CheckboxFieldState {
  return { selected: [], custom: [] };
}

/** Coerce persisted or legacy checkbox values into `{ selected, custom }`. */
export function normalizeCheckboxField(
  value: CheckboxFieldState | string[] | undefined | null,
): CheckboxFieldState {
  if (!value) return emptyCheckboxField();
  if (Array.isArray(value)) {
    return { selected: value, custom: [] };
  }
  if (typeof value !== 'object') return emptyCheckboxField();

  const selectedRaw = value.selected;
  const customRaw = value.custom;

  let selected: string[] = [];
  if (Array.isArray(selectedRaw)) {
    selected = selectedRaw;
  } else if (typeof selectedRaw === 'string' && selectedRaw) {
    selected = [selectedRaw];
  }

  let custom: string[] = [];
  if (Array.isArray(customRaw)) {
    custom = customRaw;
  } else if (typeof customRaw === 'string' && customRaw) {
    custom = [customRaw];
  }

  selected = [...new Set(selected)];
  custom = [...new Set(custom)].filter((item) => !selected.includes(item));

  return { selected, custom };
}

/** Merge preset accessibility area labels out of custom into selected (fixes duplicate Subfloor rows). */
export function normalizeAccessibilityAreas(
  value: CheckboxFieldState | string[] | undefined | null,
): CheckboxFieldState {
  const field = normalizeCheckboxField(value);
  const presets = new Set<string>(ACCESSIBILITY_AREAS);
  const fromCustom = field.custom.filter((item) => presets.has(item));
  return {
    selected: [...new Set([...field.selected, ...fromCustom])],
    custom: field.custom.filter((item) => !presets.has(item)),
  };
}

export function emptySectionBase() {
  return { comments: '', photos: [] };
}

export function createEmptyFormData(prefill?: PrefillJobContext): BuildingInspectionFormData {
  const base = emptySectionBase();
  return {
    jobInformation: {
      ...base,
      clientType: 'Purchaser',
      agencyName: prefill?.agentName ? '' : '',
      agentName: prefill?.agentName ?? '',
      agentMobile: prefill?.agentPhone ?? '',
      agentEmail: prefill?.agentEmail ?? '',
      clientName: prefill?.clientName ?? '',
      clientMobile: prefill?.clientPhone ?? '',
      clientEmail: prefill?.clientEmail ?? '',
      inspectionDate: prefill?.scheduledDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      inspectionTime: prefill?.scheduledTime ?? '',
      propertyAddress: prefill?.propertyAddress ?? '',
      gpsLatitude: '',
      gpsLongitude: '',
      frontPhotoAngle: 'driveway',
      frontPhotoAngles: emptyCheckboxField(),
    },
    services: {
      ...base,
      waterSupply: emptyCheckboxField(),
      waterSupplyOther: '',
      sewer: emptyCheckboxField(),
      sewerOther: '',
      electricity: emptyCheckboxField(),
      electricityOther: '',
      gas: emptyCheckboxField(),
      gasOther: '',
      hotWaterPresent: '',
      hotWaterType: emptyCheckboxField(),
      hotWaterTypeOther: '',
      hotWaterOperating: '',
      airConPresent: '',
      airConType: emptyCheckboxField(),
      airConTypeOther: '',
      airConOperating: '',
    },
    propertyDescription: {
      ...base,
      propertyType: '',
      propertyTypeOther: '',
      positionOnBlock: '',
      orientation: '',
      storeys: '',
      buildingAgeYears: '',
      bedroomCount: 0,
      bathroomCount: 0,
      livingAreaCount: 0,
      garageCount: 0,
      walls: emptyCheckboxField(),
      frame: emptyCheckboxField(),
      roof: emptyCheckboxField(),
      floor: emptyCheckboxField(),
      fencing: emptyCheckboxField(),
    },
    accessibilityObstructions: {
      ...base,
      accessibilityAreas: emptyCheckboxField(),
      interiorObstructions: emptyCheckboxField(),
      exteriorObstructions: emptyCheckboxField(),
      roofSpaceObstructions: emptyCheckboxField(),
      subfloorObstructions: emptyCheckboxField(),
      inaccessibleAreas: emptyCheckboxField(),
      inaccessibleCustomLines: ['', '', ''],
      undetectedStructuralRisk: 'Moderate',
      riskExplanation: '',
    },
    siteConditions: {
      ...base,
      landSlope: '',
      surfaceDrainage: '',
      evidenceOfWaterPooling: 'No',
      siteDrainageConcerns: emptyCheckboxField(),
    },
    external: {
      ...base,
      externalDefects: emptyCheckboxField(),
      damageObserved: emptyCheckboxField(),
    },
    roofExterior: {
      ...base,
      defects: emptyCheckboxField(),
      condition: '',
    },
    roofSpace: {
      ...base,
      defects: emptyCheckboxField(),
    },
    kitchen: {
      ...base,
      cabinetDoorsOperating: '',
      cabinetDamage: '',
      cabinetCondition: '',
      sink: '',
      drainage: '',
      leakInsideCabinet: '',
      tapsMixers: '',
      splashback: '',
      benchtopType: '',
      benchtopCondition: '',
      benchtopDamage: '',
      walls: emptyCheckboxField(),
      ceiling: emptyCheckboxField(),
      floorType: '',
      floorCondition: '',
      window: '',
      windowLock: '',
      door: '',
      handle: '',
      lights: '',
      switches: '',
      powerPoints: '',
      moistureDamage: '',
    },
    laundry: {
      ...base,
      cabinetDamage: '',
      moistureDamage: '',
      laundryTrough: '',
      drainage: '',
      leakage: '',
      tapDripping: '',
      activeLeak: '',
      splashback: '',
      waterPooling: 'No',
      waterPoolingPhotos: [],
      floorWaste: '',
      walls: emptyCheckboxField(),
      ceiling: emptyCheckboxField(),
      floorType: '',
      floorCondition: '',
      window: '',
      windowOperation: '',
      windowLock: '',
      door: '',
      doorOperation: '',
      lockLatch: '',
      lights: '',
      switches: '',
      powerPoints: '',
      exhaustFan: '',
      moistureLevel: '',
    },
    subfloor: {
      ...base,
      elements: emptyCheckboxField(),
    },
    fencing: {
      ...base,
      materials: emptyCheckboxField(),
    },
    outbuildings: {
      ...base,
      types: emptyCheckboxField(),
      condition: '',
    },
    corrosion: {
      ...base,
      items: emptyCheckboxField(),
    },
    minorDefects: {
      ...base,
      checklist: emptyCheckboxField(),
    },
    majorDefects: {
      ...base,
      structuralMovement: emptyCheckboxField(),
      structuralEngineeringRequired: 'No',
      crackingEntries: [],
      deformation: emptyCheckboxField(),
      deformationEngineeringRequired: 'No',
      moistureSources: emptyCheckboxField(),
      conditionsConducive: emptyCheckboxField(),
    },
    thermalImaging: { ...base },
    moistureTesting: {
      ...base,
      visualMoistureEvidence: 'No',
      visualLocations: emptyCheckboxField(),
      excessiveMoistureEvidence: 'No',
      excessiveLocations: emptyCheckboxField(),
      moistureMeterPhotos: [],
      thermalImages: [],
    },
    riskAssessment: {
      ...base,
      level: 'Moderate',
    },
    conclusion: {
      ...base,
      structuralDamageRating: '',
      conditionsConduciveRating: '',
      majorDefectsRating: '',
      minorDefectsRating: '',
      overallBuildingCondition: '',
      overallComparison: '',
      autoConclusion: '',
    },
    recommendations: {
      ...base,
      autoRecommendations: [],
      manualRecommendations: [],
    },
    inspectorDeclaration: {
      inspectorName: prefill?.inspectorName ?? '',
      licenceNumber: prefill?.inspectorLicence ?? '',
      signatureData: '',
      declarationDate: new Date().toISOString().slice(0, 10),
      clientSignatureData: '',
      reportComplete: false,
    },
  };
}

export function createEmptyBedroomRoom(index: number): BedroomRoomData {
  return {
    ...emptySectionBase(),
    roomType: 'Bedroom',
    accessAvailable: 'Yes',
    noAccessReason: '',
    door: '',
    handle: '',
    window: '',
    windowLock: '',
    wardrobe: '',
    slidingDoor: '',
    mirror: '',
    floorType: '',
    floorCondition: '',
    walls: emptyCheckboxField(),
    ceiling: emptyCheckboxField(),
    lights: '',
    switches: '',
    powerPoints: '',
    smokeAlarm: '',
    damageObserved: emptyCheckboxField(),
  };
}

export function createEmptyBathroomRoom(index: number): BathroomRoomData {
  return {
    ...emptySectionBase(),
    bathroomType: index === 0 ? 'Main' : 'Ensuite',
    fixtures: emptyCheckboxField(),
    basinType: '',
    basinDrainage: '',
    basinLeakInsideCabinet: '',
    basinCondition: '',
    tapsOperating: '',
    tapsDripping: '',
    tapsActiveLeak: '',
    tapsCondition: '',
    showerOperating: '',
    showerDrainage: '',
    showerHeadLeaking: '',
    showerEvidenceOfLeakage: '',
    screenCondition: '',
    screenWaterEscaping: '',
    screenDamageCracks: '',
    siliconeCondition: '',
    siliconeFailedMissing: '',
    siliconeMouldPresent: '',
    waterEscapingObserved: '',
    waterEscapingPhotos: [],
    floorTilesBrokenCracked: '',
    floorTilesLoose: '',
    floorTilesHollowSounding: '',
    floorTilesCondition: '',
    wallTilesBrokenCracked: '',
    wallTilesLoose: '',
    wallTilesCondition: '',
    groutMissing: '',
    groutDeteriorated: '',
    toiletFlushWorking: '',
    toiletBlockage: '',
    toiletLeakage: '',
    toiletSecureStable: '',
    toiletCracksDamage: '',
    toiletSeatCondition: '',
    doorMoistureDamage: '',
    doorOperating: '',
    doorCondition: '',
    doorJambMoistureDamage: '',
    doorJambCondition: '',
    windowCondition: '',
    windowOperating: '',
    lightsWorking: '',
    switchesWorking: '',
    exhaustFanWorking: '',
    exhaustFanNoise: '',
    waterPoolingPresent: '',
    waterPoolingCause: emptyCheckboxField(),
    waterPoolingPhotos: [],
    moistureDamage: '',
    moistureEvidencePhotos: [],
  };
}

export function createEmptyLivingRoom(index: number): LivingRoomData {
  return {
    ...createEmptyBedroomRoom(index),
    areaName: LIVING_AREA_NAMES[index] ?? `Living Area ${index + 1}`,
    roomType: 'Living Area',
  };
}

export function createEmptyGarageRoom(index: number): GarageRoomData {
  return {
    ...emptySectionBase(),
    defects: emptyCheckboxField(),
    damageObserved: emptyCheckboxField(),
  };
}

export interface GeneratedRoom {
  roomType: RoomEngineType;
  roomIndex: number;
  label: string;
  data: BathroomRoomData | BedroomRoomData | LivingRoomData | GarageRoomData;
}

export function buildRoomsFromCounts(counts: RoomCounts): GeneratedRoom[] {
  const rooms: GeneratedRoom[] = [];

  for (let i = 0; i < counts.bathrooms; i++) {
    rooms.push({
      roomType: 'bathroom',
      roomIndex: i,
      label: `Bathroom ${i + 1}`,
      data: createEmptyBathroomRoom(i),
    });
  }

  for (let i = 0; i < counts.bedrooms; i++) {
    rooms.push({
      roomType: 'bedroom',
      roomIndex: i,
      label: `Bedroom ${i + 1}`,
      data: createEmptyBedroomRoom(i),
    });
  }

  for (let i = 0; i < counts.livingAreas; i++) {
    rooms.push({
      roomType: 'living',
      roomIndex: i,
      label: `Living Area ${i + 1}`,
      data: createEmptyLivingRoom(i),
    });
  }

  for (let i = 0; i < counts.garages; i++) {
    rooms.push({
      roomType: 'garage',
      roomIndex: i,
      label: counts.garages === 1 ? 'Garage' : `Garage ${i + 1}`,
      data: createEmptyGarageRoom(i),
    });
  }

  return rooms;
}

export function getRoomCountsFromForm(form: BuildingInspectionFormData): RoomCounts {
  return {
    bedrooms: form.propertyDescription.bedroomCount,
    bathrooms: form.propertyDescription.bathroomCount,
    livingAreas: form.propertyDescription.livingAreaCount,
    garages: form.propertyDescription.garageCount,
  };
}
