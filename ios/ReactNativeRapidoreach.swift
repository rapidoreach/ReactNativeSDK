
import Foundation
import SafariServices
import UIKit
import React
import RapidoReach
@objc(RNRapidoReach)

class RNRapidoReach: NSObject {

  private var surveyAvailability: Bool = false
  private let errorDomain = "rapidoreach"
  private var isInitialized: Bool = false
  private var initInProgress: Bool = false
  private var navBarColorHex: String?
  private var navBarTextColorHex: String?
  private var navBarTitle: String?
  private var configuredApiKey: String?
  private var configuredUserId: String?
  private var pendingBackendURL: URL?
  private var pendingRewardHashSalt: String?
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

  private func emitOnError(code: String, message: String) {
    DispatchQueue.main.async {
      RapidoReachEventEmitter.shared?.onError(code: code, message: message)
    }
  }

  private func rejectNotInitialized(
    _ reject: @escaping RCTPromiseRejectBlock,
    method: String
  ) {
    reject(
      "not_initialized",
      "RapidoReach not initialized. Call RapidoReach.initWithApiKeyAndUserId(apiKey, userId) and await it before calling `\(method)`.",
      nil
    )
  }

  private func requireInitialized(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock,
    method: String
  ) -> Bool {
    if isInitialized { return true }
    rejectNotInitialized(reject, method: method)
    return false
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
  func initWithApiKeyAndUserId(
    _ apiKey: NSString,
    userId: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) -> Void {
    let safeApiKey = (apiKey as String).trimmingCharacters(in: .whitespacesAndNewlines)
    let safeUserId = (userId as String).trimmingCharacters(in: .whitespacesAndNewlines)
    if safeApiKey.isEmpty {
      reject("invalid_args", "apiKey is required", nil)
      return
    }
    if safeUserId.isEmpty {
      reject("invalid_args", "userId is required", nil)
      return
    }

    if initInProgress {
      reject("init_in_progress", "RapidoReach initialization is already in progress.", nil)
      return
    }

    if isInitialized {
      if let configuredApiKey, configuredApiKey != safeApiKey {
        reject(
          "already_initialized",
          "RapidoReach is already initialized with a different apiKey. Restart the app to reinitialize.",
          nil
        )
        return
      }
      configuredApiKey = safeApiKey
      if configuredUserId != safeUserId {
        configuredUserId = safeUserId
        RapidoReach.shared.setUserIdentifier(safeUserId)
      }
      resolve(nil)
      return
    }

    initInProgress = true
    configuredApiKey = safeApiKey
    configuredUserId = safeUserId

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

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      RapidoReach.shared.configure(apiKey: safeApiKey, user: safeUserId)

      if let navBarTitle = self.navBarTitle {
        RapidoReach.shared.setNavigationBarText(for: navBarTitle)
      }
      if let navBarColorHex = self.navBarColorHex {
        RapidoReach.shared.setNavigationBarColor(for: navBarColorHex)
      }
      if let navBarTextColorHex = self.navBarTextColorHex {
        RapidoReach.shared.setNavigationBarTextColor(for: navBarTextColorHex)
      }

      if let pendingBackendURL = self.pendingBackendURL {
        RapidoReach.shared.updateBackend(baseURL: pendingBackendURL, rewardHashSalt: self.pendingRewardHashSalt)
      }

      RapidoReach.shared.fetchAppUserID()
      self.isInitialized = true
      self.initInProgress = false
      self.emitNetworkLog(name: "initialize", method: "INIT", url: nil, responseBody: ["status": "initialized"])
      resolve(nil)
    }
  }

  @objc
  func setUserIdentifier(_ userId: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "setUserIdentifier") else { return }
    let safeUserId = (userId as String).trimmingCharacters(in: .whitespacesAndNewlines)
    if safeUserId.isEmpty {
      reject("invalid_args", "userId is required", nil)
      return
    }
    configuredUserId = safeUserId
    RapidoReach.shared.setUserIdentifier(safeUserId)
    resolve(nil)
  }
    
    @objc
    func setNavBarColor(_ barColor:NSString) -> Void {
        navBarColorHex = barColor as String
        if isInitialized {
          RapidoReach.shared.setNavigationBarColor(for: navBarColorHex ?? "")
        }
    }
    @objc
    func setNavBarText(_ text:NSString) -> Void {
        navBarTitle = text as String
        if isInitialized {
          RapidoReach.shared.setNavigationBarText(for: navBarTitle ?? "")
        }
    }
    @objc
    func setNavBarTextColor(_ textColor:NSString) -> Void {
        navBarTextColorHex = textColor as String
        if isInitialized {
          RapidoReach.shared.setNavigationBarTextColor(for: navBarTextColorHex ?? "")
        }
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
    let safeBaseUrl = (baseURL as String).trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = URL(string: safeBaseUrl) else {
      reject("invalid_args", "Invalid baseURL", nil)
      return
    }
    pendingBackendURL = url
    pendingRewardHashSalt = rewardHashSalt as String?
    if isInitialized {
      RapidoReach.shared.updateBackend(baseURL: url, rewardHashSalt: rewardHashSalt as String?)
    }
    emitNetworkLog(
      name: "updateBackend",
      method: "CONFIG",
      url: url.absoluteString
    )
    resolve(nil)
  }
  @objc
  func showRewardCenter() -> Void {
    guard isInitialized else {
      emitOnError(code: "not_initialized", message: "Call initWithApiKeyAndUserId(apiKey, userId) before showRewardCenter().")
      return
    }
    let iframeController = topMostController()
    if(iframeController == nil) {
      emitOnError(code: "no_presenter", message: "Unable to present survey UI because no active UIViewController was found.")
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
    if !isInitialized {
      emitOnError(code: "not_initialized", message: "Call initWithApiKeyAndUserId(apiKey, userId) before isSurveyAvailable().")
      callback([false])
      return
    }
    callback([surveyAvailability])
  }

  @objc
  func sendUserAttributes(_ attributes: NSDictionary, clearPrevious: Bool = false, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "sendUserAttributes") else { return }
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
        reject("send_user_attributes_error", error.localizedDescription, error)
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
    guard requireInitialized(resolve, rejecter: reject, method: "getPlacementDetails") else { return }
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
        reject("placement_details_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func listSurveys(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "listSurveys") else { return }
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
        reject("list_surveys_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func hasSurveys(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "hasSurveys") else { return }
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
        reject("has_surveys_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func canShowSurvey(_ tag: NSString, surveyId: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "canShowSurvey") else { return }
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
        reject("can_show_survey_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func canShowContent(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "canShowContent") else { return }
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
        reject("can_show_content_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func showSurvey(_ tag: NSString, surveyId: NSString, customParams: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "showSurvey") else { return }
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
          reject("no_presenter", "Unable to present survey UI because no active UIViewController was found.", nil)
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
        reject("show_survey_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func fetchQuickQuestions(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "fetchQuickQuestions") else { return }
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
        reject("fetch_quick_questions_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func hasQuickQuestions(_ tag: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "hasQuickQuestions") else { return }
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
        reject("has_quick_questions_error", error.localizedDescription, error)
      }
    }
  }

  @objc
  func answerQuickQuestion(_ tag: NSString, questionId: NSString, answer: Any, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard requireInitialized(resolve, rejecter: reject, method: "answerQuickQuestion") else { return }
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
        reject("answer_quick_question_error", error.localizedDescription, error)
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

      @objc
      func onError(code: String, message: String) {
        sendEvent(withName: "onError", body: ["code": code, "message": message])
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
