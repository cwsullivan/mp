import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ScrollView, TextInput } from 'react-native';
import * as Font from 'expo-font';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cross-platform storage helper
const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [beetEvents, setBeetEvents] = React.useState([]);
  const [lastReportTime, setLastReportTime] = React.useState(null);
  const [showBeetAlert, setShowBeetAlert] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [debounceTimeLeft, setDebounceTimeLeft] = React.useState(0);
  const [reminderHours, setReminderHours] = React.useState(10);
  const [debounceMinutes, setDebounceMinutes] = React.useState(30);
  const [tempReminderHours, setTempReminderHours] = React.useState('10');
  const [tempDebounceMinutes, setTempDebounceMinutes] = React.useState('30');

  const STORAGE_KEY = 'murder-poops-events';
  const SETTINGS_KEY = 'murder-poops-settings';

  async function loadFonts() {
    await Font.loadAsync({
      'ComicSans': require('./assets/fonts/ComicSans.ttf'),
    });
    setFontsLoaded(true);
  }

  // Load saved events and settings on startup
  React.useEffect(() => {
    async function initializeApp() {
      await loadFonts();
      await loadSettings();
      await loadSavedEvents();
    }
    initializeApp();
  }, []);

  // Save events whenever they change
  React.useEffect(() => {
    if (beetEvents.length > 0) {
      Storage.setItem(STORAGE_KEY, JSON.stringify(beetEvents));
    }
  }, [STORAGE_KEY, beetEvents]);

  // Update timers every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update beet event countdowns
      setBeetEvents(prevEvents => {
        const updatedEvents = prevEvents.map(event => {
          const timeLeft = Math.max(0, event.alertTime - now);
          return { ...event, timeLeft };
        }).filter(event => event.timeLeft > 0); // Remove expired events
        
        // Check if any timer just expired
        prevEvents.forEach((event, index) => {
          const timeLeft = Math.max(0, event.alertTime - now);
          if (event.timeLeft > 0 && timeLeft === 0 && !updatedEvents.includes(event)) {
            // Timer just expired!
            showReminder();
          }
        });
        
        return updatedEvents;
      });

      // Update debounce countdown
      if (lastReportTime) {
        const timeSinceLastReport = now - lastReportTime;
        const debounceMs = debounceMinutes * 60 * 1000;
        const remaining = Math.max(0, debounceMs - timeSinceLastReport);
        setDebounceTimeLeft(Math.ceil(remaining / 1000));
        
        if (remaining === 0) {
          setLastReportTime(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastReportTime, debounceMinutes]);

  async function loadSettings() {
    try {
      const saved = await Storage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.reminderHours) {
          setReminderHours(settings.reminderHours);
          setTempReminderHours(settings.reminderHours.toString());
        }
        if (settings.debounceMinutes) {
          setDebounceMinutes(settings.debounceMinutes);
          setTempDebounceMinutes(settings.debounceMinutes.toString());
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function saveSettings() {
    const hours = parseFloat(tempReminderHours);
    const minutes = parseFloat(tempDebounceMinutes);

    if (!isNaN(hours) && hours > 0 && !isNaN(minutes) && minutes >= 0) {
      setReminderHours(hours);
      setDebounceMinutes(minutes);
      await Storage.setItem(SETTINGS_KEY, JSON.stringify({
        reminderHours: hours,
        debounceMinutes: minutes
      }));
      setShowSettings(false);
    }
  }

  async function loadSavedEvents() {
    try {
      const saved = await Storage.getItem(STORAGE_KEY);
      if (saved) {
        const events = JSON.parse(saved);
        const now = Date.now();
        // Filter out expired events
        const activeEvents = events.filter(e => e.alertTime > now);
        setBeetEvents(activeEvents);

        // Find the most recent report time for debouncing
        if (activeEvents.length > 0) {
          const mostRecent = Math.max(...activeEvents.map(e => e.reportTime));
          const timeSince = now - mostRecent;
          if (timeSince < debounceMinutes * 60 * 1000) {
            setLastReportTime(mostRecent);
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved events:', error);
    }
  }

  async function playChime() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/sounds/chime.mp3')
      );
      await sound.playAsync();
      // Unload after playing to free memory
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Could not play chime:', error);
    }
  }

  function showReminder() {
    setShowBeetAlert(true);
    playChime();

    // Web-specific: Show browser notification if supported
    if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification("Murder Poops Reminder", {
        body: "Don't panic! You're not dying. It's just beets. 🍠💩",
        icon: '/favicon.png'
      });
    }
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function scheduleMurderPoop() {
    const now = Date.now();
    
    // Check debounce
    if (lastReportTime && debounceMinutes > 0) {
      const timeSinceLastReport = now - lastReportTime;
      const debounceMs = debounceMinutes * 60 * 1000;
      
      if (timeSinceLastReport < debounceMs) {
        // Still in debounce period
        return;
      }
    }

    // Create new beet event
    const newEvent = {
      id: `beet-${now}`,
      reportTime: now,
      alertTime: now + (reminderHours * 60 * 60 * 1000), // Custom hours from settings
      timeLeft: reminderHours * 60 * 60 * 1000,
      totalHours: reminderHours // Store this so we can display it
    };

    setBeetEvents(prev => [...prev, newEvent]);
    setLastReportTime(now);
  }

  // Request notification permission on web
  React.useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  const canReportNewBeet = !lastReportTime || debounceTimeLeft === 0 || debounceMinutes === 0;

  return (
    <View style={styles.mainContainer}>
      {/* Settings Gear Icon - Top Right */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => {
          setTempReminderHours(reminderHours.toString());
          setTempDebounceMinutes(debounceMinutes.toString());
          setShowSettings(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
        <Image source={require('./assets/images/knife.png')} style={styles.image} />
        <Image source={require('./assets/images/beet.png')} style={styles.image} />
        <Text style={styles.title}>Murder Poops</Text>
        
        <TouchableOpacity 
          style={[styles.button, !canReportNewBeet && styles.buttonDisabled]}
          onPress={scheduleMurderPoop}
          activeOpacity={canReportNewBeet ? 0.8 : 1}
          disabled={!canReportNewBeet}
        >
          <Text style={styles.buttonText}>
            {canReportNewBeet ? 'I ate beets' : `Wait ${formatTime(debounceTimeLeft * 1000)}`}
          </Text>
        </TouchableOpacity>

        {!canReportNewBeet && debounceMinutes > 0 && (
          <Text style={styles.debounceText}>
            (One report every {debounceMinutes} minute{debounceMinutes !== 1 ? 's' : ''})
          </Text>
        )}

        {beetEvents.length > 0 && (
          <View style={styles.timerSection}>
            <Text style={styles.timerSectionTitle}>Active Reminders:</Text>
            {beetEvents.map((event, index) => (
              <View key={event.id} style={styles.timerContainer}>
                <Text style={styles.timerIcon}>⏳</Text>
                <Text style={styles.timerLabel}>Beet #{index + 1}:</Text>
                <Text style={styles.timerText}>{formatTime(event.timeLeft)}</Text>
                {event.totalHours && (
                  <Text style={styles.timerSubtext}>({event.totalHours}h timer)</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {beetEvents.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={async () => {
              setBeetEvents([]);
              setLastReportTime(null);
              await Storage.setItem(STORAGE_KEY, '[]');
              setShowBeetAlert(true);
              playChime();
            }}
          >
            <Text style={styles.clearButtonText}>Accelerate All Timers</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Settings Modal */}
      {showSettings && (
        <View style={styles.overlay}>
          <View style={styles.settingsModal}>
            <Text style={styles.settingsTitle}>Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Reminder after:</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={tempReminderHours}
                  onChangeText={setTempReminderHours}
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor="#c08090"
                />
                <Text style={styles.inputSuffix}>hours</Text>
              </View>
            </View>
            
            <Text style={styles.settingHint}>
              How long after eating beets should you be reminded?
            </Text>
            <Text style={styles.settingExample}>
              (e.g., 10 for 10 hours, 0.5 for 30 minutes)
            </Text>
            
            <View style={[styles.settingRow, styles.settingRowMargin]}>
              <Text style={styles.settingLabel}>Cooldown between reports:</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={tempDebounceMinutes}
                  onChangeText={setTempDebounceMinutes}
                  keyboardType="decimal-pad"
                  placeholder="30"
                  placeholderTextColor="#c08090"
                />
                <Text style={styles.inputSuffix}>minutes</Text>
              </View>
            </View>
            
            <Text style={styles.settingHint}>
              Minimum time between "I ate beets" reports
            </Text>
            <Text style={styles.settingExample}>
              (e.g., 30 for half hour, 0 to disable cooldown)
            </Text>
            
            <View style={styles.settingsButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSettings(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={saveSettings}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Beet Alert Modal */}
      {showBeetAlert && (
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Image source={require('./assets/images/dont-panic.png')} style={styles.image} />
            <Text style={styles.modalText}>You're not dying.</Text>
            <Text style={styles.modalText}>It's just beets. 🍠💩</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowBeetAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ae5985',
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    zIndex: 1000,
    padding: 10,
    opacity: 0.7,
  },
  settingsIcon: {
    fontSize: 24,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ae5985',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#ae5985',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  title: {
    fontFamily: 'ComicSans',
    fontSize: 36,
    color: '#741b47',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#e05f75',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 3,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    transition: Platform.OS === 'web' ? 'all 0.2s' : undefined,
  },
  buttonDisabled: {
    backgroundColor: '#c08090',
    opacity: 0.7,
    cursor: Platform.OS === 'web' ? 'not-allowed' : undefined,
  },
  buttonText: {
    fontFamily: 'ComicSans',
    fontSize: 24,
    color: '#741b47',
    textAlign: 'center',
  },
  debounceText: {
    fontFamily: 'ComicSans',
    fontSize: 14,
    color: '#741b47',
    marginTop: 10,
    opacity: 0.8,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  timerSection: {
    marginTop: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 12,
    minWidth: 250,
  },
  timerSectionTitle: {
    fontFamily: 'ComicSans',
    fontSize: 20,
    color: '#741b47',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    flexWrap: 'wrap',
  },
  timerIcon: {
    fontSize: 24,
    color: '#741b47',
  },
  timerLabel: {
    fontFamily: 'ComicSans',
    fontSize: 16,
    color: '#741b47',
  },
  timerText: {
    fontFamily: 'ComicSans',
    fontSize: 18,
    color: '#741b47',
    fontWeight: 'bold',
  },
  timerSubtext: {
    fontFamily: 'ComicSans',
    fontSize: 12,
    color: '#741b47',
    opacity: 0.7,
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: '#741b47',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  clearButtonText: {
    fontFamily: 'ComicSans',
    fontSize: 16,
    color: '#ffffff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    width: Platform.OS === 'web' ? '90%' : '80%',
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
  },
  modalText: {
    fontFamily: 'ComicSans',
    fontSize: 20,
    color: '#741b47',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#e05f75',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  modalButtonText: {
    fontFamily: 'ComicSans',
    fontSize: 18,
    color: '#ffffff',
  },
  settingsModal: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 12,
    width: Platform.OS === 'web' ? '90%' : '80%',
    maxWidth: Platform.OS === 'web' ? 400 : undefined,
  },
  settingsTitle: {
    fontFamily: 'ComicSans',
    fontSize: 28,
    color: '#741b47',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 15,
  },
  settingRowMargin: {
    marginTop: 25,
  },
  settingLabel: {
    fontFamily: 'ComicSans',
    fontSize: 18,
    color: '#741b47',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e05f75',
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    fontFamily: 'ComicSans',
    color: '#741b47',
    backgroundColor: '#fff5f7',
    flex: 1,
    textAlign: 'center',
  },
  inputSuffix: {
    fontFamily: 'ComicSans',
    fontSize: 18,
    color: '#741b47',
  },
  settingHint: {
    fontFamily: 'ComicSans',
    fontSize: 14,
    color: '#741b47',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.8,
  },
  settingExample: {
    fontFamily: 'ComicSans',
    fontSize: 12,
    color: '#741b47',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  settingsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
    gap: 15,
  },
  cancelButton: {
    backgroundColor: '#c08090',
  },
  cancelButtonText: {
    fontFamily: 'ComicSans',
    fontSize: 18,
    color: '#ffffff',
  },
});