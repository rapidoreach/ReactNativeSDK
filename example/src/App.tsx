import * as React from 'react';

import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import RapidoReach, {
  RapidoReachEventEmitter,
} from '@rapidoreachsdk/react-native-rapidoreach';

type Tab = 'Dashboard' | 'Rewards' | 'Logs';

type LogLevel = 'info' | 'event' | 'error';

type LogEntry = {
  id: string;
  timestampMs: number;
  level: LogLevel;
  title: string;
  request?: string;
  response?: string;
};

type RewardEntry = {
  id: string;
  timestampMs: number;
  amount: number;
  placement: string;
  note: string;
  source: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleString();
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

function tryParseJsonObject(text: string): Record<string, any> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return {};
}

export default function App() {
  const [tab, setTab] = React.useState<Tab>('Dashboard');

  const [apiKey, setApiKey] = React.useState('');
  const [userId, setUserId] = React.useState(
    Platform.OS === 'ios' ? 'DEMO_USER_ID' : 'ANDROID_TEST_ID'
  );
  const [placementTag, setPlacementTag] = React.useState('default');
  const [baseUrl, setBaseUrl] = React.useState<string | null>(null);

  const [sdkInitialized, setSdkInitialized] = React.useState(false);
  const [surveyAvailable, setSurveyAvailable] = React.useState<boolean | null>(
    null
  );
  const [lastSurveyId, setLastSurveyId] = React.useState<string | null>(null);

  const [usingAltTheme, setUsingAltTheme] = React.useState(false);
  const [attributesJson, setAttributesJson] = React.useState(
    JSON.stringify({ qa_timestamp: Date.now(), qa_flag: 'default' }, null, 2)
  );
  const [customParamsJson, setCustomParamsJson] = React.useState(
    JSON.stringify({ qa: true }, null, 2)
  );

  const [questionId, setQuestionId] = React.useState('');
  const [questionAnswer, setQuestionAnswer] = React.useState('yes');

  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [rewards, setRewards] = React.useState<RewardEntry[]>([]);

  const addLog = React.useCallback(
    (entry: Omit<LogEntry, 'id' | 'timestampMs'>) => {
      setLogs((prev) => [
        { ...entry, id: makeId(), timestampMs: Date.now() },
        ...prev,
      ]);
    },
    []
  );

  const addReward = React.useCallback(
    (entry: Omit<RewardEntry, 'id' | 'timestampMs'>) => {
      setRewards((prev) => [
        { ...entry, id: makeId(), timestampMs: Date.now() },
        ...prev,
      ]);
    },
    []
  );

  const rewardTotal = React.useMemo(
    () => rewards.reduce((sum, r) => sum + r.amount, 0),
    [rewards]
  );

  React.useEffect(() => {
    RapidoReach.enableNetworkLogging(true);
    RapidoReach.getBaseUrl()
      .then((value) => setBaseUrl(value))
      .catch(() => setBaseUrl(null));
  }, []);

  React.useEffect(() => {
    const subs = [
      RapidoReachEventEmitter.addListener('onReward', (amount: unknown) => {
        const parsed = typeof amount === 'number' ? amount : Number(amount);
        const safeAmount = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
        addReward({
          amount: safeAmount,
          placement: placementTag,
          note: 'SDK reward callback',
          source: 'RapidoReach SDK',
        });
        addLog({
          level: 'event',
          title: `onReward: +${safeAmount}`,
        });
      }),
      RapidoReachEventEmitter.addListener('onRewardCenterOpened', () => {
        addLog({ level: 'event', title: 'onRewardCenterOpened' });
      }),
      RapidoReachEventEmitter.addListener('onRewardCenterClosed', () => {
        addLog({ level: 'event', title: 'onRewardCenterClosed' });
      }),
      RapidoReachEventEmitter.addListener(
        'rapidoreachSurveyAvailable',
        (available: unknown) => {
          const normalized = toBoolean(available);
          setSurveyAvailable(normalized);
          addLog({
            level: 'event',
            title: `rapidoreachSurveyAvailable: ${normalized}`,
          });
        }
      ),
      RapidoReachEventEmitter.addListener(
        'rapidoreachNetworkLog',
        (payload: any) => {
          const name = typeof payload?.name === 'string' ? payload.name : 'SDK';
          const method =
            typeof payload?.method === 'string' ? payload.method : undefined;
          const url = typeof payload?.url === 'string' ? payload.url : undefined;
          const requestBody =
            typeof payload?.requestBody === 'string'
              ? payload.requestBody
              : undefined;
          const responseBody =
            typeof payload?.responseBody === 'string'
              ? payload.responseBody
              : undefined;
          const error =
            typeof payload?.error === 'string' ? payload.error : undefined;

          const requestParts = [
            method && url ? `${method} ${url}` : undefined,
            requestBody ? `Body: ${requestBody}` : undefined,
          ].filter(Boolean) as string[];

          addLog({
            level: error ? 'error' : method === 'LOG' ? 'info' : 'info',
            title: method === 'LOG' ? name : `NET ${name}`,
            request: requestParts.length ? requestParts.join('\n') : undefined,
            response: error ?? responseBody,
          });
        }
      ),
    ];

    return () => subs.forEach((s) => s.remove());
  }, [addLog, addReward, placementTag]);

  const applyTheme = React.useCallback(
    (alt: boolean) => {
      if (alt) {
        RapidoReach.setNavBarColor('#FF7043');
        RapidoReach.setNavBarTextColor('#000000');
        RapidoReach.setNavBarText('QA Theme');
      } else {
        RapidoReach.setNavBarColor('#211548');
        RapidoReach.setNavBarTextColor('#FFFFFF');
        RapidoReach.setNavBarText('RapidoReach');
      }
    },
    []
  );

  const initialize = React.useCallback(async () => {
    const key = apiKey.trim();
    const uid = userId.trim();
    if (!key || !uid) {
      Alert.alert('Missing config', 'Enter an API key and user id first.');
      return;
    }

    addLog({
      level: 'info',
      title: 'Initialize SDK',
      request: `initWithApiKeyAndUserId(apiKey: ${key.slice(0, 6)}…, userId: ${uid})`,
    });

    try {
      const maybePromise = RapidoReach.initWithApiKeyAndUserId(key, uid) as any;
      if (maybePromise && typeof maybePromise.then === 'function') {
        await maybePromise;
      }
      applyTheme(usingAltTheme);
      setSdkInitialized(true);
      addLog({ level: 'info', title: 'SDK initialized' });

      RapidoReach.isSurveyAvailable((available) => {
        setSurveyAvailable(toBoolean(available));
      });
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Initialization failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Init failed', e?.message ?? String(e));
    }
  }, [addLog, apiKey, applyTheme, userId, usingAltTheme]);

  const updateUserIdentifier = React.useCallback(async () => {
    const uid = userId.trim();
    if (!uid) {
      Alert.alert('Missing user id', 'Enter a user id first.');
      return;
    }
    addLog({ level: 'info', title: 'setUserIdentifier', request: uid });
    try {
      await RapidoReach.setUserIdentifier(uid);
      addLog({ level: 'info', title: 'User identifier updated' });
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'setUserIdentifier failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('setUserIdentifier failed', e?.message ?? String(e));
    }
  }, [addLog, userId]);

  const openOfferwall = React.useCallback(() => {
    addLog({ level: 'info', title: 'showRewardCenter' });
    RapidoReach.showRewardCenter();
  }, [addLog]);

  const checkPlacement = React.useCallback(async () => {
    const tag = placementTag.trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    addLog({
      level: 'info',
      title: 'Check Placement',
      request: `canShowContent(tag: ${tag})`,
    });
    try {
      const canShow = await RapidoReach.canShowContent(tag);
      addLog({
        level: 'info',
        title: canShow ? 'Placement ready' : 'Placement not ready',
      });
      Alert.alert('Placement', canShow ? 'Ready' : 'Not ready');
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Check Placement failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Check Placement failed', e?.message ?? String(e));
    }
  }, [addLog, placementTag]);

  const getPlacementDetails = React.useCallback(async () => {
    const tag = placementTag.trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    addLog({
      level: 'info',
      title: 'Get Placement Details',
      request: `getPlacementDetails(tag: ${tag})`,
    });
    try {
      const details = await RapidoReach.getPlacementDetails(tag);
      addLog({
        level: 'info',
        title: 'Placement details received',
        response: JSON.stringify(details, null, 2),
      });
      Alert.alert('Placement details', JSON.stringify(details, null, 2));
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Get Placement Details failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Get Placement Details failed', e?.message ?? String(e));
    }
  }, [addLog, placementTag]);

  const listSurveys = React.useCallback(async () => {
    const tag = placementTag.trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    addLog({ level: 'info', title: 'List Surveys', request: `listSurveys(tag: ${tag})` });
    try {
      const surveys = await RapidoReach.listSurveys(tag);
      const first = surveys?.[0] ?? null;
      const firstId =
        first?.surveyIdentifier ?? first?.survey_id ?? first?.surveyId ?? null;
      setLastSurveyId(typeof firstId === 'string' ? firstId : null);

      addLog({
        level: 'info',
        title: `Surveys: ${Array.isArray(surveys) ? surveys.length : 0}`,
        response: first ? `First survey id: ${firstId ?? 'n/a'}` : 'No surveys',
      });
    } catch (e: any) {
      setLastSurveyId(null);
      addLog({
        level: 'error',
        title: 'List Surveys failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('List Surveys failed', e?.message ?? String(e));
    }
  }, [addLog, placementTag]);

  const showLastSurvey = React.useCallback(async () => {
    const tag = placementTag.trim();
    const surveyId = (lastSurveyId ?? '').trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    if (!surveyId) {
      Alert.alert('Missing survey id', 'List surveys first to get a survey id.');
      return;
    }
    addLog({
      level: 'info',
      title: 'Show Survey',
      request: `showSurvey(tag: ${tag}, surveyId: ${surveyId})`,
    });
    try {
      const params = tryParseJsonObject(customParamsJson);
      await RapidoReach.showSurvey(tag, surveyId, params);
      addLog({ level: 'info', title: 'Show Survey triggered' });
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Show Survey failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Show Survey failed', e?.message ?? String(e));
    }
  }, [addLog, customParamsJson, lastSurveyId, placementTag]);

  const sendAttributes = React.useCallback(async () => {
    addLog({
      level: 'info',
      title: 'Send Attributes',
      request: 'sendUserAttributes(clearPrevious: false)',
    });
    try {
      const attrs = tryParseJsonObject(attributesJson);
      await RapidoReach.sendUserAttributes(attrs, false);
      addLog({
        level: 'info',
        title: 'Attributes synced',
        response: JSON.stringify(attrs, null, 2),
      });
      Alert.alert('Attributes', 'Synced successfully');
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Send Attributes failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Send Attributes failed', e?.message ?? String(e));
    }
  }, [addLog, attributesJson]);

  const toggleTheme = React.useCallback(() => {
    const next = !usingAltTheme;
    setUsingAltTheme(next);
    applyTheme(next);
    setAttributesJson((prev) => {
      try {
        const obj = tryParseJsonObject(prev);
        return JSON.stringify(
          { ...obj, qa_flag: next ? 'alt' : 'default', qa_timestamp: Date.now() },
          null,
          2
        );
      } catch {
        return prev;
      }
    });
    addLog({ level: 'info', title: next ? 'Theme: Alt' : 'Theme: Default' });
  }, [addLog, applyTheme, usingAltTheme]);

  const fetchQuickQuestions = React.useCallback(async () => {
    const tag = placementTag.trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    addLog({
      level: 'info',
      title: 'Fetch Quick Questions',
      request: `fetchQuickQuestions(tag: ${tag})`,
    });
    try {
      const payload = await RapidoReach.fetchQuickQuestions(tag);
      const enabled = toBoolean((payload as any)?.enabled);
      const list = Array.isArray((payload as any)?.quick_questions)
        ? (payload as any).quick_questions
        : [];
      addLog({
        level: 'info',
        title: enabled ? `QQ entries: ${list.length}` : 'Quick questions disabled',
        response: JSON.stringify(payload, null, 2),
      });
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Fetch Quick Questions failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Fetch Quick Questions failed', e?.message ?? String(e));
    }
  }, [addLog, placementTag]);

  const answerQuickQuestion = React.useCallback(async () => {
    const tag = placementTag.trim();
    if (!tag) {
      Alert.alert('Missing placement', 'Enter a placement tag first.');
      return;
    }
    const qid = questionId.trim();
    if (!qid) {
      Alert.alert('Missing question id', 'Enter a quick question id first.');
      return;
    }
    addLog({
      level: 'info',
      title: 'Answer Quick Question',
      request: `answerQuickQuestion(tag: ${tag}, questionId: ${qid})`,
    });
    try {
      const response = await RapidoReach.answerQuickQuestion(
        tag,
        qid,
        questionAnswer
      );
      addLog({
        level: 'info',
        title: 'Quick question answered',
        response: JSON.stringify(response, null, 2),
      });
      Alert.alert('Quick question', 'Answered');
    } catch (e: any) {
      addLog({
        level: 'error',
        title: 'Answer Quick Question failed',
        response: e?.message ?? String(e),
      });
      Alert.alert('Answer Quick Question failed', e?.message ?? String(e));
    }
  }, [addLog, placementTag, questionAnswer, questionId]);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  const clearRewards = React.useCallback(() => {
    setRewards([]);
  }, []);

  const simulateReward = React.useCallback(() => {
    addReward({
      amount: 25,
      placement: placementTag,
      note: 'Manual QA bonus',
      source: 'Example app',
    });
    addLog({ level: 'event', title: 'Simulated reward: +25' });
  }, [addLog, addReward, placementTag]);

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.h1}>RapidoReach SDK Smoke Test (React Native)</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Setup</Text>
        <Text style={styles.label}>API Key</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="YOUR_API_KEY"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.label}>User Id</Text>
        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="YOUR_USER_ID"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.label}>Placement Tag</Text>
        <TextInput
          value={placementTag}
          onChangeText={setPlacementTag}
          placeholder="default"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <View style={styles.row}>
          <PrimaryButton title="Initialize" onPress={initialize} />
          <Button title="Set User Id" onPress={updateUserIdentifier} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status</Text>
        <KeyValueRow label="Platform" value={Platform.OS} />
        <KeyValueRow label="Base URL" value={baseUrl ?? '—'} />
        <KeyValueRow
          label="SDK Initialized"
          value={sdkInitialized ? 'Yes' : 'No'}
        />
        <KeyValueRow
          label="Survey Available"
          value={
            surveyAvailable === null
              ? 'Unknown'
              : surveyAvailable
              ? 'Yes'
              : 'No'
          }
        />
        <KeyValueRow label="Last Survey Id" value={lastSurveyId ?? '—'} />
        <KeyValueRow label="Lifetime Rewards" value={`${rewardTotal} coins`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Offerwall</Text>
        <View style={styles.row}>
          <PrimaryButton
            title="Open Offerwall"
            onPress={openOfferwall}
            disabled={!sdkInitialized || surveyAvailable === false}
          />
          <Button title="Toggle Theme" onPress={toggleTheme} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Placements & Surveys</Text>
        <View style={styles.row}>
          <Button title="Check Placement" onPress={checkPlacement} />
          <Button title="Details" onPress={getPlacementDetails} />
        </View>
        <View style={styles.row}>
          <Button title="List Surveys" onPress={listSurveys} />
          <PrimaryButton
            title="Show Last Survey"
            onPress={showLastSurvey}
            disabled={!lastSurveyId}
          />
        </View>
        <Text style={styles.label}>Custom Params (JSON)</Text>
        <TextInput
          value={customParamsJson}
          onChangeText={setCustomParamsJson}
          placeholder="{}"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, styles.inputMultiline]}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Questions</Text>
        <View style={styles.row}>
          <Button title="Fetch QQ" onPress={fetchQuickQuestions} />
        </View>
        <Text style={styles.label}>Question Id</Text>
        <TextInput
          value={questionId}
          onChangeText={setQuestionId}
          placeholder="question_id"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.label}>Answer</Text>
        <TextInput
          value={questionAnswer}
          onChangeText={setQuestionAnswer}
          placeholder="yes"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <PrimaryButton title="Answer QQ" onPress={answerQuickQuestion} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Attributes</Text>
        <Text style={styles.label}>Attributes (JSON)</Text>
        <TextInput
          value={attributesJson}
          onChangeText={setAttributesJson}
          placeholder='{"key":"value"}'
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, styles.inputMultiline]}
          multiline
          textAlignVertical="top"
        />
        <PrimaryButton title="Send Attributes" onPress={sendAttributes} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        <Text style={styles.body}>
          This app mirrors the native iOS/Android SDK smoke test apps: initialize
          the SDK, watch survey availability events, open the offerwall, test
          placements/surveys/quick questions, and record rewards/logs.
        </Text>
      </View>
    </ScrollView>
  );

  const renderRewards = () => (
    <View style={styles.flex}>
      <View style={styles.rewardsHeader}>
        <Text style={styles.h2}>Rewards</Text>
        <Text style={styles.body}>{rewardTotal} coins total</Text>
        <View style={styles.row}>
          <Button title="Simulate +25" onPress={simulateReward} />
          <Button title="Clear" onPress={clearRewards} />
        </View>
      </View>
      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.muted}>No rewards yet. Complete a survey.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <Text style={styles.listRowTitle}>
              +{item.amount} coins · {item.placement}
            </Text>
            <Text style={styles.muted}>
              {item.note} · {formatTimestamp(item.timestampMs)}
            </Text>
          </View>
        )}
      />
    </View>
  );

  const renderLogs = () => (
    <View style={styles.flex}>
      <View style={styles.logsHeader}>
        <Text style={styles.h2}>Logs</Text>
        <View style={styles.row}>
          <Button title="Clear" onPress={clearLogs} />
        </View>
      </View>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.muted}>No logs yet. Trigger an action.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <Text style={styles.listRowTitle}>
              [{item.level}] {item.title}
            </Text>
            <Text style={styles.muted}>{formatTimestamp(item.timestampMs)}</Text>
            {!!item.request && (
              <Text style={styles.mono}>Request: {item.request}</Text>
            )}
            {!!item.response && (
              <Text style={styles.mono}>Response: {item.response}</Text>
            )}
          </View>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        {tab === 'Dashboard' ? renderDashboard() : null}
        {tab === 'Rewards' ? renderRewards() : null}
        {tab === 'Logs' ? renderLogs() : null}
      </View>

      <View style={styles.tabBar}>
        <TabButton
          title="Dashboard"
          selected={tab === 'Dashboard'}
          onPress={() => setTab('Dashboard')}
        />
        <TabButton
          title="Rewards"
          selected={tab === 'Rewards'}
          onPress={() => setTab('Rewards')}
        />
        <TabButton
          title="Logs"
          selected={tab === 'Logs'}
          onPress={() => setTab('Logs')}
        />
      </View>
    </SafeAreaView>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function TabButton({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, selected && styles.tabButtonSelected]}
    >
      <Text style={[styles.tabButtonText, selected && styles.tabButtonTextSel]}>
        {title}
      </Text>
    </Pressable>
  );
}

