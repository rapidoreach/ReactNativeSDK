export {};

const fixture = require('../../contracts/performance-marketing-v2/sdk-golden.json');

const loadSdk = (nativeModule: Record<string, jest.Mock>) => {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: { RNRapidoReach: nativeModule },
  }));
  return require('../v2');
};

describe('RapidoReach v2 React Native facade', () => {
  afterEach(() => jest.dontMock('react-native'));

  it('uses the canonical session and never sends client reward authority', async () => {
    const native = {
      initializeV2: jest.fn().mockResolvedValue(fixture.session),
    };
    const { RapidoReachV2, rapidoreachContractVersion } = loadSdk(native);

    const session = await RapidoReachV2.initialize(
      'plc_sdk_android',
      'sdk-user-001',
      { environment: 'sandbox', consent: 'GRANTED' }
    );

    expect(session.contractVersion).toBe(rapidoreachContractVersion);
    expect(session.capabilities.rewardedVideo).toBe(false);
    expect(native.initializeV2).toHaveBeenCalledWith({
      placementId: 'plc_sdk_android',
      externalUserId: 'sdk-user-001',
      options: { environment: 'sandbox', consent: 'GRANTED' },
    });
    const request = native.initializeV2.mock.calls[0][0];
    expect(request).not.toHaveProperty('rewardAmount');
    expect(request).not.toHaveProperty('rewardCurrency');
    expect(request).not.toHaveProperty('callbackSecret');
    expect(request).not.toHaveProperty('providerToken');
  });

  it('fails closed when the native v2 facade is not linked', async () => {
    const { RapidoReachV2 } = loadSdk({});
    await expect(
      RapidoReachV2.initialize('plc_sdk_android', 'sdk-user-001')
    ).rejects.toMatchObject({ code: 'not_linked' });
  });

  it('exposes rewarded video only when server capability, hosted URL and slot agree', async () => {
    const enabled = {
      ...fixture.session,
      capabilities: { ...fixture.session.capabilities, rewardedVideo: true },
      hostedRewardedVideoUrl:
        'https://offers.example.test/rewarded-video/session#opaque',
      adSlots: [
        ...fixture.session.adSlots,
        {
          adSlotId: 'slot_video_1',
          name: 'Video',
          type: 'REWARDED_VIDEO',
          available: true,
        },
      ],
    };
    const native = {
      initializeV2: jest.fn().mockResolvedValue(enabled),
      showRewardedVideoV2: jest.fn().mockResolvedValue(undefined),
    };
    const { RapidoReachV2 } = loadSdk(native);
    await RapidoReachV2.initialize('plc_sdk_android', 'sdk-user-001');
    expect(RapidoReachV2.isRewardedVideoAvailable('slot_video_1')).toBe(true);
    expect(RapidoReachV2.isRewardedVideoAvailable('slot_other')).toBe(false);
    await RapidoReachV2.showRewardedVideo('slot_video_1');
    expect(native.showRewardedVideoV2).toHaveBeenCalledWith('slot_video_1');
  });
});
