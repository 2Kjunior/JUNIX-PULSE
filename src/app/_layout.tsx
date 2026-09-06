import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Aujourd'hui" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tâches" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendrier" }} />
      <Tabs.Screen name="people" options={{ title: "Personnes" }} />
      <Tabs.Screen name="pulse" options={{ title: "Pulse" }} />
    </Tabs>
  );
}