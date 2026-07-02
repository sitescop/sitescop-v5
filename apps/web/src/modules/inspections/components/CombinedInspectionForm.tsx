import type { InspectionFormDataV2, InspectionFormRealm } from '@sitescop/room-engine-core';
import { BuildingInspectionForm } from './BuildingInspectionForm';
import { PestInspectionForm } from './PestInspectionForm';
import { InspectionRoomSections } from './InspectionRoomSections';

interface CombinedInspectionFormProps {
  formData: InspectionFormDataV2;
  onSectionChange: (realm: InspectionFormRealm, section: string, partial: Record<string, unknown>) => void;
  readOnly?: boolean;
  rooms: import('@sitescop/shared-types').InspectionRoomDetail[];
  onRoomPatch: (roomId: string, partial: Record<string, unknown>) => void;
  onRoomDataChange: (roomId: string, data: Record<string, unknown>) => void;
}

export function CombinedInspectionForm({
  formData,
  onSectionChange,
  readOnly,
  rooms,
  onRoomPatch,
  onRoomDataChange,
}: CombinedInspectionFormProps) {
  if (!formData.pest) return null;

  return (
    <div className="space-y-10">
      <BuildingInspectionForm formData={formData} onSectionChange={onSectionChange} readOnly={readOnly} mode="shared-only" />
      <div className="border-t border-border pt-8">
        <h2 className="mb-4 text-xl font-semibold text-text">Building Inspection</h2>
        <BuildingInspectionForm
          formData={formData}
          onSectionChange={onSectionChange}
          readOnly={readOnly}
          mode="building-only"
          roomSections={
            <InspectionRoomSections
              rooms={rooms}
              readOnly={readOnly}
              onRoomDataChange={onRoomDataChange}
              onRoomPatch={onRoomPatch}
            />
          }
        />
      </div>
      <div className="border-t border-border pt-8">
        <h2 className="mb-4 text-xl font-semibold text-text">Timber Pest Inspection</h2>
        <PestInspectionForm pest={formData.pest} onSectionChange={onSectionChange} readOnly={readOnly} />
      </div>
    </div>
  );
}
