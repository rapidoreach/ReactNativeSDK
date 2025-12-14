package com.rapidoreach

import android.net.Uri
import androidx.annotation.Nullable
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.rapidoreach.rapidoreachsdk.RapidoReach
import com.rapidoreach.rapidoreachsdk.RapidoReachRewardListener
import com.rapidoreach.rapidoreachsdk.RapidoReachSurveyAvailableListener
import com.rapidoreach.rapidoreachsdk.RapidoReachSurveyListener
import com.rapidoreach.rapidoreachsdk.RapidoReachSdk
import com.rapidoreach.rapidoreachsdk.RrContentEvent
import com.rapidoreach.rapidoreachsdk.RrContentEventType
import com.rapidoreach.rapidoreachsdk.RrError
import com.rapidoreach.rapidoreachsdk.RrInitOptions
import com.rapidoreach.rapidoreachsdk.RrPlacementDetails
import com.rapidoreach.rapidoreachsdk.RrQuickQuestionPayload
import com.rapidoreach.rapidoreachsdk.RrReward
import com.rapidoreach.rapidoreachsdk.RrSurvey
import org.json.JSONArray
import org.json.JSONObject
import kotlin.Unit

class RNRapidoReachModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private var isInitialized = false
  private var surveyAvailable = false
  private var navBarColor: String? = null
  private var navBarTextColor: String? = null
  private var navBarText: String? = null
  private var networkLoggingEnabled = false
  private var configuredApiKey: String? = null
  private var configuredUserId: String? = null

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName() = "RNRapidoReach"

  private fun ReadableMap.toNonNullStringAnyMap(): Map<String, Any> {
    val raw = this.toHashMap()
    return raw.entries
      .filter { it.value != null }
      .associate { it.key to (it.value as Any) }
  }

  private fun ReadableMap?.toNonNullStringAnyMapOrNull(): Map<String, Any>? =
    this?.toNonNullStringAnyMap()

  private fun dynamicToAny(value: Dynamic): Any? {
    return when (value.type) {
      ReadableType.Null -> null
      ReadableType.Boolean -> value.asBoolean()
      ReadableType.Number -> {
        val number = value.asDouble()
        if (number % 1.0 == 0.0) number.toInt() else number
      }
      ReadableType.String -> value.asString()
      ReadableType.Map -> {
        val map = value.asMap() ?: return null
        map.toHashMap().filterValues { it != null }
      }
      ReadableType.Array -> {
        val array = value.asArray() ?: return null
        array.toArrayList()
      }
    }
  }

  @ReactMethod
  fun initWithApiKeyAndUserId(apiKey: String, userId: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("no_activity", "Current activity is not available")
      return
    }

    configuredApiKey = apiKey
    configuredUserId = userId

    val options = RrInitOptions(
      navBarColor,
      navBarTextColor,
      navBarText,
      null,
      false,
      false
    )

    RapidoReachSdk.initialize(
      apiKey,
      userId,
      activity,
      { rewards -> handleRewardCallback(rewards) },
      { error ->
        sendEvent("onError", error.description ?: error.code)
        emitNetworkLog(
          name = "initialize",
          method = "INIT",
          url = null,
          error = error.description ?: error.code
        )
        promise.reject("init_error", error.description ?: error.code)
        Unit
      },
      {
        isInitialized = true
        surveyAvailable = RapidoReach.getInstance().isSurveyAvailable()
        emitNetworkLog(
          name = "initialize",
          method = "INIT",
          url = null,
          responseBody = mapOf("status" to "initialized")
        )
        promise.resolve(null)
        Unit
      },
      { contentEvent ->
        handleContentEvent(contentEvent)
        Unit
      },
      options
    )

    RapidoReach.getInstance().setRapidoReachSurveyAvailableListener(object :
      RapidoReachSurveyAvailableListener {
      override fun rapidoReachSurveyAvailable(surveyAvailable: Boolean) {
        this@RNRapidoReachModule.surveyAvailable = surveyAvailable
        sendEvent("rapidoreachSurveyAvailable", surveyAvailable)
      }
    })

    // Ensure lifecycle hooks are aligned with the native SDK
    RapidoReach.getInstance().onResume(activity)
  }

  @ReactMethod
  fun setUserIdentifier(userId: String, promise: Promise) {
    configuredUserId = userId
    RapidoReachSdk.setUserIdentifier(userId) { error ->
      if (error != null) {
        promise.reject("set_user_identifier_error", error.description ?: error.code)
      } else {
        promise.resolve(null)
      }
      Unit
    }
  }

  @ReactMethod
  fun setNavBarColor(barColor: String) {
    navBarColor = barColor
    RapidoReach.getInstance().setNavigationBarColor(barColor)
  }

  @ReactMethod
  fun setNavBarText(text: String) {
    navBarText = text
    RapidoReach.getInstance().setNavigationBarText(text)
  }

  @ReactMethod
  fun setNavBarTextColor(textColor: String) {
    navBarTextColor = textColor
    RapidoReach.getInstance().setNavigationBarTextColor(textColor)
  }

  @ReactMethod
  fun updateBackend(baseURL: String, rewardHashSalt: String?, promise: Promise) {
    try {
      RapidoReach.getInstance().setApiEndpoint(baseURL)
      emitNetworkLog(
        name = "updateBackend",
        method = "CONFIG",
        url = baseURL
      )
      promise.resolve(null)
    } catch (e: Exception) {
      emitNetworkLog(
        name = "updateBackend",
        method = "CONFIG",
        url = baseURL,
        error = e.message ?: e.toString()
      )
      promise.reject("update_backend_error", e.message, e)
    }
  }

  @ReactMethod
  fun enableNetworkLogging(enabled: Boolean) {
    networkLoggingEnabled = enabled
  }

  @ReactMethod
  fun getBaseUrl(promise: Promise) {
    try {
      promise.resolve(RapidoReach.getProxyBaseUrl())
    } catch (e: Exception) {
      promise.reject("get_base_url_error", e.message, e)
    }
  }

  @ReactMethod
  fun showRewardCenter() {
    RapidoReach.getInstance().showRewardCenter()
  }

  @ReactMethod
  fun isSurveyAvailable(cb: Callback) {
    cb.invoke(RapidoReach.getInstance().isSurveyAvailable())
  }

  @ReactMethod
  fun sendUserAttributes(attributes: ReadableMap, clearPrevious: Boolean, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/user_attributes", includeAuthQuery = false)
    val safeAttributes = attributes.toNonNullStringAnyMap()
    val requestBody = mutableMapOf<String, Any>(
      "attributes" to safeAttributes,
      "clear_previous" to clearPrevious
    )
    configuredApiKey?.let { requestBody["api_key"] = it }
    configuredUserId?.let { requestBody["sdk_user_id"] = it }

    RapidoReachSdk.sendUserAttributes(safeAttributes, clearPrevious) { error ->
      if (error != null) {
        emitNetworkLog(
          name = "sendUserAttributes",
          method = "POST",
          url = url,
          requestBody = requestBody,
          error = error.description ?: error.code
        )
        promise.reject("send_user_attributes_error", error.description ?: error.code)
      } else {
        emitNetworkLog(
          name = "sendUserAttributes",
          method = "POST",
          url = url,
          requestBody = requestBody,
          responseBody = mapOf("status" to "success")
        )
        promise.resolve(null)
      }
      Unit
    }
  }

  @ReactMethod
  fun getPlacementDetails(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/details", includeAuthQuery = true)
    RapidoReachSdk.getPlacementDetails(tag) { result ->
      result.fold(
        onSuccess = { details ->
          emitNetworkLog(
            name = "getPlacementDetails",
            method = "GET",
            url = url,
            responseBody = details.toWritableMap().toHashMap()
          )
          promise.resolve(details.toWritableMap())
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "getPlacementDetails",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("placement_details_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun listSurveys(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/surveys", includeAuthQuery = true)
    RapidoReachSdk.listSurveys(tag) { result ->
      result.fold(
        onSuccess = { surveys ->
          emitNetworkLog(
            name = "listSurveys",
            method = "GET",
            url = url,
            responseBody = surveys.toWritableArray().toArrayList()
          )
          promise.resolve(surveys.toWritableArray())
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "listSurveys",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("list_surveys_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun hasSurveys(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/surveys", includeAuthQuery = true)
    RapidoReachSdk.hasSurveys(tag) { result ->
      result.fold(
        onSuccess = { available ->
          emitNetworkLog(
            name = "hasSurveys",
            method = "GET",
            url = url,
            responseBody = mapOf("hasSurveys" to available)
          )
          promise.resolve(available)
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "hasSurveys",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("has_surveys_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun canShowContent(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/can_show", includeAuthQuery = true)
    var settled = false
    val canShow = RapidoReachSdk.canShowContentForPlacement(tag) { error ->
      if (!settled) {
        settled = true
        emitNetworkLog(
          name = "canShowContent",
          method = "GET",
          url = url,
          error = error.description ?: error.code
        )
        promise.reject(error.code, error.description ?: error.code)
      }
      Unit
    }
    if (!settled) {
      settled = true
      emitNetworkLog(
        name = "canShowContent",
        method = "GET",
        url = url,
        responseBody = mapOf("canShow" to canShow)
      )
      promise.resolve(canShow)
    }
  }

  @ReactMethod
  fun canShowSurvey(tag: String, surveyId: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/surveys/$surveyId/can_show", includeAuthQuery = true)
    RapidoReachSdk.canShowSurvey(tag, surveyId) { result ->
      result.fold(
        onSuccess = { canShow ->
          emitNetworkLog(
            name = "canShowSurvey",
            method = "GET",
            url = url,
            responseBody = mapOf("canShow" to canShow)
          )
          promise.resolve(canShow)
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "canShowSurvey",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("can_show_survey_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun showSurvey(tag: String, surveyId: String, customParams: ReadableMap?, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/surveys/$surveyId/show", includeAuthQuery = false)
    val safeCustomParams = customParams.toNonNullStringAnyMapOrNull()
    val requestBody = mutableMapOf<String, Any?>(
      "custom_params" to safeCustomParams
    ).filterValues { it != null }.toMutableMap()
    configuredApiKey?.let { requestBody["api_key"] = it }
    configuredUserId?.let { requestBody["sdk_user_id"] = it }

    emitNetworkLog(
      name = "showSurvey",
      method = "POST",
      url = url,
      requestBody = requestBody
    )

    var resolved = false
    RapidoReachSdk.showSurvey(
      tag,
      surveyId,
      safeCustomParams,
      { contentEvent ->
        handleContentEvent(contentEvent)
        if (contentEvent.type == RrContentEventType.SHOWN && !resolved) {
          resolved = true
          emitNetworkLog(
            name = "showSurvey",
            method = "POST",
            url = url,
            responseBody = mapOf("status" to "shown")
          )
          promise.resolve(null)
        }
        Unit
      },
      { error ->
        sendEvent("onError", error.description ?: error.code)
        if (!resolved) {
          resolved = true
          emitNetworkLog(
            name = "showSurvey",
            method = "POST",
            url = url,
            error = error.description ?: error.code
          )
          promise.reject("show_survey_error", error.description ?: error.code)
        }
        Unit
      }
    )
  }

  @ReactMethod
  fun fetchQuickQuestions(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/quick_questions", includeAuthQuery = true)
    RapidoReachSdk.fetchQuickQuestions(tag) { result ->
      result.fold(
        onSuccess = { payload ->
          emitNetworkLog(
            name = "fetchQuickQuestions",
            method = "GET",
            url = url,
            responseBody = payload.data
          )
          promise.resolve(payload.data.toWritableMap())
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "fetchQuickQuestions",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("fetch_quick_questions_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun hasQuickQuestions(tag: String, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/quick_questions", includeAuthQuery = true)
    RapidoReachSdk.fetchQuickQuestions(tag) { result ->
      result.fold(
        onSuccess = { payload ->
          val enabled = payload.data["enabled"] as? Boolean ?: false
          val quickQuestions = payload.data["quick_questions"] as? List<*> ?: emptyList<Any>()
          val hasQuestions = enabled && quickQuestions.isNotEmpty()
          emitNetworkLog(
            name = "hasQuickQuestions",
            method = "GET",
            url = url,
            responseBody = mapOf("hasQuickQuestions" to hasQuestions)
          )
          promise.resolve(hasQuestions)
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "hasQuickQuestions",
            method = "GET",
            url = url,
            error = error.message ?: error.toString()
          )
          promise.reject("has_quick_questions_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun answerQuickQuestion(tag: String, questionId: String, answer: Dynamic, promise: Promise) {
    val url = buildUrl("/api/sdk/v2/placements/$tag/quick_questions/$questionId/answer", includeAuthQuery = false)
    val answerValue = dynamicToAny(answer)
    if (answerValue == null) {
      emitNetworkLog(
        name = "answerQuickQuestion",
        method = "POST",
        url = url,
        error = "Answer is null"
      )
      promise.reject("invalid_answer", "Answer is null")
      return
    }
    val requestBody = mutableMapOf<String, Any>(
      "answer" to answerValue
    )
    configuredApiKey?.let { requestBody["api_key"] = it }
    configuredUserId?.let { requestBody["sdk_user_id"] = it }

    RapidoReachSdk.answerQuickQuestion(tag, questionId, answerValue) { result ->
      result.fold(
        onSuccess = { payload ->
          emitNetworkLog(
            name = "answerQuickQuestion",
            method = "POST",
            url = url,
            requestBody = requestBody,
            responseBody = payload.data
          )
          promise.resolve(payload.data.toWritableMap())
        },
        onFailure = { error ->
          emitNetworkLog(
            name = "answerQuickQuestion",
            method = "POST",
            url = url,
            requestBody = requestBody,
            error = error.message ?: error.toString()
          )
          promise.reject("answer_quick_question_error", error.message, error)
        }
      )
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter on Android.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter on Android.
  }

  override fun onHostResume() {
    if (isInitialized) {
      val activity = reactContext.currentActivity
      if (activity != null) {
        RapidoReach.getInstance().onResume(activity)
      }
    }
  }

  override fun onHostPause() {
    if (isInitialized) {
      RapidoReach.getInstance().onPause()
    }
  }

  override fun onHostDestroy() {
    // no-op
  }

  private fun handleRewardCallback(rewards: List<RrReward>): Unit {
    val total = rewards.sumOf { it.rewardAmount }
    sendEvent("onReward", total)
    return Unit
  }

  private fun handleContentEvent(contentEvent: RrContentEvent): Unit {
    when (contentEvent.type) {
      RrContentEventType.SHOWN -> sendEvent("onRewardCenterOpened", null)
      RrContentEventType.DISMISSED -> sendEvent("onRewardCenterClosed", null)
    }
    return Unit
  }

  private fun sendEvent(eventName: String, @Nullable params: Any?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  private fun stringifyForLog(value: Any?): String? {
    if (value == null) return null
    return try {
      when (value) {
        is String -> value
        is Map<*, *> -> JSONObject(value).toString()
        is List<*> -> JSONArray(value).toString()
        else -> value.toString()
      }
    } catch (_: Exception) {
      value.toString()
    }
  }

  private fun buildUrl(path: String, includeAuthQuery: Boolean): String {
    val base = RapidoReach.getProxyBaseUrl().trimEnd('/')
    val normalized = if (path.startsWith("/")) path else "/$path"
    val builder = Uri.parse(base + normalized).buildUpon()
    if (includeAuthQuery) {
      configuredApiKey?.let { builder.appendQueryParameter("api_key", it) }
      configuredUserId?.let { builder.appendQueryParameter("sdk_user_id", it) }
    }
    return builder.build().toString()
  }

  private fun emitNetworkLog(
    name: String,
    method: String,
    url: String?,
    requestBody: Any? = null,
    responseBody: Any? = null,
    error: String? = null
  ) {
    if (!networkLoggingEnabled) return

    val payload = WritableNativeMap()
    payload.putString("name", name)
    payload.putString("method", method)
    payload.putDouble("timestampMs", System.currentTimeMillis().toDouble())
    if (url != null) payload.putString("url", url)

    stringifyForLog(requestBody)?.let { payload.putString("requestBody", it) }
    stringifyForLog(responseBody)?.let { payload.putString("responseBody", it) }
    if (error != null) payload.putString("error", error)

    sendEvent("rapidoreachNetworkLog", payload)
  }

  private fun RrPlacementDetails.toWritableMap(): WritableMap {
    val map = WritableNativeMap()
    name?.let { map.putString("name", it) }
    contentType?.let { map.putString("contentType", it) }
    currencyName?.let { map.putString("currencyName", it) }
    isSale?.let { map.putBoolean("isSale", it) }
    saleType?.let { map.putString("saleType", it) }
    saleEndDate?.let { map.putString("saleEndDate", it) }
    saleMultiplier?.let { map.putDouble("saleMultiplier", it) }
    saleDisplayName?.let { map.putString("saleDisplayName", it) }
    saleTag?.let { map.putString("saleTag", it) }
    isHot?.let { map.putBoolean("isHot", it) }
    return map
  }

  private fun List<RrSurvey>.toWritableArray(): WritableArray {
    val array = WritableNativeArray()
    forEach { survey ->
      val map = WritableNativeMap()
      map.putString("surveyIdentifier", survey.surveyIdentifier)
      map.putInt("lengthInMinutes", survey.lengthInMinutes)
      map.putDouble("rewardAmount", survey.rewardAmount)
      survey.currencyName?.let { map.putString("currencyName", it) }
      map.putBoolean("isHotTile", survey.isHotTile)
      map.putBoolean("isSale", survey.isSale)
      survey.saleMultiplier?.let { map.putDouble("saleMultiplier", it) }
      survey.saleEndDate?.let { map.putString("saleEndDate", it) }
      survey.preSaleRewardAmount?.let { map.putDouble("preSaleRewardAmount", it) }
      survey.provider?.let { map.putString("provider", it) }
      array.pushMap(map)
    }
    return array
  }

  private fun Map<String, Any?>.toWritableMap(): WritableMap {
    val map = WritableNativeMap()
    forEach { (key, value) ->
      when (value) {
        null -> map.putNull(key)
        is String -> map.putString(key, value)
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is Float -> map.putDouble(key, value.toDouble())
        is Map<*, *> -> map.putMap(key, (value as Map<String, Any?>).toWritableMap())
        is List<*> -> map.putArray(key, value.toWritableArrayAny())
        else -> map.putString(key, value.toString())
      }
    }
    return map
  }

  private fun List<*>.toWritableArrayAny(): WritableArray {
    val array = WritableNativeArray()
    forEach { value ->
      when (value) {
        null -> array.pushNull()
        is String -> array.pushString(value)
        is Boolean -> array.pushBoolean(value)
        is Int -> array.pushInt(value)
        is Double -> array.pushDouble(value)
        is Float -> array.pushDouble(value.toDouble())
        is Map<*, *> -> array.pushMap((value as Map<String, Any?>).toWritableMap())
        is List<*> -> array.pushArray(value.toWritableArrayAny())
        else -> array.pushString(value.toString())
      }
    }
    return array
  }
}
