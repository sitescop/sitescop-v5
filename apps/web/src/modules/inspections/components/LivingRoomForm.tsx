import type { LivingRoomData } from '@sitescop/room-engine-core';
import { FLOOR_TYPES, LIVING_AREA_NAMES, WALL_DEFECTS } from '@sitescop/room-engine-core';
import { Select } from '@/design-system/components';
import { CheckboxGroupField, RatingSelect, SectionComments, YesNoSelect } from './InspectionFields';

interface LivingRoomFormProps {
  data: LivingRoomData;
  onChange: (data: LivingRoomData) => void;
  disabled?: boolean;
}

const conditionOptions = ['N/A', 'Good', 'Fair', 'Poor', 'Damaged', 'Broken'] as const;

export function LivingRoomForm({ data, onChange, disabled = false }: LivingRoomFormProps) {
  const set = <K extends keyof LivingRoomData>(key: K, value: LivingRoomData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4 rounded-sm border border-border bg-background p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Living Area"
          value={data.areaName}
          onChange={(e) => set('areaName', e.target.value)}
          options={LIVING_AREA_NAMES.map((name) => ({ value: name, label: name }))}
        />
        <YesNoSelect disabled={disabled} label="Access Available" value={data.accessAvailable} onChange={(v) => set('accessAvailable', v)} />
      </div>

      {data.accessAvailable === 'No' && (
        <Select
          label="Reason No Access"
          value={data.noAccessReason}
          onChange={(e) => set('noAccessReason', e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            { value: 'Locked', label: 'Locked' },
            { value: 'Unsafe', label: 'Unsafe' },
            { value: 'Stored Items', label: 'Stored Items' },
            { value: 'Other', label: 'Other' },
          ]}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(['door', 'handle', 'window', 'windowLock', 'wardrobe', 'slidingDoor', 'mirror'] as const).map((field) => (
          <RatingSelect disabled={disabled}
            key={field}
            label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
            value={data[field]}
            onChange={(v) => set(field, v)}
            options={conditionOptions}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RatingSelect disabled={disabled} label="Floor Type" value={data.floorType} onChange={(v) => set('floorType', v)} options={FLOOR_TYPES} />
        <RatingSelect disabled={disabled} label="Floor Condition" value={data.floorCondition} onChange={(v) => set('floorCondition', v)} options={['Good', 'Fair', 'Poor', 'Damaged', 'Stained']} />
        <RatingSelect disabled={disabled} label="Lights" value={data.lights} onChange={(v) => set('lights', v)} options={['Working', 'Not Working']} />
        <RatingSelect disabled={disabled} label="Switches" value={data.switches} onChange={(v) => set('switches', v)} options={['Working', 'Not Working']} />
        <RatingSelect disabled={disabled} label="Power Points" value={data.powerPoints} onChange={(v) => set('powerPoints', v)} options={['Working', 'Not Working', 'Damaged']} />
        <RatingSelect disabled={disabled} label="Smoke Alarm" value={data.smokeAlarm} onChange={(v) => set('smokeAlarm', v)} options={['Present', 'Not Present', 'Unable to Test']} />
      </div>

      <CheckboxGroupField disabled={disabled} label="Walls" options={WALL_DEFECTS} value={data.walls} onChange={(v) => set('walls', v)} />
      <CheckboxGroupField disabled={disabled} label="Ceiling" options={WALL_DEFECTS} value={data.ceiling} onChange={(v) => set('ceiling', v)} />
      <CheckboxGroupField disabled={disabled} label="Damage Observed" options={['Cracking', 'Moisture Damage', 'Other']} value={data.damageObserved} onChange={(v) => set('damageObserved', v)} />

      <SectionComments disabled={disabled}
        comments={data.comments}
        photos={data.photos}
        onCommentsChange={(v) => set('comments', v)}
        onPhotosChange={(v) => set('photos', v)}
      />
    </div>
  );
}
