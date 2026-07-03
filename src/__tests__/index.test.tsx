const loadSdk = (nativeModule: Record<string, jest.Mock>) => {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    NativeModules: {
      RNRapidoReach: nativeModule,
    },
    Platform: {
      OS: 'android',
    },
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  }));

  return require('../index').default;
};

describe('RapidoReach React Native wrapper', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.dontMock('react-native');
  });

  it('rejects initialization when required arguments are missing', async () => {
    const sdk = loadSdk({ initWithApiKeyAndUserId: jest.fn() });

    await expect(
      sdk.initWithApiKeyAndUserId('', 'user_123')
    ).rejects.toMatchObject({
      code: 'invalid_args',
      details: { method: 'initWithApiKeyAndUserId' },
    });
    await expect(
      sdk.initWithApiKeyAndUserId('api_key', '')
    ).rejects.toMatchObject({
      code: 'invalid_args',
      details: { method: 'initWithApiKeyAndUserId' },
    });
  });

  it('rejects account/content methods before initialization', async () => {
    const sdk = loadSdk({ sendUserAttributes: jest.fn() });

    await expect(sdk.sendUserAttributes({ age: 30 })).rejects.toMatchObject({
      code: 'not_initialized',
      details: { method: 'sendUserAttributes' },
    });
  });

  it('trims init inputs and forwards calls to the native module after init', async () => {
    const nativeModule = {
      initWithApiKeyAndUserId: jest.fn().mockResolvedValue(undefined),
      listSurveys: jest
        .fn()
        .mockResolvedValue([{ surveyIdentifier: 'survey_1' }]),
      showSurvey: jest.fn().mockResolvedValue(undefined),
    };
    const sdk = loadSdk(nativeModule);

    await sdk.initWithApiKeyAndUserId('  api_key  ', '  user_123  ');
    await expect(sdk.listSurveys('default')).resolves.toEqual([
      { surveyIdentifier: 'survey_1' },
    ]);
    await sdk.showSurvey('default', 'survey_1');

    expect(nativeModule.initWithApiKeyAndUserId).toHaveBeenCalledWith(
      'api_key',
      'user_123'
    );
    expect(nativeModule.listSurveys).toHaveBeenCalledWith('default');
    expect(nativeModule.showSurvey).toHaveBeenCalledWith(
      'default',
      'survey_1',
      {}
    );
  });
});
