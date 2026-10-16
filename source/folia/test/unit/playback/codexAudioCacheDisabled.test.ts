import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({enabled:false,read:vi.fn(),has:vi.fn(),save:vi.fn(),legacy:vi.fn()}));
vi.mock('../../../src/services/db',()=>({getFromCache:mocks.legacy,removeFromCache:vi.fn(),saveToCache:vi.fn()}));
vi.mock('../../../src/services/codexAudioCache',()=>({usesCodexAudioCache:()=>true,readCodexAudio:mocks.read,hasCodexAudio:mocks.has,saveCodexAudio:mocks.save}));
vi.mock('../../../src/stores/useAudioSettingsStore',()=>({useAudioSettingsStore:{getState:()=>({enableMediaCache:mocks.enabled,mediaCacheLimitGb:15})}}));
const {getCachedAudioBlob,hasCachedAudio,saveAudioBlob}=await import('../../../src/services/audioCache');
describe('embedded cache disabled',()=>{
 beforeEach(()=>{mocks.enabled=false;vi.clearAllMocks()});
 it('skips disk and legacy reads and writes while disabled',async()=>{
  expect(await getCachedAudioBlob('audio_test')).toBeNull();expect(await hasCachedAudio('audio_test')).toBe(false);
  await saveAudioBlob('audio_test',new Blob(['audio']));
  expect(mocks.read).not.toHaveBeenCalled();expect(mocks.has).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();expect(mocks.legacy).not.toHaveBeenCalled();
 });
 it('keeps the user switch functional if explicitly enabled again',async()=>{
  mocks.enabled=true;const blob=new Blob(['audio']);mocks.read.mockResolvedValue(blob);
  expect(await getCachedAudioBlob('audio_test')).toBe(blob);
  await saveAudioBlob('audio_test',blob);expect(mocks.save).toHaveBeenCalledWith('audio_test',blob,15*1024**3);
 });
});
