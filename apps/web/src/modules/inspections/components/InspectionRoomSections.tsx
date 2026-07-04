import type { BathroomRoomData, BedroomRoomData, GarageRoomData, LivingRoomData } from '@sitescop/room-engine-core';
import { GARAGE_DEFECTS } from '@sitescop/room-engine-core';
import { InspectionRoomType } from '@sitescop/shared-types';
import type { InspectionRoomDetail } from '@sitescop/shared-types';
import { BathroomRoomForm } from './BathroomRoomForm';
import { BedroomRoomForm } from './BedroomRoomForm';
import { LivingRoomForm } from './LivingRoomForm';
import { CheckboxGroupField, InspectionSubsectionHeading, SectionComments } from './InspectionFields';

interface InspectionRoomSectionsProps {
  rooms: InspectionRoomDetail[];
  readOnly?: boolean;
  onRoomDataChange: (roomId: string, data: Record<string, unknown>) => void;
  onRoomPatch: (roomId: string, partial: Record<string, unknown>) => void;
}

export function InspectionRoomSections({
  rooms,
  readOnly,
  onRoomDataChange,
  onRoomPatch,
}: InspectionRoomSectionsProps) {
  const disabled = Boolean(readOnly);
  const bathrooms = rooms.filter((r) => r.roomType === InspectionRoomType.BATHROOM);
  const bedrooms = rooms.filter((r) => r.roomType === InspectionRoomType.BEDROOM);
  const living = rooms.filter((r) => r.roomType === InspectionRoomType.LIVING);
  const garages = rooms.filter((r) => r.roomType === InspectionRoomType.GARAGE);

  if (bathrooms.length + bedrooms.length + living.length + garages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {bathrooms.length > 0 && (
        <section className="space-y-4">
          <h3 className="inspection-section-heading">Bathrooms</h3>
          {bathrooms.map((room) => (
            <div key={room.id}>
              <InspectionSubsectionHeading as="h4" className="mb-3">{room.label}</InspectionSubsectionHeading>
              <BathroomRoomForm
                disabled={disabled}
                data={room.data as unknown as BathroomRoomData}
                onPatch={(partial) => onRoomPatch(room.id, partial as Record<string, unknown>)}
              />
            </div>
          ))}
        </section>
      )}

      {bedrooms.length > 0 && (
        <section className="space-y-4">
          <h3 className="inspection-section-heading">Bedrooms</h3>
          {bedrooms.map((room) => (
            <div key={room.id}>
              <InspectionSubsectionHeading as="h4" className="mb-3">{room.label}</InspectionSubsectionHeading>
              <BedroomRoomForm
                disabled={disabled}
                data={room.data as unknown as BedroomRoomData}
                onChange={(roomData) => onRoomDataChange(room.id, roomData as unknown as Record<string, unknown>)}
              />
            </div>
          ))}
        </section>
      )}

      {living.length > 0 && (
        <section className="space-y-4">
          <h3 className="inspection-section-heading">Living Areas</h3>
          {living.map((room) => {
            const livingData = room.data as unknown as LivingRoomData;
            return (
              <div key={room.id}>
                <InspectionSubsectionHeading as="h4" className="mb-3">{livingData.areaName || room.label}</InspectionSubsectionHeading>
                <LivingRoomForm
                  disabled={disabled}
                  data={livingData}
                  onChange={(roomData) => onRoomDataChange(room.id, roomData as unknown as Record<string, unknown>)}
                />
              </div>
            );
          })}
        </section>
      )}

      {garages.length > 0 && (
        <section className="space-y-4">
          <h3 className="inspection-section-heading">Garage</h3>
          {garages.map((room) => {
            const garageData = room.data as unknown as GarageRoomData;
            return (
              <div key={room.id} className="space-y-4 rounded-sm border border-border bg-background p-4">
                <InspectionSubsectionHeading as="h4">{room.label}</InspectionSubsectionHeading>
                <CheckboxGroupField disabled={disabled}
                  label="Defects"
                  options={GARAGE_DEFECTS}
                  value={garageData.defects}
                  onChange={(defects) => onRoomPatch(room.id, { defects })}
                />
                <CheckboxGroupField disabled={disabled}
                  label="Damage Observed"
                  options={['Cracking', 'Moisture Damage', 'Corrosion']}
                  value={garageData.damageObserved}
                  onChange={(damageObserved) => onRoomPatch(room.id, { damageObserved })}
                />
                <SectionComments disabled={disabled}
                  comments={garageData.comments}
                  photos={garageData.photos}
                  onCommentsChange={(comments) => onRoomPatch(room.id, { comments })}
                  onPhotosChange={(photos) => onRoomPatch(room.id, { photos })}
                />
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
