import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { API_URL } from "@/lib/config";
import { colors } from "@/lib/theme";

export function WebMapScreen() {
  const [failed, setFailed] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      {failed ? (
        <View style={styles.center}>
          <Text style={styles.title}>Nie udało się wczytać mapy</Text>
          <Text style={styles.muted}>
            Upewnij się, że serwer działa pod adresem {API_URL} i telefon jest w
            tej samej sieci.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri: `${API_URL}/map` }}
          style={styles.webview}
          geolocationEnabled
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          onError={() => setFailed(true)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.textMuted, textAlign: "center" },
});
