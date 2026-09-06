import { View, Text, StyleSheet } from "react-native";

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aujourd'hui</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#11131D" },
  title: { color: "#E2E1F0", fontSize: 24, fontWeight: "600" },
});