/** Room engine types — full implementation delivered in Phase 3 (Inspection Engine). */
export type RoomEngineType = 'bedroom' | 'bathroom';

export interface RoomEngineMetadata {
  engineType: RoomEngineType;
  version: string;
}

export const ROOM_ENGINE_VERSION = '5.0.0';