function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        styles.buttonPrimary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={[styles.buttonText, styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0C' },
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  h1: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  body: { fontSize: 14, color: '#D6D6D6', lineHeight: 20 },
  muted: { fontSize: 13, color: '#9AA0A6' },
  mono: {
    fontSize: 12,
    color: '#B7BBC0',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    marginTop: 4,
  },

  card: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A2E',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 10 },
  label: { fontSize: 12, color: '#9AA0A6', marginBottom: 6 },
  input: {
    backgroundColor: '#0F0F12',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A2E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFF',
    marginBottom: 10,
  },
  inputMultiline: { minHeight: 90 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  kvLabel: { fontSize: 13, color: '#9AA0A6' },
  kvValue: { fontSize: 13, color: '#FFF', marginLeft: 12, flexShrink: 1, textAlign: 'right' },

  button: {
    backgroundColor: '#23232A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3A44',
  },
  buttonPrimary: { backgroundColor: '#4C3AFF', borderColor: '#4C3AFF' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  buttonTextPrimary: { color: '#FFF' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F0F12',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2A2E',
    padding: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#151518',
    alignItems: 'center',
  },
  tabButtonSelected: { backgroundColor: '#23232A' },
  tabButtonText: { color: '#9AA0A6', fontWeight: '700' },
  tabButtonTextSel: { color: '#FFF' },

  rewardsHeader: { padding: 16, paddingBottom: 8 },
  logsHeader: { padding: 16, paddingBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 90 },
  listRow: {
    backgroundColor: '#151518',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A2E',
  },
  listRowTitle: { color: '#FFF', fontWeight: '700', marginBottom: 4 },
});
