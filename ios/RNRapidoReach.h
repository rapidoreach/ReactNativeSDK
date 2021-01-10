#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif

#if __has_include("RCTEventEmitter")
#import "RCTEventEmitter"
#else
#import <React/RCTEventEmitter.h>
#endif

#import <RapidoReachSDK/RapidoReach.h>

@interface RNRapidoReach : RCTEventEmitter <RCTBridgeModule, RapidoReachRewardDelegate, RapidoReachSurveyDelegate, RapidoReachSurveyAvailableDelegate>

@end
