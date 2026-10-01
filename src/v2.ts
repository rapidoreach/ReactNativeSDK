import {
  NativeEventEmitter,
  NativeModules,
  type EmitterSubscription,
} from 'react-native';

export const rapidoreachContractVersion = '2.0.0';
export const rapidoreachSdkVersion = '2.0.0';

export type RapidoReachV2Capabilities = {
  offerwall: boolean;
  offerApi: boolean;
  rewardStatus: boolean;
  surveywall: boolean;
  rewardedVideo: boolean;
};

export type RapidoReachV2Reward = {
  minorUnits: number;
  currency: string;
  decimals: number;
};

export type RapidoReachV2Session = {
  sessionId: string;
  expiresAt: string;
  contractVersion: string;
  minimumSdkVersion: string;
  recommendedSdkVersion: string;
  capabilities: RapidoReachV2Capabilities;
  hostedOfferwallUrl?: string | null;
  hostedRewardedVideoUrl?: string | null;
  adSlots: Array<Record<string, unknown>>;
};

export type RapidoReachV2Offer = {
  offerId: string;
  campaignId: string;
  revisionId: string;
  title: string;
  description: string;
  tasks: Array<Record<string, unknown>>;
  totalReward: RapidoReachV2Reward;
  progress: Record<string, unknown>;
  expiresAt: string;
};

export type RapidoReachV2Options = {
  environment?: 'sandbox' | 'development' | 'production';
  language?: string;
  consent?: 'GRANTED' | 'DENIED' | 'UNKNOWN' | 'NOT_REQUIRED';
  attStatus?:
    | 'AUTHORIZED'
    | 'DENIED'
    | 'RESTRICTED'
    | 'NOT_DETERMINED'
    | 'NOT_APPLICABLE';
  adSlotId?: string;
  customParameters?: Record<string, string>;
  debug?: boolean;
};

export type RapidoReachV2Event = {
  type:
    | 'ready'
    | 'availabilityChanged'
    | 'opened'
    | 'closed'
    | 'impressionRecorded'
    | 'offerClicked'
    | 'offerStarted'
    | 'progressChanged'
    | 'rewardPending'
    | 'rewardConfirmed'
    | 'rewardReversed'
    | 'noFill'
    | 'rewardedVideoOpened'
    | 'error';
  offerId?: string;
  transactionId?: string;
  status?: string;
  reward?: RapidoReachV2Reward;
  error?: { code: string; message: string; retryable: boolean };
};

type RapidoReachV2Native = {
  initializeV2(input: {
    placementId: string;
    externalUserId: string;
    options: RapidoReachV2Options;
  }): Promise<RapidoReachV2Session>;
  refreshSessionV2(): Promise<RapidoReachV2Session>;
  revokeSessionV2(): Promise<void>;
  getOffersV2(
    adSlotId: string,
    cursor?: string | null
  ): Promise<{
    items: RapidoReachV2Offer[];
  }>;
  getRewardStatusV2(offerId: string): Promise<Record<string, unknown>>;
  showOfferwallV2(): Promise<void>;
  showRewardedVideoV2(adSlotId: string): Promise<void>;
  destroyV2(): void;
};

const native = (NativeModules.RNRapidoReach ?? NativeModules.Rapidoreach) as
  | RapidoReachV2Native
  | undefined;

const requireNative = <K extends keyof RapidoReachV2Native>(name: K) => {
  const method = native?.[name];
  if (typeof method !== 'function') {
    const error = new Error(
      `RapidoReach native v2 method '${String(name)}' is unavailable. Rebuild with matching native SDKs.`
    ) as Error & { code: string };
    error.code = 'not_linked';
    throw error;
  }
  return method.bind(native) as RapidoReachV2Native[K];
};

class RapidoReachV2Facade {
  private currentSession: RapidoReachV2Session | null = null;

  get session() {
    return this.currentSession;
  }

  get capabilities() {
    return this.currentSession?.capabilities ?? null;
  }

  addEventListener(
    listener: (event: RapidoReachV2Event) => void
  ): EmitterSubscription {
    if (!native) requireNative('initializeV2');
    const eventModule = NativeModules.RapidoReachEventEmitter ?? native;
    const emitter = new NativeEventEmitter(eventModule as never);
    return emitter.addListener('rapidoreachV2Event', listener);
  }

  async initialize(
    placementId: string,
    externalUserId: string,
    options: RapidoReachV2Options = {}
  ) {
    if (!placementId.trim() || !externalUserId.trim()) {
      const error = new Error(
        'placementId and externalUserId are required.'
      ) as Error & { code: string };
      error.code = 'invalid_args';
      throw error;
    }
    const response = await requireNative('initializeV2')({
      placementId: placementId.trim(),
      externalUserId: externalUserId.trim(),
      options,
    });
    if (response.contractVersion !== rapidoreachContractVersion) {
      throw new Error(
        `Unsupported RapidReach contract ${response.contractVersion}.`
      );
    }
    this.currentSession = response;
    return response;
  }

  async refreshSession() {
    this.requireSession();
    const response = await requireNative('refreshSessionV2')();
    this.currentSession = response;
    return response;
  }

  async revokeSession() {
    this.requireSession();
    await requireNative('revokeSessionV2')();
    this.currentSession = null;
  }

  async getOffers(adSlotId: string, cursor?: string) {
    const session = this.requireSession();
    if (!session.capabilities.offerApi) {
      throw new Error('Offer API is disabled by server capability.');
    }
    return (await requireNative('getOffersV2')(adSlotId, cursor ?? null)).items;
  }

  async getRewardStatus(offerId: string) {
    const session = this.requireSession();
    if (!session.capabilities.rewardStatus) {
      throw new Error('Reward status is disabled by server capability.');
    }
    return await requireNative('getRewardStatusV2')(offerId);
  }

  async showOfferwall() {
    const session = this.requireSession();
    if (!session.capabilities.offerwall) {
      throw new Error('Offerwall is disabled by server capability.');
    }
    await requireNative('showOfferwallV2')();
  }

  isRewardedVideoAvailable(adSlotId: string) {
    const session = this.currentSession;
    if (!session?.capabilities.rewardedVideo || !session.hostedRewardedVideoUrl)
      return false;
    return session.adSlots.some(
      (slot) =>
        slot.adSlotId === adSlotId &&
        slot.type === 'REWARDED_VIDEO' &&
        slot.available === true
    );
  }

  async showRewardedVideo(adSlotId: string) {
    this.requireSession();
    if (!this.isRewardedVideoAvailable(adSlotId)) {
      throw new Error(
        'Rewarded video is disabled or unavailable for this ad slot.'
      );
    }
    await requireNative('showRewardedVideoV2')(adSlotId);
  }

  destroy() {
    this.currentSession = null;
    if (typeof native?.destroyV2 === 'function') native.destroyV2();
  }

  private requireSession() {
    if (!this.currentSession)
      throw new Error('Initialize RapidReach v2 first.');
    return this.currentSession;
  }
}

export const RapidoReachV2 = new RapidoReachV2Facade();
