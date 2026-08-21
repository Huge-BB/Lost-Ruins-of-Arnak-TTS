import { applyResearchManualData } from './research-manual.ts';
import type {
  ResearchBoardId,
  ResearchManualData,
  ResearchTrackDefinition,
} from './types.ts';

export type GeneratedResearchTracks = Partial<Record<ResearchBoardId, ResearchTrackDefinition>>;

/**
 * Merge machine-generated TTS topology with the human-maintained overlay.
 * Consumers should use the returned definitions instead of raw generated JSON.
 */
export function buildResearchTracks(
  generated: GeneratedResearchTracks,
  manual: ResearchManualData,
  options: { requireVerifiedEntries?: boolean } = {},
): GeneratedResearchTracks {
  const result: GeneratedResearchTracks = {};
  for (const boardId of ['bird', 'snake'] as const) {
    const track = generated[boardId];
    if (!track) continue;
    result[boardId] = applyResearchManualData(track, manual, {
      requireVerified: options.requireVerifiedEntries ?? false,
    });
  }
  return result;
}

export function researchBridgeCoverage(track: ResearchTrackDefinition) {
  const bridges = track.bridges ?? [];
  const verified = bridges.filter(bridge => bridge.verified === true).length;
  return {
    total: bridges.length,
    verified,
    remaining: bridges.length - verified,
    complete: bridges.length > 0 && verified === bridges.length,
  };
}
