/** Shared option lists for building inspection forms (V4 functional blueprint). */

export const CLIENT_TYPES = ['Owner', 'Purchaser', 'Agent', 'Other'] as const;

export const WATER_SUPPLY_OPTIONS = ['Town Water', 'Tank Water', 'Bore Water'] as const;
export const SEWER_OPTIONS = ['Town Sewer', 'Septic', 'Aerated System'] as const;
export const ELECTRICITY_OPTIONS = ['Mains', 'Solar + Mains', 'Generator'] as const;
export const GAS_OPTIONS = ['None', 'Natural Gas', 'LPG'] as const;

export const HOT_WATER_TYPES = ['Electric', 'Gas', 'Solar', 'Heat Pump'] as const;
export const AC_TYPES = ['Split System', 'Ducted', 'Evaporative', 'Multi Split', 'Window Unit'] as const;
export const YES_NO_NA = ['Yes', 'No', 'N/A'] as const;
export const YES_NO = ['Yes', 'No'] as const;

export const PROPERTY_TYPES = ['Detached House', 'Duplex', 'Unit', 'Townhouse', 'Villa'] as const;
export const POSITION_ON_BLOCK = ['Front', 'Middle', 'Rear'] as const;
export const ORIENTATIONS = [
  'North',
  'South',
  'East',
  'West',
  'North East',
  'North West',
  'South East',
  'South West',
] as const;
export const STOREYS = ['Single', 'Double', 'Multi'] as const;

export const WALL_MATERIALS = [
  'Brick Veneer',
  'Double Brick',
  'Hebel',
  'Cladding',
  'Weatherboard',
  'Rendered Masonry',
  'Fibre Cement',
] as const;
export const FRAME_MATERIALS = ['Timber', 'Steel', 'Masonry'] as const;
export const ROOF_MATERIALS = ['Concrete Tile', 'Terracotta Tile', 'Metal Roof', 'Slate', 'Membrane'] as const;
export const FLOOR_MATERIALS = ['Concrete Slab', 'Timber Floor', 'Suspended Timber'] as const;
export const FENCING_MATERIALS = ['Timber', 'Colorbond', 'Steel Sheet', 'Masonry', 'Chain Wire'] as const;

export const ACCESSIBILITY_AREAS = [
  'Interior Obstructions',
  'Exterior Obstructions',
  'Roof Space',
  'Subfloor',
  'Site',
  'Outbuilding',
  'Roof Exterior',
] as const;

export const INTERIOR_OBSTRUCTIONS = [
  'Wall linings',
  'Ceiling linings',
  'Floor coverings',
  'Window furniture',
  'Cabinetry',
  'Appliances',
  'Storage to cupboards',
  'Excessive storage to garage',
  'Furniture and stored goods will limit access',
  'Storage to garage',
  'Excessive furniture and/or stored items to some areas',
] as const;

export const EXTERIOR_OBSTRUCTIONS = [
  'Air conditioning',
  'Hot water service',
  'Landscaping',
  'Foliage',
  'Gates and fences',
  'Pathways and additional slabs',
  'Stored items',
  'External cabinetry',
  'Render or texture coat',
  'Additional cladding',
  'Garden storage shed',
  'Decking',
  'Additional construction',
  'Excessive foliage',
  'Adjacent dwellings & common property',
  'Rainwater tank',
  'Gas storage cylinders',
  'Pool pump assembly',
  'Not applicable',
] as const;

export const ROOF_SPACE_OBSTRUCTIONS = [
  'Low pitched and boxed in areas in roof space',
  'Insulation',
  'Sarking',
  'Ducting and/or machinery',
  'Insulated sarking',
  'Stored goods',
  'Inspection of roof space was impacted due to access restrictions',
  'Not applicable',
  'Raked ceiling areas',
] as const;

export const SUBFLOOR_OBSTRUCTIONS = ['Site', 'Vegetation covering tree stumps and fences'] as const;

export const INACCESSIBLE_AREA_PRESETS = [
  'All areas permitted entry',
  'Foil insulation health and safety risk — expert advice recommended',
  'Locked room(s)',
  'Locked garage/shed',
  'No roof space access hatch',
  'Insufficient roof space clearance',
  'Unsafe roof access',
  'Unsafe subfloor access',
  'Subfloor access obstructed',
  'Stored goods restricting access',
  'Furniture restricting access',
  'Vegetation restricting access',
  'Construction materials restricting access',
  'Electrical hazards present',
  'Animal/pest activity restricting access',
  'Moisture/flooding restricting access',
  'Not applicable',
] as const;

export const RISK_LEVELS = [
  'Low',
  'Low To Moderate',
  'Moderate',
  'Moderate To High',
  'High',
  'Extreme',
] as const;

export const LAND_SLOPE = ['Generally Level', 'Gentle Slope', 'Moderate Slope', 'Steep Slope'] as const;
export const CONDITION_RATING = ['Good', 'Fair', 'Poor'] as const;
export const DRAINAGE_RATING = ['Adequate', 'Fair', 'Poor'] as const;

export const SITE_DRAINAGE_CONCERNS = [
  'Water Pooling',
  'Poor Surface Drainage',
  'Inadequate Fall Away From Building',
  'Erosion',
  'Saturated Ground',
  'Ponding Adjacent To Building',
  'Downpipe Discharge Issue',
] as const;

export const EXTERNAL_DEFECTS = [
  'External Walls',
  'Windows',
  'External Doors',
  'Paths',
  'Driveways',
  'Decks',
  'Pergolas',
  'Stairs',
  'Balustrades',
] as const;

