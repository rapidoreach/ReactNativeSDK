
import Foundation
import UIKit
import RapidoReach
@objc(RNRapidoReach)

class RNRapidoReach: NSObject {
  
  static func moduleName() -> String!{
    return "RNRapidoReach";
  }
  
  static func requiresMainQueueSetup () -> Bool {
    return true;
  }

  @objc
  func initWithApiKeyAndUserId(_ apiKey:NSString, userId:NSString) -> Void {
      // Override point for customization after application launch.
    RapidoReach.shared.setRewardCallback { (reward:Int) in
      print("%d REWARD", reward);
      RapidoReachEventEmitter.shared?.onReward(reward: reward)
    }
    RapidoReach.shared.setrewardCenterClosedCallback {
      print("Reward centre closed" );
//      RNRapidoReach.EventEmitter.sendEvent(withName: "onRewardCenterClosed", body: nil)
      RapidoReachEventEmitter.shared?.onRewardCenterClosed()


    }
    RapidoReach.shared.setrewardCenterOpenedCallback {
      print("Reward centre opened")
      RapidoReachEventEmitter.shared?.onRewardCenterOpened()
    }
    RapidoReach.shared.configure(apiKey: apiKey as String, user: userId as String)
    RapidoReach.shared.fetchAppUserID()
      //    return true
  }

  func topMostController() -> UIViewController? {
      guard let window = UIApplication.shared.keyWindow, let rootViewController = window.rootViewController else {
          return nil
      }

      var topController = rootViewController

      while let newTopController = topController.presentedViewController {
          topController = newTopController
      }

      return topController
  }
  @objc
  func showRewardCenter() -> Void {
    let iframeController = topMostController()
    if(iframeController == nil) {
      return
    }
    RapidoReach.shared.presentSurvey(iframeController!)
  }
  
}

extension RNRapidoReach: RapidoReachDelegate {
  func didFinishSurvey() {
    
  }
  
  func didCancelSurvey() {
    
  }
  
  func didGetError(_ error: RapidoReachError) {
    
  }
  
  func didGetAppUser(_ user: RapidoReachUser) {
    
  }
  
  func didGetRewards(_ reward: RapidoReachReward) {
    
  }
  
  func didOpenRewardCenter() {
    
  }
  
  func didClosedRewardCenter() {
    
  }
  
}

@objc(RapidoReachEventEmitter)
class RapidoReachEventEmitter: RCTEventEmitter {
       
      public static var shared:RapidoReachEventEmitter?

      override init() {
          super.init()
          RapidoReachEventEmitter.shared = self
      }

      @objc
      func onReward(reward: Int) {
            // send our event with some data
            sendEvent(withName: "onReward", body: reward)
            // body can be anything: int, string, array, object
      }
  
      @objc
      func onRewardCenterOpened()  {
        print("Native test  RewardCenterOpened");
        sendEvent(withName: "onRewardCenterOpened", body: "opened")
      }
      @objc
      func onRewardCenterClosed() {
        print("Native test  RewardCenterClosed");
        sendEvent(withName: "onRewardCenterClosed", body: "reward")
      }

      @objc
      func rapidoreachSurveyAvailable()  {
          print("Native test  rapidoreachSurveyAvailable");
         sendEvent(withName: "rapidoreachSurveyAvailable", body: "reward")
      }
  
  
    
    override func supportedEvents() -> [String]! {
      return ["onReward", "onRewardCenterOpened", "onRewardCenterClosed", "rapidoreachSurveyAvailable", "rapidoreachSurveyAvailable"]
    }
}
