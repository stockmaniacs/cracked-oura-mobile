import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../../src/theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TABS: Array<{
  name: string
  title: string
  icon: IoniconsName
  activeIcon: IoniconsName
  color: string
}> = [
  { name: 'index',     title: 'Today',     icon: 'sunny-outline',    activeIcon: 'sunny',        color: THEME.text },
  { name: 'sleep',     title: 'Sleep',     icon: 'bed-outline',      activeIcon: 'bed',          color: THEME.sleep },
  { name: 'readiness', title: 'Readiness', icon: 'heart-outline',    activeIcon: 'heart',        color: THEME.readiness },
  { name: 'activity',  title: 'Activity',  icon: 'pulse-outline',    activeIcon: 'pulse',        color: THEME.activity },
  { name: 'settings',  title: 'Settings',  icon: 'settings-outline', activeIcon: 'settings',     color: THEME.text },
]

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.card,
          borderTopColor: THEME.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarActiveTintColor: THEME.sleep,
        tabBarInactiveTintColor: THEME.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarActiveTintColor: tab.color,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}
