
import Foundation
import SafariServices
import UIKit
import React
import RapidoReach
@objc(RNRapidoReach)

class RNRapidoReach: NSObject {

  private var surveyAvailability: Bool = false
  private let errorDomain = "rapidoreach"
  private var navBarColorHex: String?
  private var navBarTextColorHex: String?
  private var navBarTitle: String?
  private var configuredApiKey: String?
  private var configuredUserId: String?
  private var networkLoggingEnabled: Bool = false
  private var previousLoggerSink: ((RapidoReachLogLevel, String) -> Void)?
  private var previousLoggerLevel: RapidoReachLogLevel?

  private func rootViewControllerFromActiveScene() -> UIViewController? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }?
      .rootViewController
  }

  private func stringifyForLog(_ value: Any?) -> String? {
    guard let value else { return nil }
    if let string = value as? String { return string }
    if JSONSerialization.isValidJSONObject(value),
       let data = try? JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted]),
       let text = String(data: data, encoding: .utf8) {
      return text
    }
    return String(describing: value)
  }

  private func buildUrl(path: String, queryItems: [URLQueryItem]? = nil) -> String? {
    guard var components = URLComponents(
      url: RapidoReachConfiguration.shared.baseURL,
      resolvingAgainstBaseURL: false
    ) else {
      return nil
    }
    components.path = path
    components.queryItems = queryItems
    return components.url?.absoluteString
  }

  private func authQueryItems() -> [URLQueryItem]? {
    var items: [URLQueryItem] = []
    if let configuredApiKey {
      items.append(URLQueryItem(name: "api_key", value: configuredApiKey))
    }
    if let configuredUserId {
      items.append(URLQueryItem(name: "sdk_user_id", value: configuredUserId))
    }
    return items.isEmpty ? nil : items
  }

  private func authBodyFields() -> [String: Any] {
    var fields: [String: Any] = [:]
    if let configuredApiKey {
      fields["api_key"] = configuredApiKey
    }
    if let configuredUserId {
      fields["sdk_user_id"] = configuredUserId
    }
    return fields
  }

  private func emitNetworkLog(
    name: String,
    method: String,
    url: String?,
    requestBody: Any? = nil,
    responseBody: Any? = nil,
    error: Error? = nil
  ) {
    guard networkLoggingEnabled else { return }

    var payload: [String: Any] = [
      "name": name,
      "method": method,
      "timestampMs": Int(Date().timeIntervalSince1970 * 1000),
    ]
    if let url { payload["url"] = url }
    if let requestBody = stringifyForLog(requestBody) { payload["requestBody"] = requestBody }
    if let responseBody = stringifyForLog(responseBody) { payload["responseBody"] = responseBody }
    if let error { payload["error"] = error.localizedDescription }

    DispatchQueue.main.async {
      RapidoReachEventEmitter.shared?.rapidoreachNetworkLog(payload as NSDictionary)
    }
  }

  private func applyNavigationAppearanceIfPossible(_ controller: UIViewController?) {
    guard let navController = controller as? UINavigationController else {
      return
    }

    let appearance = UINavigationBarAppearance()
    appearance.configureWithOpaqueBackground()

    if let barColor = UIColor.rr_hex(navBarColorHex) {
      appearance.backgroundColor = barColor
    }

    if let textColor = UIColor.rr_hex(navBarTextColorHex) {
      appearance.titleTextAttributes = [
        .foregroundColor: textColor,
      ]
      navController.navigationBar.tintColor = textColor
    }

    navController.navigationBar.standardAppearance = appearance
    navController.navigationBar.scrollEdgeAppearance = appearance
    navController.navigationBar.compactAppearance = appearance
  }
  
  static func moduleName() -> String!{
    return "RNRapidoReach";
  }
  
  static func requiresMainQueueSetup () -> Bool {
    return true;
  }

  @objc
  func enableNetworkLogging(_ enabled: Bool) -> Void {
    if enabled == networkLoggingEnabled {
      return
    }

    networkLoggingEnabled = enabled

    if enabled {
      previousLoggerSink = RapidoReachLogger.shared.sink
      previousLoggerLevel = RapidoReachLogger.shared.level

      RapidoReachLogger.shared.level = .debug
      RapidoReachLogger.shared.sink = { [weak self] level, line in
        self?.previousLoggerSink?(level, line)
        self?.emitNetworkLog(
          name: "RapidoReachLogger",
          method: "LOG",
          url: nil,
          requestBody: line
        )
      }
    } else {
      RapidoReachLogger.shared.sink = previousLoggerSink
      if let previousLoggerLevel {
        RapidoReachLogger.shared.level = previousLoggerLevel
      }
      previousLoggerSink = nil
      previousLoggerLevel = nil
    }
  }

  @objc
  func getBaseUrl(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(RapidoReachConfiguration.shared.baseURL.absoluteString)
  }

  @objc
  func initWithApiKeyAndUserId(_ apiKey:NSString, userId:NSString) -> Void {
      // Override point for customization after application launch.
    configuredApiKey = apiKey as String
    configuredUserId = userId as String

    RapidoReach.shared.setRewardCallback { (reward:Int) in
      print("%d REWARD", reward);
      RapidoReachEventEmitter.shared?.onReward(reward: reward)
    }
    RapidoReach.shared.setsurveysAvailableCallback { [weak self] (available:Bool) in
      print("Rapido Reach Survey Available" );
//      RNRapidoReach.EventEmitter.sendEvent(withName: "onRewardCenterClosed", body: nil)
        self?.surveyAvailability = available
        RapidoReachEventEmitter.shared?.rapidoreachSurveyAvailable(available: available)
    }
    RapidoReach.shared.setrewardCenterOpenedCallback {
      print("Reward centre opened")
      RapidoReachEventEmitter.shared?.onRewardCenterOpened()
    }
    RapidoReach.shared.setrewardCenterClosedCallback {
      print("Reward centre closed" );
//      RNRapidoReach.EventEmitter.sendEvent(withName: "onRewardCenterClosed", body: nil)
      RapidoReachEventEmitter.shared?.onRewardCenterClosed()


    }
    RapidoReach.shared.configure(apiKey: apiKey as String, user: userId as String)
    RapidoReach.shared.fetchAppUserID()
      //    return true
  }

  @objc
  func setUserIdentifier(_ userId: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    configuredUserId = userId as String
    RapidoReach.shared.setUserIdentifier(userId as String)
    resolve(nil)
  }
    
    @objc
    func setNavBarColor(_ barColor:NSString) -> Void {
        navBarColorHex = barColor as String
    }
    @objc
    func setNavBarText(_ text:NSString) -> Void {
        navBarTitle = text as String
    }
    @objc
    func setNavBarTextColor(_ textColor:NSString) -> Void {
        navBarTextColorHex = textColor as String
    }

  func topMostController(root: UIViewController? = nil) -> UIViewController? {
    let rootController = root ?? rootViewControllerFromActiveScene()
    if let nav = rootController as? UINavigationController {
      return topMostController(root: nav.visibleViewController)
    }
    if let tab = rootController as? UITabBarController {
      return topMostController(root: tab.selectedViewController)
    }
    if let presented = rootController?.presentedViewController {
      return topMostController(root: presented)
    }
    return rootController
  }

  @objc
  func updateBackend(_ baseURL: NSString, rewardHashSalt: NSString?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: baseURL as String) else {
      reject(self.errorDomain, "Invalid baseURL", nil)
      return
    }
    RapidoReach.shared.updateBackend(baseURL: url, rewardHashSalt: rewardHashSalt as String?)
    emitNetworkLog(
      name: "updateBackend",
      method: "CONFIG",
      url: url.absoluteString
    )
    resolve(nil)
  }
  @objc
  func showRewardCenter() -> Void {
    let iframeController = topMostController()
    if(iframeController == nil) {
      return
    }
    DispatchQueue.main.async {
      RapidoReach.shared.presentSurvey(
        iframeController!,
        title: self.navBarTitle ?? "",
        customParameters: nil
      ) { [weak self] in
        self?.applyNavigationAppearanceIfPossible(iframeController?.presentedViewController)
      }
    }
  }

  @objc
  func isSurveyAvailable(_ callback: RCTResponseSenderBlock) -> Void {
    callback([surveyAvailability])
  }

  @objc
  func sendUserAttributes(_ attributes: NSDictionary, clearPrevious: Bool = false, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(path: "/api/sdk/v2/user_attributes")
    var requestPayload = authBodyFields()
    requestPayload["attributes"] = attributes
    requestPayload["clear_previous"] = clearPrevious
    RapidoReach.shared.sendUserAttributes(attributes as? [String: Any] ?? [:], clearPrevious: clearPrevious) { error in
      if let error = error {
        self.emitNetworkLog(
          name: "sendUserAttributes",
          method: "POST",
          url: url,
          requestBody: requestPayload,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      } else {
        self.emitNetworkLog(
          name: "sendUserAttributes",
          method: "POST",
          url: url,
          requestBody: requestPayload,
          responseBody: ["status": "success"]
        )
        resolve(nil)
      }
    }
  }

  @objc
  func getPlacementDetails(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/details",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.getPlacementDetails(tag: tag as String) { result in
      switch result {
      case .success(let payload):
        self.emitNetworkLog(
          name: "getPlacementDetails",
          method: "GET",
          url: url,
          responseBody: payload
        )
        resolve(payload)
      case .failure(let error):
        self.emitNetworkLog(
          name: "getPlacementDetails",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func listSurveys(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/surveys",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.listSurveys(tag: tag as String) { result in
      switch result {
      case .success(let list):
        self.emitNetworkLog(
          name: "listSurveys",
          method: "GET",
          url: url,
          responseBody: list
        )
        resolve(list)
      case .failure(let error):
        self.emitNetworkLog(
          name: "listSurveys",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func hasSurveys(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/surveys",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.hasSurveys(tag: tag as String) { result in
      switch result {
      case .success(let available):
        self.emitNetworkLog(
          name: "hasSurveys",
          method: "GET",
          url: url,
          responseBody: ["hasSurveys": available]
        )
        resolve(available)
      case .failure(let error):
        self.emitNetworkLog(
          name: "hasSurveys",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func canShowSurvey(_ tag: NSString, surveyId: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/surveys/\(surveyId)/can_show",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.canShowSurvey(surveyId: surveyId as String, tag: tag as String) { result in
      switch result {
      case .success(let canShow):
        self.emitNetworkLog(
          name: "canShowSurvey",
          method: "GET",
          url: url,
          responseBody: ["canShow": canShow]
        )
        resolve(canShow)
      case .failure(let error):
        self.emitNetworkLog(
          name: "canShowSurvey",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func canShowContent(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/can_show",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.canShowContent(tag: tag as String) { result in
      switch result {
      case .success(let canShow):
        self.emitNetworkLog(
          name: "canShowContent",
          method: "GET",
          url: url,
          responseBody: ["canShow": canShow]
        )
        resolve(canShow)
      case .failure(let error):
        self.emitNetworkLog(
          name: "canShowContent",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func showSurvey(_ tag: NSString, surveyId: NSString, customParams: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let requestUrl = buildUrl(path: "/api/sdk/v2/placements/\(tag)/surveys/\(surveyId)/show")
    var requestPayload = authBodyFields()
    if let customParams {
      requestPayload["custom_params"] = customParams
    }
    RapidoReach.shared.showSurvey(surveyId: surveyId as String, tag: tag as String, customParameters: customParams as? [String : Any]) { [weak self] result in
      switch result {
      case .success(let url):
        self?.emitNetworkLog(
          name: "showSurvey",
          method: "POST",
          url: requestUrl,
          requestBody: requestPayload,
          responseBody: ["surveyEntryUrl": url.absoluteString]
        )
        guard let presenter = self?.topMostController() else {
          resolve(nil)
          return
        }
        DispatchQueue.main.async {
          let controller = SFSafariViewController(url: url)
          presenter.present(controller, animated: true) {
            resolve(nil)
          }
        }
      case .failure(let error):
        self?.emitNetworkLog(
          name: "showSurvey",
          method: "POST",
          url: requestUrl,
          requestBody: requestPayload,
          error: error
        )
        let domain = self?.errorDomain ?? "rapidoreach"
        reject(domain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func fetchQuickQuestions(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/quick_questions",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.fetchQuickQuestions(tag: tag as String) { result in
      switch result {
      case .success(let payload):
        self.emitNetworkLog(
          name: "fetchQuickQuestions",
          method: "GET",
          url: url,
          responseBody: payload
        )
        resolve(payload)
      case .failure(let error):
        self.emitNetworkLog(
          name: "fetchQuickQuestions",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func hasQuickQuestions(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(
      path: "/api/sdk/v2/placements/\(tag)/quick_questions",
      queryItems: authQueryItems()
    )
    RapidoReach.shared.hasQuickQuestions(tag: tag as String) { result in
      switch result {
      case .success(let hasQuestions):
        self.emitNetworkLog(
          name: "hasQuickQuestions",
          method: "GET",
          url: url,
          responseBody: ["hasQuickQuestions": hasQuestions]
        )
        resolve(hasQuestions)
      case .failure(let error):
        self.emitNetworkLog(
          name: "hasQuickQuestions",
          method: "GET",
          url: url,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }

  @objc
  func answerQuickQuestion(_ tag: NSString, questionId: NSString, answer: Any, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = buildUrl(path: "/api/sdk/v2/placements/\(tag)/quick_questions/\(questionId)/answer")
    var requestPayload = authBodyFields()
    requestPayload["answer"] = answer
    RapidoReach.shared.answerQuickQuestion(id: questionId as String, placement: tag as String, answer: answer) { result in
      switch result {
      case .success(let payload):
        self.emitNetworkLog(
          name: "answerQuickQuestion",
          method: "POST",
          url: url,
          requestBody: requestPayload,
          responseBody: payload
        )
        resolve(payload)
      case .failure(let error):
        self.emitNetworkLog(
          name: "answerQuickQuestion",
          method: "POST",
          url: url,
          requestBody: requestPayload,
          error: error
        )
        reject(self.errorDomain, error.localizedDescription, error)
      }
    }
  }
  
}

extension RNRapidoReach: RapidoReachDelegate {
  func didSurveyAvailable(_ available: Bool) {
        
  }

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
        sendEvent(withName: "onRewardCenterOpened", body: nil)
      }
      @objc
      func onRewardCenterClosed() {
        print("Native test  RewardCenterClosed");
        sendEvent(withName: "onRewardCenterClosed", body: nil)
      }

      @objc
      func rapidoreachSurveyAvailable(available: Bool)  {
          print("Native test  rapidoreachSurveyAvailable");
         sendEvent(withName: "rapidoreachSurveyAvailable", body: available)
      }

      @objc
      func rapidoreachNetworkLog(_ payload: NSDictionary) {
        sendEvent(withName: "rapidoreachNetworkLog", body: payload)
      }
    
    
    override func supportedEvents() -> [String]! {
      return [
        "onReward",
        "onRewardCenterOpened",
        "onRewardCenterClosed",
        "rapidoreachSurveyAvailable",
        "rapidoreachNetworkLog",
        "onError",
      ]
    }
}

private extension UIColor {
  convenience init?(rr_hex: String) {
    var hexString = rr_hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if hexString.hasPrefix("#") {
      hexString.removeFirst()
    }
    guard hexString.count == 6 || hexString.count == 8,
          let hexValue = UInt64(hexString, radix: 16) else { return nil }
    let alpha: CGFloat
    let red: CGFloat
    let green: CGFloat
    let blue: CGFloat
    if hexString.count == 8 {
      alpha = CGFloat((hexValue & 0xFF000000) >> 24) / 255.0
      red = CGFloat((hexValue & 0x00FF0000) >> 16) / 255.0
      green = CGFloat((hexValue & 0x0000FF00) >> 8) / 255.0
      blue = CGFloat(hexValue & 0x000000FF) / 255.0
    } else {
      alpha = 1.0
      red = CGFloat((hexValue & 0xFF0000) >> 16) / 255.0
      green = CGFloat((hexValue & 0x00FF00) >> 8) / 255.0
      blue = CGFloat(hexValue & 0x0000FF) / 255.0
    }
    self.init(red: red, green: green, blue: blue, alpha: alpha)
  }

  static func rr_hex(_ value: String?) -> UIColor? {
    guard let value else { return nil }
    return UIColor(rr_hex: value)
  }
}
