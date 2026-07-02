import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BathroomRoomData, CheckboxFieldState } from '@sitescop/room-engine-core';
import { BATHROOM_FIXTURES, BATHROOM_TYPES, MOISTURE_LEVELS, normalizeCheckboxField } from '@sitescop/room-engine-core';
import { Select } from '@/design-system/components';
import {
  CheckboxGroupField,
  InspectionSubsectionHeading,
  PhotoField,
  RatingSelect,
  SectionComments,
  YesNoSelect,
} from './InspectionFields';

interface BathroomRoomFormProps {
  data: BathroomRoomData;
  onPatch: (partial: Partial<BathroomRoomData>) => void;
  disabled?: boolean;
}

function fixtureIsSelected(fixtures: CheckboxFieldState, name: string): boolean {
  return fixtures.selected.includes(name) || fixtures.custom.includes(name);
}

function FixtureSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-sm border border-primary/20 bg-primary/5 p-4">
      <InspectionSubsectionHeading as="h4">{title}</InspectionSubsectionHeading>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function BathroomRoomForm({ data, onPatch, disabled = false }: BathroomRoomFormProps) {
  const fixturesKey = useMemo(
    () => JSON.stringify(normalizeCheckboxField(data.fixtures)),
    [data.fixtures],
  );
  const [fixtures, setFixtures] = useState(() => normalizeCheckboxField(data.fixtures));

  useEffect(() => {
    setFixtures(normalizeCheckboxField(data.fixtures));
  }, [fixturesKey, data.fixtures]);

  const set = <K extends keyof BathroomRoomData>(key: K, value: BathroomRoomData[K]) => {
    onPatch({ [key]: value } as Partial<BathroomRoomData>);
  };

  const handleFixturesChange = useCallback(
    (value: CheckboxFieldState) => {
      setFixtures(value);
      onPatch({ fixtures: value });
    },
    [onPatch],
  );

  const showBasin = fixtureIsSelected(fixtures, 'Basin') || fixtureIsSelected(fixtures, 'Vanity Cabinet');

  return (
    <div className="space-y-4 rounded-sm border border-border bg-background p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Bathroom Type"
          value={data.bathroomType}
          onChange={(e) => set('bathroomType', e.target.value)}
          options={BATHROOM_TYPES.map((v) => ({ value: v, label: v }))}
        />
      </div>

      <CheckboxGroupField
        disabled={disabled}
        label="Fixtures Present (only selected sections appear below)"
        options={BATHROOM_FIXTURES}
        value={fixtures}
        onChange={handleFixturesChange}
      />

      <div className="space-y-4">
        {showBasin && (
          <FixtureSection title="Basin & Vanity">
            <RatingSelect disabled={disabled} label="Basin Type" value={data.basinType} onChange={(v) => set('basinType', v)} options={['Single', 'Double']} />
            <RatingSelect disabled={disabled} label="Drainage" value={data.basinDrainage} onChange={(v) => set('basinDrainage', v)} options={['Not Blocked', 'Partially Blocked', 'Blocked']} />
            <YesNoSelect disabled={disabled} label="Leak Inside Cabinet" value={data.basinLeakInsideCabinet} onChange={(v) => set('basinLeakInsideCabinet', v)} />
            <RatingSelect disabled={disabled} label="Basin Condition" value={data.basinCondition} onChange={(v) => set('basinCondition', v)} options={['Good', 'Fair', 'Poor', 'Damaged']} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Toilet') && (
          <FixtureSection title="Toilet">
            <YesNoSelect disabled={disabled} label="Flush Working" value={data.toiletFlushWorking} onChange={(v) => set('toiletFlushWorking', v)} />
            <RatingSelect disabled={disabled} label="Blockage" value={data.toiletBlockage} onChange={(v) => set('toiletBlockage', v)} options={['No', 'Partially Blocked', 'Blocked']} />
            <YesNoSelect disabled={disabled} label="Leakage Detected" value={data.toiletLeakage} onChange={(v) => set('toiletLeakage', v)} />
            <YesNoSelect disabled={disabled} label="Secure & Stable" value={data.toiletSecureStable} onChange={(v) => set('toiletSecureStable', v)} />
            <RatingSelect disabled={disabled} label="Toilet Seat Condition" value={data.toiletSeatCondition} onChange={(v) => set('toiletSeatCondition', v)} options={['Good', 'Fair', 'Poor', 'Broken']} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Taps & Mixers') && (
          <FixtureSection title="Taps & Mixers">
            <YesNoSelect disabled={disabled} label="Operating Correctly" value={data.tapsOperating} onChange={(v) => set('tapsOperating', v)} />
            <YesNoSelect disabled={disabled} label="Dripping" value={data.tapsDripping} onChange={(v) => set('tapsDripping', v)} />
            <YesNoSelect disabled={disabled} label="Active Leak" value={data.tapsActiveLeak} onChange={(v) => set('tapsActiveLeak', v)} />
            <RatingSelect disabled={disabled} label="Condition" value={data.tapsCondition} onChange={(v) => set('tapsCondition', v)} options={['Good', 'Fair', 'Poor']} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Shower Base / Shower Tray') && (
          <FixtureSection title="Shower Base / Shower Tray">
            <YesNoSelect disabled={disabled} label="Operating Correctly" value={data.showerOperating} onChange={(v) => set('showerOperating', v)} />
            <RatingSelect disabled={disabled} label="Drainage" value={data.showerDrainage} onChange={(v) => set('showerDrainage', v)} options={['Not Blocked', 'Partially Blocked', 'Blocked']} />
            <YesNoSelect disabled={disabled} label="Shower Head Leaking" value={data.showerHeadLeaking} onChange={(v) => set('showerHeadLeaking', v)} />
            <YesNoSelect disabled={disabled} label="Evidence of Leakage" value={data.showerEvidenceOfLeakage} onChange={(v) => set('showerEvidenceOfLeakage', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Shower Head') && (
          <FixtureSection title="Shower Head">
            <YesNoSelect disabled={disabled} label="Shower Head Leaking" value={data.showerHeadLeaking} onChange={(v) => set('showerHeadLeaking', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Shower Screen') && (
          <FixtureSection title="Shower Screen">
            <RatingSelect disabled={disabled} label="Condition" value={data.screenCondition} onChange={(v) => set('screenCondition', v)} options={['Good', 'Fair', 'Poor']} />
            <YesNoSelect disabled={disabled} label="Water Escaping" value={data.screenWaterEscaping} onChange={(v) => set('screenWaterEscaping', v)} />
            <YesNoSelect disabled={disabled} label="Damage/Cracks" value={data.screenDamageCracks} onChange={(v) => set('screenDamageCracks', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Bath') && (
          <FixtureSection title="Bath">
            <RatingSelect disabled={disabled} label="Floor Tiles Condition" value={data.floorTilesCondition} onChange={(v) => set('floorTilesCondition', v)} options={['Good', 'Fair', 'Poor', 'Damaged']} />
            <YesNoSelect disabled={disabled} label="Floor Tiles Loose" value={data.floorTilesLoose} onChange={(v) => set('floorTilesLoose', v)} />
            <YesNoSelect disabled={disabled} label="Grout Missing" value={data.groutMissing} onChange={(v) => set('groutMissing', v)} />
            <YesNoSelect disabled={disabled} label="Grout Deteriorated" value={data.groutDeteriorated} onChange={(v) => set('groutDeteriorated', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Exhaust Fan') && (
          <FixtureSection title="Exhaust Fan">
            <YesNoSelect disabled={disabled} label="Exhaust Fan Working" value={data.exhaustFanWorking} onChange={(v) => set('exhaustFanWorking', v)} />
            <YesNoSelect disabled={disabled} label="Exhaust Fan Noise" value={data.exhaustFanNoise} onChange={(v) => set('exhaustFanNoise', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Light Fittings') && (
          <FixtureSection title="Light Fittings">
            <YesNoSelect disabled={disabled} label="Lights Working" value={data.lightsWorking} onChange={(v) => set('lightsWorking', v)} />
          </FixtureSection>
        )}

        {fixtureIsSelected(fixtures, 'Power Points') && (
          <FixtureSection title="Power Points">
            <YesNoSelect disabled={disabled} label="Switches Working" value={data.switchesWorking} onChange={(v) => set('switchesWorking', v)} />
          </FixtureSection>
        )}
      </div>

      <section className="space-y-4">
        <InspectionSubsectionHeading as="h4">General Bathroom Condition</InspectionSubsectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <RatingSelect disabled={disabled} label="Silicone Condition" value={data.siliconeCondition} onChange={(v) => set('siliconeCondition', v)} options={['Good', 'Fair', 'Poor']} />
          <YesNoSelect disabled={disabled} label="Silicone Failed/Missing" value={data.siliconeFailedMissing} onChange={(v) => set('siliconeFailedMissing', v)} />
          <YesNoSelect disabled={disabled} label="Mould Present" value={data.siliconeMouldPresent} onChange={(v) => set('siliconeMouldPresent', v)} />
          <YesNoSelect disabled={disabled} label="Water Escaping Observed" value={data.waterEscapingObserved} onChange={(v) => set('waterEscapingObserved', v)} />
        </div>
      </section>

      {data.waterEscapingObserved === 'Yes' && (
        <PhotoField disabled={disabled} label="Water Escaping Photo Evidence" photos={data.waterEscapingPhotos} onChange={(v) => set('waterEscapingPhotos', v)} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <YesNoSelect disabled={disabled} label="Water Pooling Present" value={data.waterPoolingPresent} onChange={(v) => set('waterPoolingPresent', v)} />
        <RatingSelect disabled={disabled} label="Moisture Damage" value={data.moistureDamage} onChange={(v) => set('moistureDamage', v)} options={[...MOISTURE_LEVELS]} />
      </div>

      {data.waterPoolingPresent === 'Yes' && (
        <PhotoField disabled={disabled} label="Water Pooling Photo Evidence" photos={data.waterPoolingPhotos} onChange={(v) => set('waterPoolingPhotos', v)} />
      )}

      <PhotoField disabled={disabled} label="Moisture Evidence (Meter / Thermal)" photos={data.moistureEvidencePhotos} onChange={(v) => set('moistureEvidencePhotos', v)} />

      <SectionComments
        disabled={disabled}
        comments={data.comments}
        photos={data.photos}
        onCommentsChange={(v) => set('comments', v)}
        onPhotosChange={(v) => set('photos', v)}
      />
    </div>
  );
}
