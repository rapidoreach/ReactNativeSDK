//
//  RNRapidoReach.m
//  AwesomeProject
//
//  Created by Vikash Kumar on 13/01/21.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

//#import "RNRapidoReach.swift"
@interface RCT_EXTERN_MODULE(RNRapidoReach, NSObject)

RCT_EXTERN_METHOD(initWithApiKeyAndUserId:(NSString *)apiKey userId:(NSString *)userId)
RCT_EXTERN_METHOD(showRewardCenter)
RCT_EXTERN_METHOD(ShowMessage:(NSString *)message duration:(double *)duration)

@end

@interface RCT_EXTERN_MODULE(RapidoReachEventEmitter, RCTEventEmitter)
RCT_EXTERN_METHOD(onReward)
RCT_EXTERN_METHOD(onRewardCenterOpened)
RCT_EXTERN_METHOD(onRewardCenterClosed)
RCT_EXTERN_METHOD(rapidoreachSurveyAvailable)

@end