export const DAMAGE_OBSERVED = ['Cracking', 'Deformation', 'Moisture Damage', 'Corrosion'] as const;

export const ROOF_EXTERIOR_DEFECTS = [
  'Roof Covering',
  'Ridge Capping',
  'Flashings',
  'Gutters',
  'Downpipes',
] as const;

export const ROOF_SPACE_DEFECTS = ['Roof Framing', 'Insulation', 'Ventilation', 'Moisture Evidence'] as const;

export const BATHROOM_TYPES = ['Main', 'Ensuite', 'Master bed', 'Toilet'] as const;

export const BATHROOM_FIXTURES = [
  'Toilet',
  'Vanity Cabinet',
  'Basin',
  'Bath',
  'Shower Base / Shower Tray',
  'Shower Screen',
  'Shower Head',
  'Taps & Mixers',
  'Floor Waste',
  'Mirror',
  'Towel Rail',
  'Toilet Roll Holder',
  'Soap Holder',
  'Exhaust Fan',
  'Heat Lamp',
  'Light Fittings',
  'Power Points',
  'Bidet',
  'Spa Bath',
] as const;

export const BEDROOM_TYPES = ['Bedroom', 'Master Bedroom', 'Guest Bedroom', 'Study', 'Nursery'] as const;

export const LIVING_AREA_NAMES = [
  'Front Living',
  'Rear Living',
  'Family Room',
  'Dining Room',
  'Rumpus Room',
  'Theatre Room',
  'Study',
  'Guest Room',
  'Nursery',
] as const;

export const GARAGE_DEFECTS = [
  'Door',
  'Roller shutter door',
  'Window',
  'Sliding Door',
  'Floor',
  'Walls',
  'Ceiling',
  'Lights',
  'Switches',
  'Power Points',
  'Damage Observed',
] as const;

export const SUBFLOOR_ELEMENTS = ['Ventilation', 'Drainage', 'Moisture', 'Structural Elements'] as const;

export const OUTBUILDING_TYPES = [
  'Shed',
  'Granny Flat',
  'Workshop',
  'Detached Garage',
  'Carport',
  'Pergola',
] as const;

export const CORROSION_ITEMS = [
  'Hot Water System',
  'Kitchen Cabinet',
  'Laundry Cabinet',
  'Roof Sheeting',
  'Gutters',
  'Downpipes',
  'Flashings',
  'Structural Steel',
] as const;

export const MINOR_DEFECT_PRESETS = [
  'External walls - hairline cracks evident to rendered finish',
  'External walls - weep holes covered up or missing in locations',
  'Roof - concrete roof tiles weathered and deteriorated',
  'Roof - minor sagging noticeable in roof line',
  'Drainage - surface water drainage points appear inadequate',
  'Asbestos - possible asbestos linings evident. Recommend immediate sample and testing.',
  'Wall and ceiling linings - scuffs, dents, scratches and blemishes generally throughout',
  'Wall and ceiling linings - paint finish generally poor throughout',
  'Ceiling linings - hairline cracks evident to plasterboard joints',
  'Wall linings - hairline cracks evident at door heads',
  'Wet areas - silicone/caulking deteriorated',
  'Wet areas - mould evident to shower enclosure',
  'Wet areas - grout to floor tiles deteriorated',
  'Wet areas - cracked/broken floor tiles evident',
  'Wet areas - moisture damage to walls and ceilings due to poor ventilation',
  'Kitchen - silicone/caulking deteriorated',
  'Skirting and architraves - hairline cracks evident',
  'Doors - in poor condition generally throughout',
  'Cabinetry - in poor condition generally throughout',
  'Floor coverings - in poor condition generally throughout',
  'Plumbing fittings and fitments - in poor condition generally throughout',
  'Plumbing fittings - signs of water leaks to underside of sinks evident',
  'Roof space - insulation untidy and not tight between bottom chord of trusses',
] as const;

export const STRUCTURAL_MOVEMENT = ['Walls', 'Foundation', 'Retaining Wall', 'Floor', 'Roof Structure'] as const;

export const DEFORMATION_ITEMS = [
  'Roof Deformation / Sagging',
  'Ceiling Deformation / Sagging',
  'Wall Bowing',
  'Floor Deflection',
] as const;

export const MOISTURE_SOURCES = ['Rising Damp', 'Plumbing Leak', 'Roof Leak'] as const;

export const CONCLUSION_RATINGS = [
  'Low',
  'Below Average',
  'Average',
  'Above Average',
  'High',
] as const;

export const OVERALL_BUILDING_CONDITION = [
  'Excellent',
  'Good',
  'Average',
  'Below Average',
  'Poor',
] as const;

export const OVERALL_COMPARISON = [
  'Well Above Average',
  'Above Average',
  'Average',
  'Below Average',
  'Well Below Average',
] as const;

export const RECOMMENDATION_PRESETS = [
  'Licensed Plumber Recommended',
  'Licensed Roof Plumber Recommended',
  'Structural Engineer Recommended',
  'Licensed Electrician Recommended',
  'Waterproofing Contractor Recommended',
  'Drainage Improvements Recommended',
] as const;

export const FLOOR_TYPES = ['Carpet', 'Timber', 'Tiles', 'Vinyl'] as const;
export const WALL_DEFECTS = [
  'Cracking',
  'Moisture Damage',
  'Hole/Damage',
  'Staining',
  'No Visible Defects',
] as const;

export const MOISTURE_LEVELS = ['None', 'Minor', 'Moderate', 'Major'] as const;
