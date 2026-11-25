import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Modal,
  Platform,
  Alert,
  Linking,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

const STORAGE_KEY = '@ado_desk_cases_prod_v1';
const PROFILE_STORAGE_KEY = '@ado_desk_user_profile';
const THEME_STORAGE_KEY = '@ado_desk_theme_mode';

const THEMES = {
  light: {
    isDark: false,
    bg: '#f7f9fb',
    surface: '#ffffff',
    cardBg: '#ffffff',
    subCardBg: '#f8fafc',
    text: '#0f172a',
    subtext: '#64748b',
    muted: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    statusBarBg: '#ffffff',
    statusBarStyle: 'dark-content',
    navBg: '#ffffff',
    primary: '#0051d5',
    accent: '#2563eb',
    tint: '#0051d5',
    chipBg: '#eff6ff',
    chipText: '#1d4ed8',
    inputBg: '#ffffff',
  },
  dark: {
    isDark: true,
    bg: '#0b0f19',
    surface: '#131b2e',
    cardBg: '#131b2e',
    subCardBg: '#1a233a',
    text: '#f8fafc',
    subtext: '#94a3b8',
    muted: '#64748b',
    border: '#232f48',
    borderLight: '#1e293b',
    statusBarBg: '#0b0f19',
    statusBarStyle: 'light-content',
    navBg: '#131b2e',
    primary: '#38bdf8',
    accent: '#60a5fa',
    tint: '#38bdf8',
    chipBg: '#1e293b',
    chipText: '#38bdf8',
    inputBg: '#1a233a',
  },
};

function formatDate(d) {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDMY(dStr) {
  if (!dStr) return '';
  const match = dStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const day = match[3].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[1];
    return `${day}/${month}/${year}`;
  }
  return dStr;
}

function formatDisplayDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return formatDateDMY(d);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseToISODate(str) {
  if (!str) return '';
  const trimmed = str.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return 'Good morning,';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon,';
  } else {
    return 'Good evening,';
  }
}

function getCurrentFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name) {
  if (!name || !name.trim()) return 'AD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function App() {
  return (
    <SafeAreaProvider initialWindowMetrics={initialWindowMetrics}>
      <AdvocateDiaryApp />
    </SafeAreaProvider>
  );
}

function AdvocateDiaryApp() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 36) : 0
  );
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 48 : 0
  );

  // Dark Mode Theme State & Persistence
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const toggleDarkMode = async () => {
    try {
      const nextMode = !isDarkMode;
      setIsDarkMode(nextMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode ? 'dark' : 'light');
    } catch (err) {
      console.error('Failed to persist theme:', err);
    }
  };

  // Opens HOME screen first by default
  const [currentTab, setCurrentTab] = useState('HOME'); // 'HOME' | 'DIARY' | 'CASES' | 'CLIENTS' | 'PROFILE'
  const [cases, setCases] = useState([]);

  // Dynamic Today Listings Count for Drawer & Navigation
  const todayISO = formatDate(new Date());
  const todayListedCount = cases.reduce((acc, c) => {
    return acc + (c.hearings || []).filter((h) => h.date === todayISO).length;
  }, 0);

  // User Profile & Onboarding State
  const [userProfile, setUserProfile] = useState(null);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');

  // Advocate Profile Edit State
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileEnrollmentNo, setProfileEnrollmentNo] = useState('');
  const [profileBarAssoc, setProfileBarAssoc] = useState('');
  const [profileChamber, setProfileChamber] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Calendar Pull-to-Refresh State
  const [diaryRefreshing, setDiaryRefreshing] = useState(false);

  // About App Modal State
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  // Sidebar Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modals
  const [newCaseModalVisible, setNewCaseModalVisible] = useState(false);
  const [updateHearingModalVisible, setUpdateHearingModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDocCase, setSelectedDocCase] = useState(null);

  // New Case Form State
  const [partyName, setPartyName] = useState('');
  const [caseNo, setCaseNo] = useState('');
  const [initialHearingDate, setInitialHearingDate] = useState(formatDisplayDate(new Date()));
  const [initialHearingTime, setInitialHearingTime] = useState('10:30 AM');
  const [courtName, setCourtName] = useState('');
  const [itemNo, setItemNo] = useState('');
  const [caseType, setCaseType] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [clientName, setClientName] = useState('');
  const [initialOrderNotes, setInitialOrderNotes] = useState('');

  // Edit Case Details Modal State
  const [editCaseModalVisible, setEditCaseModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editCaseNo, setEditCaseNo] = useState('');
  const [editCourtName, setEditCourtName] = useState('');
  const [editItemNo, setEditItemNo] = useState('');
  const [editCaseType, setEditCaseType] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editPhoneNo, setEditPhoneNo] = useState('');
  const [editStatus, setEditStatus] = useState('PENDING');
  const [editStatusBadge, setEditStatusBadge] = useState('');
  const [editCaseBrief, setEditCaseBrief] = useState('');

  // Update Hearing Modal State
  const [activeCase, setActiveCase] = useState(null);
  const [activeHearingId, setActiveHearingId] = useState(null);
  const [todayOrderNotes, setTodayOrderNotes] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState(formatDate(new Date()));
  const [nextHearingTime, setNextHearingTime] = useState('10:30 AM');
  const [nextCauseListType, setNextCauseListType] = useState('Regular Cause List');
  const [isDecreed, setIsDecreed] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'DECREED' | 'URGENT' | 'HIGH_COURT'

  // Calendar State - Initialize to today's date
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      // 0. Check dark mode theme preference
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
      }

      // 1. Check user profile for first-time onboarding
      const profileData = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (profileData) {
        const parsedProfile = JSON.parse(profileData);
        if (parsedProfile && parsedProfile.name && parsedProfile.name.trim()) {
          setUserProfile(parsedProfile);
          setOnboardingVisible(false);
        } else {
          setOnboardingVisible(true);
        }
      } else {
        setOnboardingVisible(true);
      }

      // 2. Load production cases
      await loadCases();
    } catch (err) {
      console.error('App init error:', err);
      setOnboardingVisible(true);
    }
  };

  const loadCases = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item) => ({
            ...item,
            hearings: Array.isArray(item.hearings) ? item.hearings : [],
          }));
          setCases(normalized);
          return;
        }
      }
      // Production clean slate: strictly empty array
      setCases([]);
    } catch (e) {
      console.error('Failed to load cases', e);
      setCases([]);
    }
  };

  const handleCompleteOnboarding = async () => {
    const trimmed = onboardingName.trim();
    if (!trimmed) {
      Alert.alert(
        'Name Required',
        'Please enter your full name or professional title (e.g., Advocate Sounic) to initialize your practice desk.'
      );
      return;
    }

    const newProfile = {
      name: trimmed,
      designation: 'Advocate & Legal Consultant',
      barAssociation: 'High Court Bar Association',
      enrollmentNo: 'OR/2418/2012',
      chamberAddress: 'Chamber 402, High Court Bar Association Building, Cuttack - 753002',
      phone: '+91 98610 11223',
      email: 'sounic@advocatedesk.law',
      createdAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      setUserProfile(newProfile);
      setOnboardingVisible(false);
    } catch (e) {
      console.error('Failed to save profile', e);
      Alert.alert('Storage Error', 'Could not save profile locally. Please try again.');
    }
  };

  const saveCases = async (updated) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCases(updated);
    } catch (e) {
      console.error('Failed to save cases', e);
    }
  };

  const formatHumanDate = (dateStr) => {
    if (!dateStr) return 'Select Next Date...';
    try {
      const iso = parseToISODate(dateStr);
      const parts = iso.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch (e) {}
    return dateStr;
  };

  const getTermString = (monthIndex) => {
    if (monthIndex < 3) return 'TERM I';
    if (monthIndex < 6) return 'TERM II';
    if (monthIndex < 9) return 'TERM III';
    return 'TERM IV';
  };

  const getWeekDates = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMon);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const changeWeek = (direction) => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + direction * 7);
    setSelectedDate(next);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dStr);
    }
    return days;
  };

  const cycleTime = () => {
    const times = ['10:30 AM', '11:45 AM', '02:15 PM', '03:30 PM', '04:15 PM'];
    const idx = times.indexOf(nextHearingTime);
    const nextIdx = (idx + 1) % times.length;
    setNextHearingTime(times[nextIdx]);
  };

  const getHearingContext = () => {
    if (!activeCase) return '';
    const currentHearing = (activeCase.hearings || []).find((h) => h.id === activeHearingId);
    const currentDate = currentHearing?.date || '';
    const past = (activeCase.hearings || [])
      .filter((h) => h.date < currentDate)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (past.length > 0) {
      return `Last Hearing: ${formatDateDMY(past[0].date)} • Previous Order: ${past[0].orderNotes}`;
    }
    return `First Listing • Court: ${activeCase.courtName || 'Court 3, High Court'}`;
  };

  // --- ACTIONS & DIALOGS ---

  const handlePhoneCall = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (Platform.OS === 'web') {
      window.open(`tel:${clean}`);
    } else {
      Linking.openURL(`tel:${clean}`).catch(() => {
        Alert.alert('Phone Call', `Dialing ${clean}`);
      });
    }
  };

  const handleShareCase = async (caseItem, hearingItem) => {
    try {
      const text = `*Cause List Listing*\nCase: ${caseItem.caseNo}\nTitle: ${caseItem.partyName}\nCourt: ${caseItem.courtName}\nOrder: ${hearingItem?.orderNotes || 'Listed'}`;
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: caseItem.caseNo, text });
        } else {
          await navigator.clipboard.writeText(text);
          alert('Case details copied to clipboard!');
        }
      } else {
        await Share.share({ message: text });
      }
    } catch (err) {
      console.log('Share error', err);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backupPayload = {
        app: 'ado-desk',
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        userProfile: userProfile || null,
        cases: cases,
      };
      const jsonString = JSON.stringify(backupPayload, null, 2);
      const fileName = `advocate_diary_backup_${formatDate(new Date())}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Backup Downloaded', `Backup file saved to your device downloads: ${fileName}`);
      } else {
        // Mobile (Android / iOS)
        let fileSavedLocally = false;
        let fileUri = null;

        try {
          if (FileSystem && FileSystem.documentDirectory) {
            fileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, jsonString, {
              encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
            });
            fileSavedLocally = true;
          }
        } catch (fsErr) {
          console.warn('FileSystem write error:', fsErr);
        }

        let sharedSuccessfully = false;
        if (fileUri) {
          try {
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Download & Save Backup to Storage',
                UTI: 'public.json',
              });
              sharedSuccessfully = true;
            }
          } catch (shareErr) {
            console.warn('Sharing error:', shareErr);
          }
        }

        if (!sharedSuccessfully) {
          await Share.share({
            title: fileName,
            message: jsonString,
          });
        }

        Alert.alert(
          'Backup Created & Saved',
          fileSavedLocally
            ? `Backup file "${fileName}" generated with ${cases.length} case records and saved to device storage.`
            : `Backup payload generated with ${cases.length} case records.`
        );
      }
      setDrawerOpen(false);
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error Creating Backup', error.message || 'Unknown error occurred.');
    }
  };

  const processAndRestoreBackupData = async (jsonString) => {
    try {
      const parsedData = JSON.parse(jsonString);
      let casesArray = [];
      let profileToRestore = null;

      if (Array.isArray(parsedData)) {
        casesArray = parsedData;
      } else if (parsedData && Array.isArray(parsedData.cases)) {
        casesArray = parsedData.cases;
        if (parsedData.userProfile && parsedData.userProfile.name) {
          profileToRestore = parsedData.userProfile;
        }
      } else {
        Alert.alert('Invalid Backup', 'The selected file is not a valid Advocate Diary backup.');
        return;
      }

      const normalized = casesArray.map((item) => ({
        ...item,
        hearings: Array.isArray(item.hearings) ? item.hearings : [],
      }));

      await saveCases(normalized);

      if (profileToRestore) {
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToRestore));
        setUserProfile(profileToRestore);
      }

      Alert.alert(
        'Restore Successful',
        `Successfully restored ${normalized.length} case records${profileToRestore ? ' and profile details' : ''} to your practice diary.`
      );
    } catch (err) {
      console.error('Failed to parse backup:', err);
      Alert.alert('Corrupt Backup File', 'Could not parse JSON: ' + (err.message || 'Invalid format'));
    }
  };

  const handleUploadBackup = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
            await processAndRestoreBackupData(event.target.result);
          };
          reader.readAsText(file);
        };
        input.click();
        setDrawerOpen(false);
      } else {
        // Mobile (Android / iOS): Open document picker for mobile storage
        setDrawerOpen(false);
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'text/*', '*/*'],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          return;
        }

        const asset = result.assets && result.assets.length > 0 ? result.assets[0] : result;
        const fileUri = asset.uri;

        if (!fileUri) {
          Alert.alert('No File Selected', 'Could not access the selected backup file.');
          return;
        }

        let fileContent = '';
        try {
          if (FileSystem && FileSystem.readAsStringAsync) {
            fileContent = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
            });
          } else {
            const resp = await fetch(fileUri);
            fileContent = await resp.text();
          }
        } catch (readErr) {
          const resp = await fetch(fileUri);
          fileContent = await resp.text();
        }

        if (!fileContent) {
          Alert.alert('Empty File', 'The selected backup file contains no readable content.');
          return;
        }

        await processAndRestoreBackupData(fileContent);
      }
    } catch (err) {
      console.error('DocumentPicker / Restore error:', err);
      Alert.alert('Restore Error', 'Could not open or restore file: ' + (err.message || 'Unknown error'));
    }
  };

  const openEditProfileModal = () => {
    setProfileName(userProfile?.name || '');
    setProfileDesignation(userProfile?.designation || 'Advocate & Legal Consultant');
    setProfileEnrollmentNo(userProfile?.enrollmentNo || 'OR/2418/2012');
    setProfileBarAssoc(userProfile?.barAssociation || 'High Court Bar Association');
    setProfileChamber(
      userProfile?.chamberAddress || 'Chamber 402, High Court Bar Association Building, Cuttack - 753002'
    );
    setProfilePhone(userProfile?.phone || '+91 98610 11223');
    setProfileEmail(userProfile?.email || 'sounic@advocatedesk.law');
    setEditProfileModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileName.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your advocate name.');
      return;
    }

    const updatedProfile = {
      ...(userProfile || {}),
      name: trimmedName,
      designation: profileDesignation.trim() || 'Advocate',
      enrollmentNo: profileEnrollmentNo.trim() || 'OR/2418/2012',
      barAssociation: profileBarAssoc.trim() || 'High Court Bar Association',
      chamberAddress:
        profileChamber.trim() || 'Chamber 402, High Court Bar Association Building, Cuttack - 753002',
      phone: profilePhone.trim() || '+91 98610 11223',
      email: profileEmail.trim() || 'advocate@advocatedesk.law',
      updatedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      setEditProfileModalVisible(false);
      Alert.alert('Profile Saved', 'Advocate profile details updated successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Storage Error', 'Could not save profile details locally.');
    }
  };

  const onRefreshDiary = async () => {
    setDiaryRefreshing(true);
    const today = new Date();
    setSelectedDate(today);
    setPickerMonth(today);
    await loadCases();
    setDiaryRefreshing(false);
  };

  // --- CASE CREATION & UPDATES ---

  const handleCreateNewCase = () => {
    const isoDate = parseToISODate(initialHearingDate);
    if (!partyName.trim() || !caseNo.trim() || !isoDate) {
      alert('Please enter Party Name, Case Number, and a valid Hearing Date in DD/MM/YYYY format.');
      return;
    }

    const firstHearing = {
      id: 'h_' + Date.now().toString(),
      date: isoDate,
      time: initialHearingTime.trim() || '10:30 AM',
      orderTitle: 'FIRST LISTING NOTE',
      orderNotes: initialOrderNotes.trim() || 'Case registered / First listing before court.',
      completed: false,
    };

    const newCase = {
      id: 'c_' + Date.now().toString(),
      caseNo: caseNo.trim(),
      partyName: partyName.trim(),
      courtName: courtName.trim() || 'Court 3, High Court',
      itemNo: itemNo.trim() || '',
      caseType: caseType.trim() || '',
      phoneNo: phoneNo.trim(),
      clientName: clientName.trim() || (partyName.trim() ? partyName.trim().split(/ vs | v\. | VS | V\/S /i)[0] : 'Client'),
      status: 'PENDING',
      hearings: [firstHearing],
    };

    const updated = [newCase, ...cases];
    saveCases(updated);

    setPartyName('');
    setCaseNo('');
    setCourtName('');
    setItemNo('');
    setCaseType('');
    setPhoneNo('');
    setClientName('');
    setInitialHearingDate(formatDisplayDate(new Date()));
    setInitialOrderNotes('');
    setNewCaseModalVisible(false);
  };

  const openUpdateModal = (caseItem, hearingItem) => {
    setActiveCase(caseItem);
    setActiveHearingId(hearingItem.id);
    setTodayOrderNotes(''); // Today's Order starts strictly empty with no pre-fill
    setNextHearingDate(hearingItem.adjournedTo || formatDate(new Date()));
    setNextHearingTime(hearingItem.time || '10:30 AM');
    setNextCauseListType(hearingItem.causeListType || 'Regular Cause List');
    setIsDecreed(caseItem.status === 'DECREED');
    setUpdateHearingModalVisible(true);
  };

  const handleSaveHearingProgress = () => {
    if (!isDecreed && !nextHearingDate.trim()) {
      alert('Please select a Next Hearing Date from the calendar, or mark the case as Decreed.');
      return;
    }

    const updatedCases = cases.map((c) => {
      if (c.id !== activeCase.id) return c;

      const updatedHearings = (c.hearings || []).map((h) => {
        if (h.id === activeHearingId) {
          return {
            ...h,
            orderNotes: todayOrderNotes.trim(),
            orderTitle: isDecreed ? 'FINAL JUDGMENT PRONOUNCED' : 'LAST ORDER PASSED',
            adjournedTo: isDecreed ? null : nextHearingDate.trim(),
            causeListType: isDecreed ? null : nextCauseListType,
            completed: true,
          };
        }
        return h;
      });

      if (!isDecreed && nextHearingDate.trim()) {
        updatedHearings.push({
          id: 'h_' + Date.now().toString(),
          date: nextHearingDate.trim(),
          time: nextHearingTime.trim() || '10:30 AM',
          orderTitle: 'SCHEDULED LISTING',
          orderNotes: 'Pending Hearing - Awaiting Order',
          completed: false,
        });
      }

      return {
        ...c,
        status: isDecreed ? 'DECREED' : 'PENDING',
        statusBadge: isDecreed ? 'Decreed in Favor' : c.statusBadge,
        hearings: updatedHearings,
      };
    });

    saveCases(updatedCases);
    setUpdateHearingModalVisible(false);
  };

  // --- EDIT FULL CASE DETAILS HANDLERS ---
  const openEditCaseModal = (caseItem) => {
    if (!caseItem) return;
    setEditingCase(caseItem);
    setEditPartyName(caseItem.partyName || '');
    setEditCaseNo(caseItem.caseNo || '');
    setEditCourtName(caseItem.courtName || '');
    setEditItemNo(caseItem.itemNo || '');
    setEditCaseType(caseItem.caseType || '');
    setEditClientName(caseItem.clientName || '');
    setEditPhoneNo(caseItem.phoneNo || '');
    setEditStatus(caseItem.status || 'PENDING');
    setEditStatusBadge(caseItem.statusBadge || '');
    const firstOrder =
      caseItem.hearings && caseItem.hearings.length > 0 ? caseItem.hearings[0].orderNotes : '';
    setEditCaseBrief(firstOrder || '');
    setEditCaseModalVisible(true);
  };

  const handleSaveCaseDetails = () => {
    if (!editingCase) return;
    if (!editPartyName.trim() || !editCaseNo.trim()) {
      Alert.alert('Required Fields', 'Party Name and Case Number cannot be empty.');
      return;
    }

    const updatedCases = cases.map((c) => {
      if (c.id !== editingCase.id) return c;
      const updatedHearings = [...(c.hearings || [])];
      if (updatedHearings.length > 0) {
        updatedHearings[0] = {
          ...updatedHearings[0],
          orderNotes: editCaseBrief.trim() || updatedHearings[0].orderNotes,
        };
      }
      return {
        ...c,
        partyName: editPartyName.trim(),
        caseNo: editCaseNo.trim(),
        courtName: editCourtName.trim() || 'Court 3, High Court',
        itemNo: editItemNo.trim(),
        caseType: editCaseType.trim(),
        clientName:
          editClientName.trim() ||
          (editPartyName.trim() ? editPartyName.trim().split(/ vs | v\. | VS | V\/S /i)[0] : 'Client'),
        phoneNo: editPhoneNo.trim(),
        status: editStatus,
        statusBadge: editStatusBadge.trim() || (editStatus === 'DECREED' ? 'Decreed in Favor' : ''),
        hearings: updatedHearings,
      };
    });

    saveCases(updatedCases);
    setEditCaseModalVisible(false);
    setEditingCase(null);
  };

  const confirmDeleteFromEdit = () => {
    if (!editingCase) return;
    Alert.alert(
      'Delete Case File',
      `Are you sure you want to permanently delete ${editingCase.caseNo} (${editingCase.partyName}) from your case ledger?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            const filtered = cases.filter((c) => c.id !== editingCase.id);
            saveCases(filtered);
            setEditCaseModalVisible(false);
            setEditingCase(null);
          },
        },
      ]
    );
  };

  const handleDeleteCase = () => {
    if (!activeCase) return;
    const filtered = cases.filter((c) => c.id !== activeCase.id);
    saveCases(filtered);
    setUpdateHearingModalVisible(false);
  };

  const confirmDeleteCase = () => {
    if (!activeCase) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${activeCase.caseNo} (${activeCase.partyName})?`)) {
        handleDeleteCase();
      }
    } else {
      Alert.alert(
        'Delete Case File',
        `Are you sure you want to permanently delete ${activeCase.caseNo} (${activeCase.partyName}) from your diary?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: handleDeleteCase },
        ]
      );
    }
  };

  // --- 1. MAIN HOME SCREEN (STITCH CLEAN HOME DASHBOARD DESIGN) ---

  const renderHomeTab = () => {
    const todayStr = getCurrentFormattedDate();
    const displayName = userProfile?.name || 'Advocate';
    const firstInitial = displayName.trim().charAt(0).toUpperCase() || 'A';
    const activeCasesCount = cases.filter(
      (c) => c.status !== 'DECREED' && c.status !== 'Disposed'
    ).length;

    return (
      <View style={[styles.homeMainWrapper, isDarkMode && { backgroundColor: theme.bg }]}>
        <ScrollView
          style={[styles.homeScrollPage, isDarkMode && { backgroundColor: theme.bg }]}
          contentContainerStyle={[
            styles.homeScrollContent,
            { paddingBottom: 110 + bottomInset },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Utility Bar (Android / React Native Minimal feel) */}
          <View style={styles.homeTopBar}>
            <TouchableOpacity
              aria-label="Open Navigation Drawer"
              style={[styles.homeMenuBtn, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setDrawerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.homeMenuIcon, isDarkMode && { color: theme.text }]}>☰</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeAvatarWrap}
              onPress={() => setCurrentTab('PROFILE')}
              activeOpacity={0.85}
            >
              <View style={[styles.homeAvatarCircle, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.homeAvatarText, isDarkMode && { color: theme.primary }]}>{firstInitial}</Text>
              </View>
              <View style={styles.homeAvatarDot} />
            </TouchableOpacity>
          </View>

          {/* Personal Greeting Header (Spacious & Dignified) */}
          <View style={styles.homeGreetingSection}>
            <Text style={[styles.homeGreetingSmall, isDarkMode && { color: theme.subtext }]}>{getTimeBasedGreeting()}</Text>
            <Text style={[styles.homeGreetingName, isDarkMode && { color: theme.text }]}>{displayName}</Text>
            <View style={styles.homeDeskSubtitleRow}>
              <Text style={styles.homeDeskVerifiedIcon}>☑</Text>
              <Text style={[styles.homeDeskSubtitleText, isDarkMode && { color: theme.subtext }]}>
                Here is your practice desk today • {todayStr}
              </Text>
            </View>

            {/* Dashboard Stats */}
            <View style={styles.homeStatsRow}>
              <View style={[styles.homeStatsPill, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.homeStatsDot} />
                <Text style={[styles.homeStatsText, isDarkMode && { color: theme.subtext }]}>
                  Total active files: {activeCasesCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Primary Action Cards (Stacked with breathing room) */}
          <View style={styles.homeCardsSection}>
            {/* Card 1: Calendar / TimeTable (Vibrant Royal Blue Card) */}
            <TouchableOpacity
              style={styles.calendarCard}
              onPress={() => setCurrentTab('DIARY')}
              activeOpacity={0.92}
            >
              <View style={styles.calendarCardTag}>
                <Text style={{ fontSize: 11 }}>🕒</Text>
                <Text style={styles.calendarCardTagText}>TODAY'S BENCH</Text>
              </View>

              <View style={styles.cardContentRow}>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.calendarCardTitle}>Calendar View</Text>
                  <Text style={styles.calendarCardDesc}>
                    Daily cause list and hearing schedule
                  </Text>
                </View>

                <View style={styles.calendarCardIconBox}>
                  <Text style={{ fontSize: 22, color: '#ffffff' }}>📅</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 2: Search Case (Crisp White Porcelain Surface) */}
            <TouchableOpacity
              style={[styles.searchLedgerCard, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setCurrentTab('CASES')}
              activeOpacity={0.92}
            >
              <View style={[styles.searchLedgerCardTag, isDarkMode && { backgroundColor: theme.chipBg }]}>
                <Text style={{ fontSize: 11, color: isDarkMode ? theme.primary : '#0051d5' }}>🔍</Text>
                <Text style={[styles.searchLedgerCardTagText, isDarkMode && { color: theme.primary }]}>ARCHIVE REGISTRY</Text>
              </View>

              <View style={styles.cardContentRow}>
                <View style={styles.cardTextWrap}>
                  <Text style={[styles.searchLedgerCardTitle, isDarkMode && { color: theme.text }]}>Search Case Ledger</Text>
                  <Text style={[styles.searchLedgerCardDesc, isDarkMode && { color: theme.subtext }]}>
                    Find by case number, party name, or phone
                  </Text>
                </View>

                <View style={[styles.searchLedgerCardIconBox, isDarkMode && { backgroundColor: theme.subCardBg }]}>
                  <Text style={{ fontSize: 20 }}>🔍</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Serene Practice Quote Footer Stamp */}
          <View style={styles.homeChamberFooter}>
            <Text style={{ fontSize: 15, color: '#76777d' }}>⚖</Text>
            <Text style={[styles.homeChamberText, isDarkMode && { color: theme.muted }]}>
              LAW OFFICE OF {displayName.toUpperCase()} • CHAMBER 402
            </Text>
          </View>
        </ScrollView>

        {/* Interactive Floating Dock Pill Overlay */}
        <View style={[styles.floatingDockWrap, { paddingBottom: bottomInset + 14 }]}>
          <View style={[styles.floatingDockPill, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Home Icon */}
            <TouchableOpacity
              style={styles.floatingDockBtn}
              onPress={() => setCurrentTab('HOME')}
              activeOpacity={0.7}
            >
              <Text style={[styles.floatingDockIcon, { color: isDarkMode ? theme.primary : '#0051d5' }]}>🏠</Text>
            </TouchableOpacity>

            {/* Center + Floating Button */}
            <TouchableOpacity
              style={[styles.floatingDockCenterBtn, isDarkMode && { backgroundColor: theme.primary }]}
              onPress={() => {
                setInitialHearingDate(formatDisplayDate(new Date()));
                setNewCaseModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.floatingDockPlusIcon}>+</Text>
            </TouchableOpacity>

            {/* Calendar Icon */}
            <TouchableOpacity
              style={styles.floatingDockBtn}
              onPress={() => setCurrentTab('DIARY')}
              activeOpacity={0.7}
            >
              <Text style={[styles.floatingDockIcon, { color: isDarkMode ? theme.muted : '#76777d' }]}>📅</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // --- 2. CALENDAR TAB (STITCH DESIGN) ---

  const renderDiaryTab = () => {
    const week = getWeekDates(selectedDate);
    const selectedDateStr = formatDate(selectedDate);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = MONTHS_FULL[selectedDate.getMonth()];
    const monthYear = `${monthName} ${selectedDate.getFullYear()}`;
    const termStr = getTermString(selectedDate.getMonth());

    const dailyItems = [];
    cases.forEach((c) => {
      (c.hearings || []).forEach((h) => {
        if (h.date === selectedDateStr) {
          const pastHearings = (c.hearings || [])
            .filter((ph) => ph.date < h.date)
            .sort((a, b) => b.date.localeCompare(a.date));
          const lastHearingDate = pastHearings.length > 0 ? pastHearings[0].date : null;

          const futureHearings = (c.hearings || [])
            .filter((fh) => fh.date > h.date)
            .sort((a, b) => a.date.localeCompare(b.date));
          const nextScheduled = h.adjournedTo || (futureHearings.length > 0 ? futureHearings[0].date : null);
          const causeListType = h.causeListType || (nextScheduled ? 'Regular Cause List' : null);

          dailyItems.push({
            caseData: c,
            hearingData: h,
            lastHearingDate,
            nextScheduled,
            causeListType,
          });
        }
      });
    });

    dailyItems.sort((a, b) => (a.hearingData.time || '').localeCompare(b.hearingData.time || ''));

    return (
      <ScrollView
        style={styles.scrollPage}
        contentContainerStyle={[
          styles.scrollPageContent,
          { paddingBottom: 85 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={diaryRefreshing}
            onRefresh={onRefreshDiary}
            colors={['#0051d5']}
            tintColor="#0051d5"
          />
        }
      >
        {/* Dark Docket Header Card */}
        <View style={styles.docketCard}>
          <View style={styles.docketTopRow}>
            <View style={styles.docketTitleWrap}>
              <Text style={styles.docketMonthText}>{monthYear}</Text>
              <View style={styles.termBadge}>
                <Text style={styles.termBadgeText}>{termStr}</Text>
              </View>
            </View>

            <View style={styles.docketNavCapsule}>
              <TouchableOpacity
                onPress={() => changeWeek(-1)}
                style={styles.docketNavBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.docketNavArrow}>‹</Text>
              </TouchableOpacity>
              <View style={styles.docketNavDivider} />
              <TouchableOpacity
                onPress={() => changeWeek(1)}
                style={styles.docketNavBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.docketNavArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.docketSubText}>{dayName}'s Cause List & Docket Schedule</Text>

          <View style={styles.docketWeekStrip}>
            {week.map((dayObj) => {
              const dStr = formatDate(dayObj);
              const isSelected = dStr === selectedDateStr;
              const hasHearings = cases.some((c) =>
                c.hearings?.some((h) => h.date === dStr)
              );
              const shortDay = DAYS_SHORT[dayObj.getDay()];

              return (
                <TouchableOpacity
                  key={dStr}
                  style={[styles.docketDayItem, isSelected && styles.docketDayItemSelected]}
                  onPress={() => setSelectedDate(dayObj)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.docketDayLabel, isSelected && styles.docketDayLabelSelected]}>
                    {shortDay}
                  </Text>
                  <Text style={[styles.docketDayNumber, isSelected && styles.docketDayNumberSelected]}>
                    {dayObj.getDate()}
                  </Text>
                  {isSelected ? (
                    <View style={styles.selectedDayDot} />
                  ) : hasHearings ? (
                    <View style={styles.hearingIndicatorDot} />
                  ) : (
                    <View style={styles.hearingEmptyDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.scheduleHeaderRow}>
          <View>
            <View style={styles.scheduleTitleWrap}>
              <View style={styles.verticalBlueBar} />
              <Text style={[styles.scheduleTitleText, isDarkMode && { color: theme.text }]}>{dayName} Schedule</Text>
            </View>
            <Text style={[styles.scheduleSubtitleText, isDarkMode && { color: theme.subtext }]}>High Court of Orissa & Commercial Division</Text>
          </View>

          <View style={[styles.hearingsCountBadge, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.hearingsCountDot} />
            <Text style={[styles.hearingsCountText, isDarkMode && { color: theme.subtext }]}>
              {dailyItems.length} {dailyItems.length === 1 ? 'Hearing' : 'Hearings'} Listed
            </Text>
          </View>
        </View>

        {/* Listings Cards - Clicking opens Case Detail Modal */}
        {dailyItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={[styles.emptyStateTitle, isDarkMode && { color: theme.text }]}>No hearings listed today.</Text>
            <Text style={[styles.emptyStateDesc, isDarkMode && { color: theme.subtext }]}>
              Tap '+ New Case' to add your first matter.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                setInitialHearingDate(formatDisplayDate(new Date()));
                setNewCaseModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyActionBtnText}>+ New Case</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dailyItems.map(({ caseData, hearingData, lastHearingDate, nextScheduled, causeListType }) => {
            const isDecreedCase = caseData.status === 'DECREED' || caseData.statusBadge === 'Decreed in Favor';
            const isUrgentCase = caseData.status === 'URGENT' || caseData.caseType === 'Caveat Lodged';

            const accentColor = isDecreedCase
              ? '#10b981'
              : isUrgentCase
              ? '#ef4444'
              : '#2563eb';

            return (
              <TouchableOpacity
                key={hearingData.id}
                style={[
                  styles.hearingCard,
                  { borderLeftColor: accentColor },
                  isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
                onPress={() => openUpdateModal(caseData, hearingData)}
                activeOpacity={0.88}
              >
                {/* Top Badges Row */}
                <View style={styles.cardBadgesRow}>
                  <View style={[styles.pillBadge, styles.pillLightGray]}>
                    <Text style={[styles.pillBadgeText, styles.textDarkGray]}>
                      🏛 {caseData.courtName || 'Court 3, High Court'}
                    </Text>
                  </View>

                  {caseData.statusBadge ? (
                    <View
                      style={[
                        styles.pillBadge,
                        isDecreedCase ? styles.pillLightGreen : styles.pillUrgentRed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillBadgeText,
                          isDecreedCase ? styles.textDarkGreen : styles.textUrgentRed,
                        ]}
                      >
                        {isDecreedCase ? '✓ ' : '● '}
                        {caseData.statusBadge}
                      </Text>
                    </View>
                  ) : caseData.itemNo ? (
                    <View style={[styles.pillBadge, styles.pillLightAmber]}>
                      <Text style={[styles.pillBadgeText, styles.textDarkAmber]}>
                        Item #{caseData.itemNo}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.cardUpdateBtn}
                    onPress={() => openUpdateModal(caseData, hearingData)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardUpdateBtnText}>✎ Update</Text>
                  </TouchableOpacity>
                </View>

                {/* Case Title */}
                <Text style={[styles.casePartyNameText, isDarkMode && { color: theme.text }]}>{caseData.partyName}</Text>

                {/* Case Subtitle / Meta */}
                <View style={styles.caseMetaRow}>
                  <Text style={[styles.caseNoBlueText, isDarkMode && { color: theme.primary }]}>📄 {caseData.caseNo}</Text>
                  {caseData.caseType ? (
                    <>
                      <Text style={styles.metaBullet}>•</Text>
                      <Text
                        style={[
                          styles.caseTypeText,
                          caseData.caseType === 'Caveat Lodged' && styles.caveatLodgedText,
                          isDarkMode && { color: theme.subtext },
                        ]}
                      >
                        {caseData.caseType}
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* Last Hearing Date */}
                {lastHearingDate ? (
                  <View style={styles.lastHearingRow}>
                    <Text style={styles.lastHearingIcon}>🕒</Text>
                    <Text style={[styles.lastHearingText, isDarkMode && { color: theme.subtext }]}>Last Hearing: {lastHearingDate}</Text>
                  </View>
                ) : null}

                {/* Order / Status Description Box */}
                <View
                  style={[
                    styles.orderNoteCard,
                    isDecreedCase
                      ? styles.orderNoteCardGreen
                      : isUrgentCase
                      ? styles.orderNoteCardRed
                      : styles.orderNoteCardBlue,
                    isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.orderNoteHeader}>
                    <Text style={styles.orderNoteIcon}>
                      {isDecreedCase ? '✓' : isUrgentCase ? '⚠' : hearingData.orderTitle === 'INTERIM PROTECTION STATUS' ? '🛡' : '⚖'}
                    </Text>
                    <Text
                      style={[
                        styles.orderNoteTitle,
                        isDecreedCase
                          ? styles.orderTitleGreen
                          : isUrgentCase
                          ? styles.orderTitleRed
                          : hearingData.orderTitle === 'INTERIM PROTECTION STATUS'
                          ? styles.orderTitleBlue
                          : styles.orderTitleSlate,
                        isDarkMode && { color: isDecreedCase ? '#34d399' : isUrgentCase ? '#f87171' : theme.primary },
                      ]}
                    >
                      {hearingData.orderTitle || (isDecreedCase ? 'FINAL JUDGMENT PRONOUNCED' : 'LAST ORDER PASSED')}
                    </Text>
                  </View>
                  <Text style={[styles.orderNoteBodyText, isDarkMode && { color: theme.text }]}>{hearingData.orderNotes}</Text>
                </View>

                {/* Adjourned To Strip */}
                {nextScheduled ? (
                  <View style={[styles.adjournedStrip, isDarkMode && { backgroundColor: theme.subCardBg }]}>
                    <Text style={[styles.adjournedText, isDarkMode && { color: theme.text }]}>
                      ➔ Adjourned to: <Text style={styles.adjournedDateBold}>{nextScheduled}</Text>
                    </Text>
                    <Text style={[styles.causeListTypeText, isDarkMode && { color: theme.primary }]}>{causeListType || 'Regular Cause List'}</Text>
                  </View>
                ) : null}

                {/* Bottom Contact and Action Buttons */}
                <View style={styles.cardFooterRow}>
                  <TouchableOpacity
                    style={styles.phoneContactPill}
                    onPress={() => handlePhoneCall(caseData.phoneNo)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.phoneIcon}>📞</Text>
                    <Text style={styles.phoneNumberText}>{caseData.phoneNo || 'No phone'}</Text>
                    {caseData.clientName ? (
                      <Text style={styles.clientLabelText}>{caseData.clientName}</Text>
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.cardFooterActions}>
                    {caseData.actionType === 'judgment_pdf' ? (
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() => {
                          setSelectedDocCase(caseData);
                          setDocModalVisible(true);
                        }}
                      >
                        <Text style={styles.primaryActionText}>📄 {caseData.actionLabel || 'Judgment PDF'}</Text>
                      </TouchableOpacity>
                    ) : caseData.actionType === 'set_alert' ? (
                      <TouchableOpacity
                        style={styles.outlineActionButton}
                        onPress={() => alert(`Alert set for next listing date: ${nextScheduled || 'Scheduled date'}`)}
                      >
                        <Text style={styles.outlineActionText}>🔔 {caseData.actionLabel || 'Set Alert'}</Text>
                      </TouchableOpacity>
                    ) : caseData.actionType === 'open_brief' ? (
                      <TouchableOpacity
                        style={styles.darkActionButton}
                        onPress={() => {
                          setSelectedDocCase(caseData);
                          setDocModalVisible(true);
                        }}
                      >
                        <Text style={styles.darkActionText}>📖 {caseData.actionLabel || 'Open Brief'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.iconActionRow}>
                        <TouchableOpacity
                          style={[styles.iconCircleBtn, isDarkMode && { borderColor: theme.border, backgroundColor: theme.subCardBg }]}
                          onPress={() => openEditCaseModal(caseData)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={[styles.iconCircleText, isDarkMode && { color: theme.text }]}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconCircleBtn}
                          onPress={() => handleShareCase(caseData, hearingData)}
                        >
                          <Text style={styles.iconCircleText}>↗</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconCircleBtn}
                          onPress={() => {
                            setSelectedDocCase(caseData);
                            setDocModalVisible(true);
                          }}
                        >
                          <Text style={styles.iconCircleText}>🖨</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  // --- 3. SEARCH CASE LEDGER TAB ---

  const renderCasesTab = () => {
    const query = searchQuery.toLowerCase().trim();

    const filteredCases = cases.filter((c) => {
      if (caseFilter === 'PENDING' && c.status === 'DECREED') return false;
      if (caseFilter === 'DECREED' && c.status !== 'DECREED') return false;
      if (caseFilter === 'URGENT' && c.status !== 'URGENT' && c.caseType !== 'Caveat Lodged') return false;
      if (caseFilter === 'HIGH_COURT' && !c.courtName.toLowerCase().includes('high court')) return false;

      if (!query) return true;
      const inCaseNo = c.caseNo && c.caseNo.toLowerCase().includes(query);
      const inParty = c.partyName && c.partyName.toLowerCase().includes(query);
      const inCourt = c.courtName && c.courtName.toLowerCase().includes(query);
      const inPhone = c.phoneNo && c.phoneNo.toLowerCase().includes(query);
      const inClient = c.clientName && c.clientName.toLowerCase().includes(query);
      const inType = c.caseType && c.caseType.toLowerCase().includes(query);
      const inOrders = (c.hearings || []).some(
        (h) => h.orderNotes && h.orderNotes.toLowerCase().includes(query)
      );

      return inCaseNo || inParty || inCourt || inPhone || inClient || inType || inOrders;
    });

    const pendingCount = cases.filter((c) => c.status !== 'DECREED').length;
    const decreedCount = cases.filter((c) => c.status === 'DECREED').length;
    const urgentCount = cases.filter(
      (c) => c.status === 'URGENT' || c.caseType === 'Caveat Lodged'
    ).length;

    return (
      <ScrollView
        style={styles.scrollPage}
        contentContainerStyle={[
          styles.scrollPageContent,
          { paddingBottom: 85 + bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchOxfordCard}>
          <View style={styles.searchOxfordTopRow}>
            <View style={styles.searchJusticeIconWrap}>
              <Text style={styles.searchJusticeIcon}>⚖</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.searchOxfordBrand}>Advocate Diary</Text>
              <Text style={styles.searchOxfordSub}>Personal Practice Ledger</Text>
            </View>
            <View style={styles.searchOfflinePill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.searchOfflineText}>Offline-First</Text>
            </View>
          </View>

          <View style={styles.searchUserProfileBar}>
            <Text style={styles.searchUserProfileText}>
              👤 {userProfile?.name || 'Advocate'} • {userProfile?.barAssociation || 'High Court Bar'}
            </Text>
            <Text style={styles.searchStatsSummary}>
              {cases.length} Total Matters • {pendingCount} Pending
            </Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBarWrapper, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchTextInput, isDarkMode && { color: theme.text }]}
              placeholder="Search by Case No., Party, Court, Mobile..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }, caseFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setCaseFilter('ALL')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, isDarkMode && { color: theme.subtext }, caseFilter === 'ALL' && styles.filterChipTextActive]}>
              All ({cases.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }, caseFilter === 'PENDING' && styles.filterChipActive]}
            onPress={() => setCaseFilter('PENDING')}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.filterChipText, isDarkMode && { color: theme.subtext }, caseFilter === 'PENDING' && styles.filterChipTextActive]}
            >
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }, caseFilter === 'DECREED' && styles.filterChipActive]}
            onPress={() => setCaseFilter('DECREED')}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.filterChipText, isDarkMode && { color: theme.subtext }, caseFilter === 'DECREED' && styles.filterChipTextActive]}
            >
              Decreed ({decreedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }, caseFilter === 'URGENT' && styles.filterChipActive]}
            onPress={() => setCaseFilter('URGENT')}
            activeOpacity={0.75}
          >
            <Text
              style={[styles.filterChipText, isDarkMode && { color: theme.subtext }, caseFilter === 'URGENT' && styles.filterChipTextActive]}
            >
              Urgent / Caveat ({urgentCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }, caseFilter === 'HIGH_COURT' && styles.filterChipActive]}
            onPress={() => setCaseFilter('HIGH_COURT')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterChipText,
                isDarkMode && { color: theme.subtext },
                caseFilter === 'HIGH_COURT' && styles.filterChipTextActive,
              ]}
            >
              High Court
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.resultsCounterRow}>
          <Text style={[styles.resultsCountText, isDarkMode && { color: theme.subtext }]}>
            Showing <Text style={[{ fontWeight: '800', color: '#0f172a' }, isDarkMode && { color: theme.text }]}>{filteredCases.length}</Text> Matching Matters
          </Text>
          {searchQuery || caseFilter !== 'ALL' ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setCaseFilter('ALL');
              }}
            >
              <Text style={styles.resetFiltersText}>Reset Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {cases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyStateTitle}>No records found.</Text>
            <Text style={styles.emptyStateDesc}>Your case ledger is empty.</Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                setInitialHearingDate(formatDisplayDate(new Date()));
                setNewCaseModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyActionBtnText}>+ Add First Case</Text>
            </TouchableOpacity>
          </View>
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyStateTitle}>No Matching Cases</Text>
            <Text style={styles.emptyStateDesc}>
              No matters matched your search "{searchQuery}" with the current filters.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => {
                setSearchQuery('');
                setCaseFilter('ALL');
              }}
            >
              <Text style={styles.emptyActionBtnText}>Clear Search & Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCases.map((c) => {
            const isDecreedCase = c.status === 'DECREED' || c.statusBadge === 'Decreed in Favor';
            const isUrgentCase = c.status === 'URGENT' || c.caseType === 'Caveat Lodged';
            const accentColor = isDecreedCase ? '#10b981' : isUrgentCase ? '#ef4444' : '#2563eb';
            const latestHearing =
              c.hearings && c.hearings.length > 0 ? c.hearings[c.hearings.length - 1] : null;

            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.hearingCard,
                  { borderLeftColor: accentColor },
                  isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
                onPress={() => latestHearing && openUpdateModal(c, latestHearing)}
                activeOpacity={0.88}
              >
                <View style={styles.cardBadgesRow}>
                  <View style={[styles.pillBadge, styles.pillLightBlue]}>
                    <Text style={[styles.pillBadgeText, styles.textBlue]}>
                      📋 {c.hearings?.length || 0} Listings
                    </Text>
                  </View>

                  <View style={[styles.pillBadge, styles.pillLightGray]}>
                    <Text style={[styles.pillBadgeText, styles.textDarkGray]}>🏛 {c.courtName}</Text>
                  </View>

                  {isDecreedCase ? (
                    <View style={[styles.pillBadge, styles.pillLightGreen]}>
                      <Text style={[styles.pillBadgeText, styles.textDarkGreen]}>✓ Decreed</Text>
                    </View>
                  ) : isUrgentCase ? (
                    <View style={[styles.pillBadge, styles.pillLightAmber]}>
                      <Text style={[styles.pillBadgeText, styles.textUrgentRed]}>● Urgent Relief</Text>
                    </View>
                  ) : c.itemNo ? (
                    <View style={[styles.pillBadge, styles.pillLightAmber]}>
                      <Text style={[styles.pillBadgeText, styles.textDarkAmber]}>Item #{c.itemNo}</Text>
                    </View>
                  ) : null}

                  {latestHearing ? (
                    <TouchableOpacity
                      style={styles.cardUpdateBtn}
                      onPress={() => openUpdateModal(c, latestHearing)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cardUpdateBtnText}>✎ Update</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={[styles.casePartyNameText, isDarkMode && { color: theme.text }]}>{c.partyName}</Text>

                <View style={styles.caseMetaRow}>
                  <Text style={[styles.caseNoBlueText, isDarkMode && { color: theme.primary }]}>📄 {c.caseNo}</Text>
                  {c.caseType ? (
                    <>
                      <Text style={styles.metaBullet}>•</Text>
                      <Text
                        style={[
                          styles.caseTypeText,
                          c.caseType === 'Caveat Lodged' && styles.caveatLodgedText,
                          isDarkMode && { color: theme.subtext },
                        ]}
                      >
                        {c.caseType}
                      </Text>
                    </>
                  ) : null}
                </View>

                {c.phoneNo ? (
                  <TouchableOpacity
                    style={[styles.phoneContactPill, { alignSelf: 'flex-start', marginVertical: 6 }, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}
                    onPress={() => handlePhoneCall(c.phoneNo)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.phoneIcon}>📞</Text>
                    <Text style={[styles.phoneNumberText, isDarkMode && { color: theme.text }]}>{c.phoneNo}</Text>
                    {c.clientName ? (
                      <Text style={[styles.clientLabelText, isDarkMode && { color: theme.subtext }]}>({c.clientName})</Text>
                    ) : null}
                  </TouchableOpacity>
                ) : null}

                <View style={[styles.searchOrdersContainer, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}>
                  <Text style={[styles.orderNoteTitle, isDarkMode && { color: theme.muted }]}>CHRONOLOGICAL HEARINGS & ORDERS</Text>
                  {(c.hearings || []).map((h, idx) => (
                    <View key={h.id || idx} style={[styles.searchOrderRow, isDarkMode && { borderBottomColor: theme.border }]}>
                      <View style={styles.searchOrderHeaderLine}>
                        <Text style={[styles.searchOrderDate, isDarkMode && { color: theme.primary }]}>
                          • {formatDateDMY(h.date)}:
                        </Text>
                        {h.completed ? (
                          <Text style={styles.searchOrderDoneBadge}>Completed</Text>
                        ) : (
                          <Text style={styles.searchOrderPendingBadge}>Scheduled</Text>
                        )}
                      </View>
                      <Text style={[styles.searchOrderNotesText, isDarkMode && { color: theme.text }]}>{h.orderNotes}</Text>
                      {h.adjournedTo ? (
                        <Text style={[styles.searchOrderAdjournedText, isDarkMode && { color: theme.subtext }]}>
                          ➔ Adjourned to: {formatDateDMY(h.adjournedTo)} ({h.causeListType || 'Next Listing'})
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                <View style={styles.cardFooterRow}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.outlineActionButton, isDarkMode && { borderColor: theme.border, backgroundColor: theme.subCardBg }]}
                      onPress={() => {
                        setSelectedDocCase(c);
                        setDocModalVisible(true);
                      }}
                    >
                      <Text style={[styles.outlineActionText, isDarkMode && { color: theme.subtext }]}>📖 Brief</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.outlineActionButton, { borderColor: '#2563eb', backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff' }]}
                      onPress={() => openEditCaseModal(c)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.outlineActionText, { color: '#2563eb', fontWeight: '700' }, isDarkMode && { color: '#60a5fa' }]}>
                        ✎ Edit Details
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {latestHearing ? (
                      <TouchableOpacity
                        style={styles.primaryActionButton}
                        onPress={() => openUpdateModal(c, latestHearing)}
                      >
                        <Text style={styles.primaryActionText}>✎ Record Order</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.iconCircleBtn, isDarkMode && { borderColor: theme.border, backgroundColor: theme.subCardBg }]}
                      onPress={() => handleShareCase(c, latestHearing || {})}
                    >
                      <Text style={[styles.iconCircleText, isDarkMode && { color: theme.text }]}>↗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  // --- 4. CLIENTS TAB ---

  const renderClientsTab = () => {
    const clientsMap = {};
    cases.forEach((c) => {
      const key = c.phoneNo || c.clientName || 'Unassigned';
      if (!clientsMap[key]) {
        clientsMap[key] = {
          clientName: c.clientName || (c.partyName ? c.partyName.split(/ vs | v\. | VS | V\/S /i)[0] : 'General Client'),
          phoneNo: c.phoneNo || 'No Phone',
          cases: [],
        };
      }
      clientsMap[key].cases.push(c);
    });

    const clientList = Object.values(clientsMap);

    return (
      <ScrollView
        style={styles.scrollPage}
        contentContainerStyle={[
          styles.scrollPageContent,
          { paddingBottom: 85 + bottomInset },
        ]}
      >
        <View style={styles.clientHeaderSection}>
          <Text style={[styles.clientHeaderTitle, isDarkMode && { color: theme.text }]}>Clients Directory</Text>
          <Text style={[styles.clientHeaderSubtitle, isDarkMode && { color: theme.subtext }]}>{clientList.length} Connected Clients</Text>
        </View>

        {clientList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyStateTitle, isDarkMode && { color: theme.text }]}>No Clients Registered</Text>
            <Text style={[styles.emptyStateDesc, isDarkMode && { color: theme.subtext }]}>
              Clients and their contact phone numbers will appear here automatically when you create case entries.
            </Text>
          </View>
        ) : (
          clientList.map((client, idx) => (
            <View key={idx} style={[styles.clientCard, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.clientTopRow}>
                <View style={[styles.clientAvatarSquare, isDarkMode && { backgroundColor: theme.subCardBg }]}>
                  <Text style={[styles.clientAvatarText, isDarkMode && { color: theme.primary }]}>
                    {client.clientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientNameBig, isDarkMode && { color: theme.text }]}>{client.clientName}</Text>
                  <Text style={[styles.clientPhoneSmall, isDarkMode && { color: theme.subtext }]}>📞 {client.phoneNo}</Text>
                </View>
                {client.phoneNo !== 'No Phone' ? (
                  <TouchableOpacity
                    style={styles.callClientBtn}
                    onPress={() => handlePhoneCall(client.phoneNo)}
                  >
                    <Text style={styles.callClientBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.clientCasesSection}>
                <Text style={[styles.clientCasesTitle, isDarkMode && { color: theme.muted }]}>Associated Cases ({client.cases.length}):</Text>
                {client.cases.map((cs) => (
                  <View key={cs.id} style={[styles.clientCasePill, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}>
                    <Text style={[styles.clientCaseNo, isDarkMode && { color: theme.primary }]}>{cs.caseNo}</Text>
                    <Text style={[styles.clientCaseParty, isDarkMode && { color: theme.text }]} numberOfLines={1}>
                      {cs.partyName}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  // --- 5. PROFILE TAB ---

  const renderProfileTab = () => {
    const totalHearings = cases.reduce((sum, c) => sum + (c.hearings?.length || 0), 0);
    const decreedCount = cases.filter((c) => c.status === 'DECREED').length;
    const name = userProfile?.name || 'Advocate';
    const designation = userProfile?.designation || 'Advocate & Legal Consultant';
    const barAssoc = userProfile?.barAssociation || 'High Court Bar Association';
    const enrNo = userProfile?.enrollmentNo || 'OR/2418/2012';
    const chamber =
      userProfile?.chamberAddress ||
      'Chamber 402, High Court Bar Association Building, Cuttack - 753002';
    const phone = userProfile?.phone || '+91 98610 11223';
    const email = userProfile?.email || 'sounic@advocatedesk.law';

    return (
      <ScrollView
        style={styles.scrollPage}
        contentContainerStyle={[
          styles.scrollPageContent,
          { paddingBottom: 85 + bottomInset },
        ]}
      >
        {/* Profile Dossier Hero Card */}
        <View style={[styles.profileBigCard, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.profileBigAvatar, isDarkMode && { backgroundColor: theme.subCardBg }]}>
            <Text style={[styles.profileBigAvatarText, isDarkMode && { color: theme.primary }]}>{getInitials(name)}</Text>
          </View>
          <Text style={[styles.profileNameText, isDarkMode && { color: theme.text }]}>{name}</Text>
          <Text style={[styles.profileSubText, isDarkMode && { color: theme.subtext }]}>{designation}</Text>
          <Text style={[styles.profileBarAssocText, isDarkMode && { color: theme.primary }]}>🏛 {barAssoc}</Text>
          <View style={[styles.barBadgePill, isDarkMode && { backgroundColor: theme.chipBg }]}>
            <Text style={[styles.barBadgePillText, isDarkMode && { color: theme.chipText }]}>
              BAR COUNCIL REG: {enrNo}
            </Text>
          </View>

          {/* Edit Profile Details Action Button */}
          <TouchableOpacity
            style={[styles.editProfilePillBtn, isDarkMode && { backgroundColor: theme.primary }]}
            onPress={openEditProfileModal}
            activeOpacity={0.85}
          >
            <Text style={styles.editProfilePillIcon}>✎</Text>
            <Text style={styles.editProfilePillText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </View>

        {/* Practice Stats Overview */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statBoxNum, isDarkMode && { color: theme.text }]}>{cases.length}</Text>
            <Text style={[styles.statBoxLabel, isDarkMode && { color: theme.subtext }]}>Total Cases</Text>
          </View>
          <View style={[styles.statBox, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statBoxNum, isDarkMode && { color: theme.text }]}>{totalHearings}</Text>
            <Text style={[styles.statBoxLabel, isDarkMode && { color: theme.subtext }]}>Total Listings</Text>
          </View>
          <View style={[styles.statBox, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statBoxNum, isDarkMode && { color: theme.text }]}>{decreedCount}</Text>
            <Text style={[styles.statBoxLabel, isDarkMode && { color: theme.subtext }]}>Decreed Files</Text>
          </View>
        </View>

        {/* Chambers & Professional Office Card */}
        <View style={[styles.chamberCard, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.chamberCardHeaderRow}>
            <Text style={[styles.chamberTitle, isDarkMode && { color: theme.muted }]}>CHAMBERS & PRACTICE OFFICE</Text>
            <TouchableOpacity onPress={openEditProfileModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.chamberEditLink, isDarkMode && { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.chamberAddress, isDarkMode && { color: theme.text }]}>{chamber}</Text>
          <View style={styles.chamberContactRow}>
            <TouchableOpacity
              style={[styles.chamberContactPill, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}
              onPress={() => handlePhoneCall(phone)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13 }}>📞</Text>
              <Text style={[styles.chamberContactPillText, isDarkMode && { color: theme.text }]}>{phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chamberContactPill, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.open(`mailto:${email}`);
                } else {
                  Linking.openURL(`mailto:${email}`).catch(() => {
                    Alert.alert('Email', email);
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13 }}>✉️</Text>
              <Text style={[styles.chamberContactPillText, isDarkMode && { color: theme.text }]}>{email}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diary Data & Storage Actions */}
        <View style={[styles.profileActionsCard, isDarkMode && { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.profileSectionTitle, isDarkMode && { color: theme.muted }]}>DIARY DATA & STORAGE</Text>

          <TouchableOpacity style={[styles.profileActionButton, isDarkMode && { borderBottomColor: theme.border }]} onPress={handleCreateBackup} activeOpacity={0.8}>
            <Text style={styles.profileActionIcon}>💾</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileActionMain, isDarkMode && { color: theme.text }]}>Create Backup</Text>
              <Text style={[styles.profileActionSub, isDarkMode && { color: theme.subtext }]}>Download & save encrypted JSON file to device</Text>
            </View>
            <Text style={[styles.profileActionChevron, isDarkMode && { color: theme.muted }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.profileActionButton, isDarkMode && { borderBottomColor: theme.border }]} onPress={handleUploadBackup} activeOpacity={0.8}>
            <Text style={styles.profileActionIcon}>📂</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileActionMain, isDarkMode && { color: theme.text }]}>Restore from Backup</Text>
              <Text style={[styles.profileActionSub, isDarkMode && { color: theme.subtext }]}>Choose backup file from device storage</Text>
            </View>
            <Text style={[styles.profileActionChevron, isDarkMode && { color: theme.muted }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View
      style={[
        styles.safeContainer,
        {
          paddingTop: topInset,
          backgroundColor: theme.bg,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.statusBarStyle}
        backgroundColor={theme.statusBarBg}
        translucent={Platform.OS === 'android'}
      />

      {/* Top Application Bar (shown on non-Home tabs) */}
      {currentTab !== 'HOME' ? (
        <View style={[styles.topHeaderBar, isDarkMode && { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={[styles.hamburgerBtn, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.hamburgerIcon, isDarkMode && { color: theme.text }]}>☰</Text>
          </TouchableOpacity>

          <View style={styles.topHeaderCenter}>
            <Text style={[styles.topHeaderTitle, isDarkMode && { color: theme.text }]}>
              {currentTab === 'DIARY'
                ? 'Cause List & Diary'
                : currentTab === 'CASES'
                ? 'Search Case Ledger'
                : currentTab === 'CLIENTS'
                ? 'Clients Directory'
                : 'Advocate Profile'}
            </Text>
            <View style={[styles.topHeaderBadge, isDarkMode && { backgroundColor: theme.chipBg }]}>
              <Text style={[styles.topHeaderBadgeText, isDarkMode && { color: theme.chipText }]}>
                {currentTab === 'CASES' ? 'PERSONAL PRACTICE LEDGER' : 'ADVOCATE DIARY'}
              </Text>
            </View>
          </View>

          <View style={styles.topHeaderRight}>
            <TouchableOpacity
              style={styles.addCaseHeaderBtn}
              onPress={() => {
                setInitialHearingDate(formatDisplayDate(new Date()));
                setNewCaseModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.addCaseHeaderPlus}>+</Text>
              <Text style={styles.addCaseHeaderText}>Case</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileAvatarBtn, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}
              onPress={() => setCurrentTab('PROFILE')}
              activeOpacity={0.85}
            >
              <Text style={[styles.avatarIconText, isDarkMode && { color: theme.text }]}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Active Tab Screen */}
      <View style={[styles.mainContentArea, { backgroundColor: theme.bg }]}>
        {currentTab === 'HOME' && renderHomeTab()}
        {currentTab === 'DIARY' && renderDiaryTab()}
        {currentTab === 'CASES' && renderCasesTab()}
        {currentTab === 'CLIENTS' && renderClientsTab()}
        {currentTab === 'PROFILE' && renderProfileTab()}
      </View>

      {/* Standard Bottom Nav for non-Home tabs */}
      {currentTab !== 'HOME' ? (
        <View
          style={[
            styles.bottomNavContainer,
            {
              height: 60 + bottomInset,
              paddingBottom: bottomInset,
              backgroundColor: theme.navBg,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setCurrentTab('HOME')}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavIcon, currentTab === 'HOME' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavIconActive) : (isDarkMode ? { color: theme.muted } : null)]}>
              🏠
            </Text>
            <Text style={[styles.bottomNavLabel, currentTab === 'HOME' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavLabelActive) : (isDarkMode ? { color: theme.subtext } : null)]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setCurrentTab('DIARY')}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavIcon, currentTab === 'DIARY' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavIconActive) : (isDarkMode ? { color: theme.muted } : null)]}>
              📅
            </Text>
            <Text style={[styles.bottomNavLabel, currentTab === 'DIARY' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavLabelActive) : (isDarkMode ? { color: theme.subtext } : null)]}>
              Diary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setCurrentTab('CASES')}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavIcon, currentTab === 'CASES' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavIconActive) : (isDarkMode ? { color: theme.muted } : null)]}>
              ⚖️
            </Text>
            <Text style={[styles.bottomNavLabel, currentTab === 'CASES' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavLabelActive) : (isDarkMode ? { color: theme.subtext } : null)]}>
              Cases
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setCurrentTab('CLIENTS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavIcon, currentTab === 'CLIENTS' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavIconActive) : (isDarkMode ? { color: theme.muted } : null)]}>
              👥
            </Text>
            <Text style={[styles.bottomNavLabel, currentTab === 'CLIENTS' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavLabelActive) : (isDarkMode ? { color: theme.subtext } : null)]}>
              Clients
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setCurrentTab('PROFILE')}
            activeOpacity={0.7}
          >
            <Text style={[styles.bottomNavIcon, currentTab === 'PROFILE' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavIconActive) : (isDarkMode ? { color: theme.muted } : null)]}>
              👤
            </Text>
            <Text style={[styles.bottomNavLabel, currentTab === 'PROFILE' ? (isDarkMode ? { color: theme.primary } : styles.bottomNavLabelActive) : (isDarkMode ? { color: theme.subtext } : null)]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* --- SLIDE-OUT NAVIGATION DRAWER (STITCH DESIGN SPECIFICATION) --- */}
      <Modal visible={drawerOpen} animationType="fade" transparent={true}>
        <View style={styles.drawerOverlay}>
          {/* Drawer Slide Panel (84% screen width, max 340px) */}
          <View style={[styles.drawerSheet, isDarkMode && { backgroundColor: '#0f172a' }]}>
            {/* 1. Drawer Header (Deep Oxford Navy Surface #131b2e) */}
            <View style={[styles.drawerHeaderCard, { paddingTop: topInset + 14 }]}>
              {/* Ambient Decorative Scales Watermark */}
              <View style={styles.drawerScalesWatermark} pointerEvents="none">
                <Text style={styles.drawerScalesWatermarkIcon}>⚖</Text>
              </View>

              {/* Identity & Insignia */}
              <View style={styles.drawerIdentityRow}>
                <View style={styles.drawerGavelBox}>
                  <Text style={styles.drawerGavelIcon}>⚖</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerBrandTitle}>Advocate Diary</Text>
                  <Text style={styles.drawerBrandSubtitle}>Personal Practice Ledger</Text>
                </View>
              </View>

              {/* Advocate Profile Dossier Card */}
              <TouchableOpacity
                style={styles.drawerProfileDossier}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('PROFILE');
                }}
                activeOpacity={0.85}
              >
                <View style={styles.drawerDossierTopRow}>
                  <View style={styles.drawerInitialsAvatar}>
                    <Text style={styles.drawerInitialsText}>
                      {getInitials(userProfile?.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.drawerNameVerifiedRow}>
                      <Text style={styles.drawerAdvocateName} numberOfLines={1}>
                        {userProfile?.name || 'Advocate'}
                      </Text>
                      <View style={styles.drawerVerifiedBadge}>
                        <Text style={styles.drawerVerifiedCheck}>✓</Text>
                      </View>
                    </View>
                    <Text style={styles.drawerBarAssocText} numberOfLines={1}>
                      {userProfile?.barAssociation || 'High Court Bar Association'}
                    </Text>
                  </View>
                </View>

                <View style={styles.drawerDossierBottomRow}>
                  <Text style={styles.drawerEnrollmentText}>
                    {userProfile?.enrollmentNo ? `Enr: ${userProfile.enrollmentNo}` : 'Enr: OR/2418/2012'}
                  </Text>
                  <View style={styles.drawerJurisdictionPill}>
                    <Text style={styles.drawerJurisdictionText}>High Court of Orissa</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Scrollable Navigation & Cryptography Sections */}
            <ScrollView
              style={styles.drawerBody}
              contentContainerStyle={styles.drawerBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* PRACTICE DESK SECTION */}
              <Text style={styles.drawerSectionLabel}>PRACTICE DESK</Text>

              {/* Home Dashboard */}
              <TouchableOpacity
                style={[
                  styles.drawerNavItem,
                  currentTab === 'HOME' && styles.drawerNavItemActive,
                ]}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('HOME');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={[styles.drawerNavItemIcon, currentTab === 'HOME' && styles.drawerNavItemIconActive]}>
                    🏠
                  </Text>
                  <Text
                    style={[
                      styles.drawerNavItemText,
                      currentTab === 'HOME' && styles.drawerNavItemTextActive,
                    ]}
                  >
                    Home Dashboard
                  </Text>
                </View>
                <Text style={styles.drawerNavChevron}>›</Text>
              </TouchableOpacity>

              {/* Cause Timetable (Calendar) */}
              <TouchableOpacity
                style={[
                  styles.drawerNavItem,
                  currentTab === 'DIARY' && styles.drawerNavItemActive,
                ]}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('DIARY');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={[styles.drawerNavItemIcon, currentTab === 'DIARY' && styles.drawerNavItemIconActive]}>
                    📅
                  </Text>
                  <Text
                    style={[
                      styles.drawerNavItemText,
                      currentTab === 'DIARY' && styles.drawerNavItemTextActive,
                    ]}
                  >
                    Cause Timetable
                  </Text>
                </View>
                <View style={styles.drawerListedBadge}>
                  <Text style={styles.drawerListedBadgeText}>Today: {todayListedCount} Listed</Text>
                </View>
              </TouchableOpacity>

              {/* New Case Filing */}
              <TouchableOpacity
                style={styles.drawerNavItem}
                onPress={() => {
                  setDrawerOpen(false);
                  setInitialHearingDate(formatDisplayDate(new Date()));
                  setNewCaseModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={styles.drawerNavItemIcon}>➕</Text>
                  <Text style={styles.drawerNavItemText}>New Case Filing</Text>
                </View>
                <Text style={styles.drawerNavChevron}>›</Text>
              </TouchableOpacity>

              {/* Search Case Ledger */}
              <TouchableOpacity
                style={[
                  styles.drawerNavItem,
                  currentTab === 'CASES' && styles.drawerNavItemActive,
                ]}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('CASES');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={[styles.drawerNavItemIcon, currentTab === 'CASES' && styles.drawerNavItemIconActive]}>
                    🔍
                  </Text>
                  <Text
                    style={[
                      styles.drawerNavItemText,
                      currentTab === 'CASES' && styles.drawerNavItemTextActive,
                    ]}
                  >
                    Search Ledger
                  </Text>
                </View>
                <View style={styles.drawerCountChip}>
                  <Text style={styles.drawerCountChipText}>{cases.length} Dockets</Text>
                </View>
              </TouchableOpacity>

              {/* Daily Cause Roster */}
              <TouchableOpacity
                style={styles.drawerNavItem}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('DIARY');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={styles.drawerNavItemIcon}>⚖️</Text>
                  <Text style={styles.drawerNavItemText}>Daily Cause Roster</Text>
                </View>
                <Text style={styles.drawerNavChevron}>›</Text>
              </TouchableOpacity>

              {/* Client Directory */}
              <TouchableOpacity
                style={[
                  styles.drawerNavItem,
                  currentTab === 'CLIENTS' && styles.drawerNavItemActive,
                ]}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('CLIENTS');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={[styles.drawerNavItemIcon, currentTab === 'CLIENTS' && styles.drawerNavItemIconActive]}>
                    👥
                  </Text>
                  <Text
                    style={[
                      styles.drawerNavItemText,
                      currentTab === 'CLIENTS' && styles.drawerNavItemTextActive,
                    ]}
                  >
                    Client Directory
                  </Text>
                </View>
                <Text style={styles.drawerNavChevron}>›</Text>
              </TouchableOpacity>

              {/* Advocate Profile */}
              <TouchableOpacity
                style={[
                  styles.drawerNavItem,
                  currentTab === 'PROFILE' && styles.drawerNavItemActive,
                ]}
                onPress={() => {
                  setDrawerOpen(false);
                  setCurrentTab('PROFILE');
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={[styles.drawerNavItemIcon, currentTab === 'PROFILE' && styles.drawerNavItemIconActive]}>
                    👤
                  </Text>
                  <Text
                    style={[
                      styles.drawerNavItemText,
                      currentTab === 'PROFILE' && styles.drawerNavItemTextActive,
                    ]}
                  >
                    Advocate Profile
                  </Text>
                </View>
                <Text style={styles.drawerNavChevron}>›</Text>
              </TouchableOpacity>

              {/* About App Navigation Item */}
              <TouchableOpacity
                style={styles.drawerNavItem}
                onPress={() => {
                  setDrawerOpen(false);
                  setAboutModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.drawerNavLeftRow}>
                  <Text style={styles.drawerNavItemIcon}>ℹ️</Text>
                  <Text style={styles.drawerNavItemText}>About App</Text>
                </View>
                <View style={styles.drawerVersionPill}>
                  <Text style={styles.drawerVersionPillText}>v3.0.0</Text>
                </View>
              </TouchableOpacity>

              {/* APPEARANCE SECTION: DARK MODE TOGGLE */}
              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }, isDarkMode && { color: '#94a3b8' }]}>
                APPEARANCE
              </Text>

              <TouchableOpacity
                style={[
                  styles.drawerThemeCard,
                  isDarkMode && { backgroundColor: '#131b2e', borderColor: '#232f48' },
                ]}
                onPress={toggleDarkMode}
                activeOpacity={0.8}
              >
                <View style={styles.drawerDataCardLeft}>
                  <View style={[styles.drawerDataIconBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={{ fontSize: 18 }}>{isDarkMode ? '🌙' : '☀️'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerThemeCardTitle, isDarkMode && { color: '#f8fafc' }]}>
                      Dark Mode
                    </Text>
                    <Text style={[styles.drawerThemeCardSubtitle, isDarkMode && { color: '#94a3b8' }]}>
                      {isDarkMode ? 'Midnight Oxford (Active)' : 'Standard Light Theme'}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.drawerTogglePill,
                    isDarkMode ? styles.drawerTogglePillActive : styles.drawerTogglePillInactive,
                  ]}
                >
                  <View style={styles.drawerToggleThumb} />
                </View>
              </TouchableOpacity>

              {/* DATA & CRYPTOGRAPHY SECTION */}
              <Text style={[styles.drawerSectionLabel, { marginTop: 14 }, isDarkMode && { color: '#94a3b8' }]}>
                DATA & CRYPTOGRAPHY
              </Text>

              {/* Create Backup Button */}
              <TouchableOpacity
                style={[styles.drawerDataCard, isDarkMode && { backgroundColor: '#131b2e', borderColor: '#232f48' }]}
                onPress={handleCreateBackup}
                activeOpacity={0.8}
              >
                <View style={styles.drawerDataCardLeft}>
                  <View style={[styles.drawerDataIconBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={{ fontSize: 18 }}>💾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerDataTitle, isDarkMode && { color: '#f8fafc' }]}>Create Backup</Text>
                    <Text style={[styles.drawerDataSubtitle, isDarkMode && { color: '#94a3b8' }]}>Download & save to device storage</Text>
                    <Text style={styles.drawerDataTimestamp}>Encrypted JSON File</Text>
                  </View>
                </View>
                <Text style={styles.drawerDownloadIcon}>📥</Text>
              </TouchableOpacity>

              {/* Restore Backup Button */}
              <TouchableOpacity
                style={[styles.drawerDataCard, isDarkMode && { backgroundColor: '#131b2e', borderColor: '#232f48' }]}
                onPress={handleUploadBackup}
                activeOpacity={0.8}
              >
                <View style={styles.drawerDataCardLeft}>
                  <View style={[styles.drawerDataIconBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={{ fontSize: 18 }}>📂</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerDataTitle, isDarkMode && { color: '#f8fafc' }]}>Restore Backup</Text>
                    <Text style={[styles.drawerDataSubtitle, isDarkMode && { color: '#94a3b8' }]}>Choose backup from device storage</Text>
                  </View>
                </View>
                <View style={[styles.drawerAesChip, isDarkMode && { backgroundColor: '#1e293b' }]}>
                  <Text style={[styles.drawerAesChipText, isDarkMode && { color: '#38bdf8' }]}>JSON</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* 4. Drawer Footer & Security Telemetry */}
            <View style={[styles.drawerFooterContainer, { paddingBottom: bottomInset + 12 }, isDarkMode && { backgroundColor: '#0b0f19', borderTopColor: '#1e293b' }]}>
              {/* On-Device Vault Status Card */}
              <View style={[styles.drawerVaultCard, isDarkMode && { backgroundColor: '#131b2e', borderColor: '#232f48' }]}>
                <View style={styles.drawerVaultHeaderRow}>
                  <View style={styles.drawerPulseDot} />
                  <Text style={[styles.drawerVaultTitle, isDarkMode && { color: '#f8fafc' }]}>Offline-First Vault Active</Text>
                </View>
                <Text style={[styles.drawerVaultDesc, isDarkMode && { color: '#94a3b8' }]}>
                  All cause briefs, orders, and contacts securely encrypted on local memory.
                </Text>
                <View style={styles.drawerStatsGrid}>
                  <View style={[styles.drawerStatBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={[styles.drawerStatNumber, isDarkMode && { color: '#f8fafc' }]}>{cases.length}</Text>
                    <Text style={[styles.drawerStatLabel, isDarkMode && { color: '#94a3b8' }]}>Total</Text>
                  </View>
                  <View style={[styles.drawerStatBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={[styles.drawerStatNumber, { color: '#0051d5' }, isDarkMode && { color: '#38bdf8' }]}>
                      {cases.filter((c) => c.status !== 'Disposed' && c.status !== 'Decreed').length}
                    </Text>
                    <Text style={[styles.drawerStatLabel, isDarkMode && { color: '#94a3b8' }]}>Pending</Text>
                  </View>
                  <View style={[styles.drawerStatBox, isDarkMode && { backgroundColor: '#1a233a' }]}>
                    <Text style={[styles.drawerStatNumber, isDarkMode && { color: '#f8fafc' }]}>
                      {cases.filter((c) => c.status === 'Disposed' || c.status === 'Decreed').length}
                    </Text>
                    <Text style={[styles.drawerStatLabel, isDarkMode && { color: '#94a3b8' }]}>Disposed</Text>
                  </View>
                </View>
              </View>

              {/* Lock Application & Session Controls */}
              <View style={styles.drawerLockRow}>
                <TouchableOpacity
                  style={[styles.drawerLockBtn, isDarkMode && { backgroundColor: '#1a233a', borderColor: '#232f48' }]}
                  onPress={() => {
                    Alert.alert('Chamber Locked', 'Practice diary locked. Tap anywhere to reopen.');
                    setDrawerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.drawerLockIcon}>🔒</Text>
                  <Text style={[styles.drawerLockText, isDarkMode && { color: '#f8fafc' }]}>Lock Diary</Text>
                </TouchableOpacity>
                <Text style={[styles.drawerVersionText, isDarkMode && { color: '#64748b' }]}>v3.0.0 (Release Build)</Text>
              </View>
            </View>
          </View>

          {/* Dismiss Touch Target (Right 16% Zone with Frosted Close Button) */}
          <TouchableOpacity
            style={[styles.drawerDismissArea, { paddingTop: topInset + 16 }]}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          >
            <View style={styles.drawerFloatingCloseBtn}>
              <Text style={styles.drawerFloatingCloseIcon}>✕</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* --- 1. MODAL: REGISTER NEW CASE --- */}
      <Modal visible={newCaseModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { paddingBottom: 20 + bottomInset }, isDarkMode && { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, isDarkMode && { color: theme.text }]}>New Court Case Entry</Text>
              <TouchableOpacity onPress={() => setNewCaseModalVisible(false)}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Party Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ramesh Chandra Jena vs State of Odisha"
                placeholderTextColor="#94a3b8"
                value={partyName}
                onChangeText={setPartyName}
              />

              <Text style={styles.formLabel}>Case Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. WP(C) 1024/2026"
                placeholderTextColor="#94a3b8"
                value={caseNo}
                onChangeText={setCaseNo}
              />

              <Text style={styles.formLabel}>Hearing Date (DD/MM/YYYY) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="DD/MM/YYYY (e.g. 21/11/2026)"
                placeholderTextColor="#94a3b8"
                value={initialHearingDate}
                onChangeText={setInitialHearingDate}
              />

              <Text style={styles.formLabel}>Court / Bench</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Court 3, High Court"
                placeholderTextColor="#94a3b8"
                value={courtName}
                onChangeText={setCourtName}
              />

              <Text style={styles.formLabel}>Client Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 9861011223"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phoneNo}
                onChangeText={setPhoneNo}
              />

              <Text style={styles.formLabel}>Initial Order / Registration Brief</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 60 }]}
                placeholder="Enter stage, interim status, or advocate instructions..."
                placeholderTextColor="#94a3b8"
                multiline
                value={initialOrderNotes}
                onChangeText={setInitialOrderNotes}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setNewCaseModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2563eb' }]}
                onPress={handleCreateNewCase}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Case</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 2. MODAL: QUICK UPDATE HEARING / CASE DETAIL (STITCH DESIGN) --- */}
      <Modal visible={updateHearingModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetOverlay}
        >
          <View style={[styles.stitchBottomSheet, isDarkMode && { backgroundColor: theme.surface }]}>
            {/* Drag Handle Area */}
            <View style={styles.sheetDragHandleWrap}>
              <View style={[styles.sheetDragHandle, isDarkMode && { backgroundColor: '#334155' }]} />
            </View>

            {/* Header Section */}
            <View style={styles.stitchSheetHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stitchSheetTitle, isDarkMode && { color: theme.text }]}>Update Hearing</Text>
                <Text style={[styles.stitchSheetSubtitle, isDarkMode && { color: theme.subtext }]} numberOfLines={1}>
                  {activeCase ? `${activeCase.partyName} • ${activeCase.caseNo}` : 'Case Details'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setUpdateHearingModalVisible(false)}
                style={[styles.stitchSheetCloseBtn, isDarkMode && { backgroundColor: theme.subCardBg }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.stitchSheetCloseIcon, isDarkMode && { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sheet Content Body */}
            <ScrollView
              style={styles.stitchSheetScroll}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 2. Context Strip */}
              <View style={styles.stitchContextStrip}>
                <Text style={styles.stitchContextIcon}>🕒</Text>
                <Text style={styles.stitchContextText} numberOfLines={2}>
                  {getHearingContext()}
                </Text>
              </View>

              {/* 3. Today's Hearing Order (Main Field) */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.stitchFieldLabel}>Today's Order / Notes</Text>

                <View style={[styles.stitchTextAreaWrap, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.stitchTextArea, isDarkMode && { color: theme.text }]}
                    placeholder=""
                    placeholderTextColor="transparent"
                    multiline
                    value={todayOrderNotes}
                    onChangeText={setTodayOrderNotes}
                  />
                </View>

                {/* Quick Phrase Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickPhrasesRow}
                >
                  {[
                    'Passed to next hearing date',
                    'Notice Issued',
                    'Counter Called within 4 Weeks',
                    'Interim Stay Extended',
                    'Record Summoned',
                    'Part-heard Adjourned',
                  ].map((phrase, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickPhraseChip}
                      onPress={() => {
                        setTodayOrderNotes((prev) =>
                          prev.trim().length > 0 ? `${prev.trim()} ${phrase}.` : `${phrase}.`
                        );
                      }}
                    >
                      <Text style={styles.quickPhraseChipText}>+ {phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 4. Case Status Toggle (Pill Buttons) */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.stitchSectionUpperLabel}>CASE STATUS</Text>
                <View style={styles.stitchStatusGrid}>
                  <TouchableOpacity
                    style={[
                      styles.stitchStatusPill,
                      !isDecreed && styles.stitchStatusPillActivePending,
                    ]}
                    onPress={() => setIsDecreed(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.stitchStatusIcon}>⏳</Text>
                    <Text
                      style={[
                        styles.stitchStatusText,
                        !isDecreed && styles.stitchStatusTextActivePending,
                      ]}
                    >
                      Active / Pending
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.stitchStatusPill,
                      isDecreed && styles.stitchStatusPillActiveDecreed,
                    ]}
                    onPress={() => setIsDecreed(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.stitchStatusIcon}>⚖️</Text>
                    <Text
                      style={[
                        styles.stitchStatusText,
                        isDecreed && styles.stitchStatusTextActiveDecreed,
                      ]}
                    >
                      Mark as Decreed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. Next Hearing Date (Streamlined) */}
              {!isDecreed ? (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.stitchFieldLabel}>
                    Next Hearing Date <Text style={{ color: '#ba1a1a' }}>*</Text>
                  </Text>

                  <View style={styles.stitchDateTimeRow}>
                    {/* Date Box */}
                    <TouchableOpacity
                      style={styles.stitchDateBox}
                      onPress={() => {
                        setPickerMonth(
                          nextHearingDate ? new Date(nextHearingDate) : new Date()
                        );
                        setPickerVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.stitchCalendarIcon}>📅</Text>
                        <Text style={styles.stitchDateBoxText}>
                          {formatHumanDate(nextHearingDate)}
                        </Text>
                      </View>
                      <Text style={styles.stitchChevronDown}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.decreedNoticeBox}>
                  <Text style={styles.decreedNoticeIcon}>✓</Text>
                  <Text style={styles.decreedNoticeText}>
                    Case marked as decreed & disposed. No future hearing listings required.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Sticky Bottom Action Tray */}
            <View style={[styles.stitchBottomActionTray, { paddingBottom: bottomInset + 12 }]}>
              <TouchableOpacity
                style={styles.stitchDeleteBtn}
                onPress={confirmDeleteCase}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.stitchDeleteIcon}>🗑</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stitchCancelBtn}
                onPress={() => setUpdateHearingModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.stitchCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stitchPrimaryActionBtn}
                onPress={handleSaveHearingProgress}
                activeOpacity={0.85}
              >
                <Text style={styles.stitchPrimaryActionText}>
                  {isDecreed ? 'Record Decree' : 'Save & Adjourn'}
                </Text>
                <Text style={styles.stitchPrimaryActionArrow}>➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- 3. MODAL: CALENDAR DATE PICKER --- */}
      <Modal visible={pickerVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 430 + bottomInset, paddingBottom: 16 + bottomInset }]}>
            <View style={styles.pickerHeaderRow}>
              <TouchableOpacity
                onPress={() =>
                  setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))
                }
                style={styles.pickerMonthBtn}
              >
                <Text style={styles.pickerMonthArrow}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.pickerMonthTitle}>
                {MONTHS_FULL[pickerMonth.getMonth()]} {pickerMonth.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))
                }
                style={styles.pickerMonthBtn}
              >
                <Text style={styles.pickerMonthArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerDayHeadersRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <Text key={idx} style={styles.pickerDayHeaderText}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.pickerGrid}>
              {getDaysInMonth(pickerMonth).map((dateStr, idx) => {
                if (!dateStr) {
                  return <View key={`empty-${idx}`} style={styles.pickerEmptyCell} />;
                }
                const isSelected = nextHearingDate === dateStr;
                const dayNumber = parseInt(dateStr.split('-')[2], 10);

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={styles.pickerCell}
                    onPress={() => {
                      setNextHearingDate(dateStr);
                      setPickerVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.pickerNumberCircle,
                        isSelected && styles.pickerNumberCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerNumberText,
                          isSelected && styles.pickerNumberTextSelected,
                        ]}
                      >
                        {dayNumber}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#f1f5f9', marginTop: 14 }]}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- 4. MODAL: DOCUMENT / BRIEF VIEWER --- */}
      <Modal visible={docModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 520 + bottomInset, paddingBottom: 20 + bottomInset }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Court Record & Document</Text>
                <Text style={styles.modalSubtitle}>{selectedDocCase?.caseNo}</Text>
              </View>
              <TouchableOpacity onPress={() => setDocModalVisible(false)}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 10 }}>
              <View style={styles.docCardPreview}>
                <Text style={styles.docHeaderTitle}>IN THE HIGH COURT OF ORISSA, CUTTACK</Text>
                <Text style={styles.docSubheaderTitle}>{selectedDocCase?.caseNo}</Text>
                <Text style={styles.docPartyBig}>{selectedDocCase?.partyName}</Text>
                <View style={styles.docDivider} />

                <Text style={styles.docSectionLabel}>BENCH / COURTROOM</Text>
                <Text style={styles.docTextNormal}>{selectedDocCase?.courtName}</Text>

                <Text style={[styles.docSectionLabel, { marginTop: 10 }]}>CASE STATUS</Text>
                <Text style={styles.docTextNormal}>
                  Status: {selectedDocCase?.status} • {selectedDocCase?.statusBadge || 'Active Cause List'}
                </Text>

                <Text style={[styles.docSectionLabel, { marginTop: 10 }]}>RECORDED ORDERS & PROCEEDINGS</Text>
                {(selectedDocCase?.hearings || []).map((h, i) => (
                  <View key={i} style={styles.docOrderRow}>
                    <Text style={styles.docOrderDate}>
                      {formatDateDMY(h.date)}:
                    </Text>
                    <Text style={styles.docOrderText}>{h.orderNotes}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setDocModalVisible(false)}
              >
                <Text style={{ color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2563eb' }]}
                onPress={() => {
                  const targetCase = selectedDocCase;
                  setDocModalVisible(false);
                  openEditCaseModal(targetCase);
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>✎ Edit Case Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- 5. MODAL: EDIT ALL CASE DETAILS --- */}
      <Modal visible={editCaseModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: 600 + bottomInset, paddingBottom: 20 + bottomInset }, isDarkMode && { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.modalTitle, isDarkMode && { color: theme.text }]}>Edit Case Details</Text>
                <Text style={[styles.modalSubtitle, isDarkMode && { color: theme.subtext }]} numberOfLines={1}>
                  {editingCase?.caseNo || 'Case File'} • {editingCase?.partyName || 'All Details Editable'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditCaseModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Party Name (Cause Title) *</Text>
              <TextInput
                style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. Ramesh Chandra Jena vs State of Odisha"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={editPartyName}
                onChangeText={setEditPartyName}
              />

              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Case Number *</Text>
              <TextInput
                style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. WP(C) 1024/2026"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={editCaseNo}
                onChangeText={setEditCaseNo}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.4 }}>
                  <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Court / Bench</Text>
                  <TextInput
                    style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. Court 3, High Court"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    value={editCourtName}
                    onChangeText={setEditCourtName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Item / List No.</Text>
                  <TextInput
                    style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. 14"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    value={editItemNo}
                    onChangeText={setEditItemNo}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Case Category / Nature</Text>
              <TextInput
                style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. Writ Petition / Civil Appeal / Caveat"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={editCaseType}
                onChangeText={setEditCaseType}
              />

              {/* Status Selector */}
              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Case Status</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {[
                  { key: 'PENDING', label: 'Pending' },
                  { key: 'DECREED', label: 'Decreed' },
                  { key: 'URGENT', label: 'Urgent' },
                  { key: 'Disposed', label: 'Disposed' },
                ].map((st) => {
                  const isActive = editStatus === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      onPress={() => setEditStatus(st.key)}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isActive ? '#2563eb' : (isDarkMode ? theme.border : '#cbd5e1'),
                        backgroundColor: isActive
                          ? (isDarkMode ? '#1e3a8a' : '#eff6ff')
                          : (isDarkMode ? theme.subCardBg : '#ffffff'),
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: isActive ? '700' : '500',
                          color: isActive ? '#2563eb' : (isDarkMode ? theme.text : '#475569'),
                        }}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Status / Relief Badge</Text>
              <TextInput
                style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                placeholder="e.g. Decreed in Favor, Interim Stay, Notice Issued"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                value={editStatusBadge}
                onChangeText={setEditStatusBadge}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Client Name</Text>
                  <TextInput
                    style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. Ramesh Chandra Jena"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    value={editClientName}
                    onChangeText={setEditClientName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Client Phone</Text>
                  <TextInput
                    style={[styles.formInput, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                    placeholder="e.g. 9861011223"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    keyboardType="phone-pad"
                    value={editPhoneNo}
                    onChangeText={setEditPhoneNo}
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, isDarkMode && { color: theme.subtext }]}>Initial Order / Case Brief Note</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 64 }, isDarkMode && { backgroundColor: theme.subCardBg, borderColor: theme.border, color: theme.text }]}
                placeholder="Enter case brief, stage, or instructions..."
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                multiline
                value={editCaseBrief}
                onChangeText={setEditCaseBrief}
              />

              {/* Danger Zone: Delete Case File */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  marginTop: 6,
                  marginBottom: 10,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#2d1515' : '#fef2f2',
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#5c1d1d' : '#fecaca',
                  gap: 6,
                }}
                onPress={confirmDeleteFromEdit}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: '#ef4444' }}>🗑</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#ef4444' }}>
                  Delete Case File Permanently
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => setEditCaseModalVisible(false)}
              >
                <Text style={{ color: isDarkMode ? '#94a3b8' : '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2563eb' }]}
                onPress={handleSaveCaseDetails}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FIRST-TIME USER ONBOARDING WELCOME MODAL --- */}
      <Modal
        visible={onboardingVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {}}
      >
        <View style={[styles.onboardingSafeArea, { paddingTop: topInset, paddingBottom: bottomInset + 14 }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#f7f9fb" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.onboardingScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.onboardingCard}>
                {/* Advocate Bands Icon */}
                <View style={styles.onboardingIconBox}>
                  <View style={styles.advocateBandsContainer}>
                    <View style={styles.advocateBandsCollar} />
                    <View style={styles.advocateBandsPair}>
                      <View style={styles.advocateBand} />
                      <View style={styles.advocateBand} />
                    </View>
                  </View>
                </View>

                {/* Title & Tagline */}
                <Text style={styles.onboardingTitle}>Welcome to ado-desk</Text>
                <Text style={styles.onboardingTagline}>
                  Your personal, offline court diary & hearing ledger.
                </Text>

                {/* Offline & Confidentiality Assurance Badges */}
                <View style={styles.onboardingBadgesList}>
                  <View style={styles.onboardingBadgeItem}>
                    <Text style={styles.onboardingBadgeIcon}>🔒</Text>
                    <Text style={styles.onboardingBadgeText}>
                      100% Offline & Stored on Device
                    </Text>
                  </View>
                  <View style={styles.onboardingBadgeItem}>
                    <Text style={styles.onboardingBadgeIcon}>⚖️</Text>
                    <Text style={styles.onboardingBadgeText}>
                      Private practice diary & hearing history
                    </Text>
                  </View>
                </View>

                {/* Name Prompt Input */}
                <View style={styles.onboardingFormWrap}>
                  <Text style={styles.onboardingInputLabel}>ADVOCATE NAME / TITLE</Text>
                  <TextInput
                    style={styles.onboardingInput}
                    placeholder="Enter your full name or title, e.g., Advocate Sounic"
                    placeholderTextColor="#94a3b8"
                    value={onboardingName}
                    onChangeText={setOnboardingName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleCompleteOnboarding}
                  />
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.onboardingSubmitBtn}
                  onPress={handleCompleteOnboarding}
                  activeOpacity={0.88}
                >
                  <Text style={styles.onboardingSubmitBtnText}>Get Started →</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- MODAL: EDIT ADVOCATE PROFILE --- */}
      <Modal visible={editProfileModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: 580 + bottomInset, paddingBottom: 20 + bottomInset }, isDarkMode && { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, isDarkMode && { color: theme.text }]}>Edit Advocate Profile</Text>
                <Text style={[styles.modalSubtitle, isDarkMode && { color: theme.subtext }]}>Update personal practice & chamber details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditProfileModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 6 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Full Name / Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Sounic Behera or Advocate Sounic"
                placeholderTextColor="#94a3b8"
                value={profileName}
                onChangeText={setProfileName}
                autoCapitalize="words"
              />

              <Text style={styles.formLabel}>Professional Designation</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Advocate & Legal Consultant / Senior Counsel"
                placeholderTextColor="#94a3b8"
                value={profileDesignation}
                onChangeText={setProfileDesignation}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.1 }}>
                  <Text style={styles.formLabel}>Bar Council Reg / Enr No.</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. OR/2418/2012"
                    placeholderTextColor="#94a3b8"
                    value={profileEnrollmentNo}
                    onChangeText={setProfileEnrollmentNo}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1.3 }}>
                  <Text style={styles.formLabel}>Bar Association</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. High Court Bar Association"
                    placeholderTextColor="#94a3b8"
                    value={profileBarAssoc}
                    onChangeText={setProfileBarAssoc}
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Chamber / Office Address</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 65, textAlignVertical: 'top' }]}
                placeholder="e.g. Chamber No. 402, High Court Bar Association Building, Cuttack - 753002"
                placeholderTextColor="#94a3b8"
                multiline
                value={profileChamber}
                onChangeText={setProfileChamber}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Chamber Phone / Mobile</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. +91 98610 11223"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={profilePhone}
                    onChangeText={setProfilePhone}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Professional Email</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. sounic@advocatedesk.law"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={profileEmail}
                    onChangeText={setProfileEmail}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => setEditProfileModalVisible(false)}
              >
                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#2563eb' }]}
                onPress={handleSaveProfile}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL: ABOUT APP --- */}
      <Modal visible={aboutModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <View style={[styles.modalContent, { maxWidth: 390, width: '100%', borderRadius: 20, padding: 22 }, isDarkMode && { backgroundColor: theme.surface }]}>
            {/* Header / Brand Icon */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={styles.aboutAppIconCircle}>
                <Text style={{ fontSize: 26, color: '#ffffff' }}>⚖</Text>
              </View>
              <Text style={[styles.aboutAppName, isDarkMode && { color: theme.text }]}>ado-desk</Text>
              <Text style={[styles.aboutAppSubtitle, isDarkMode && { color: theme.subtext }]}>Personal Practice Ledger & Court Diary</Text>
              <View style={styles.aboutVersionBadge}>
                <Text style={styles.aboutVersionBadgeText}>v3.0.0 (Release Build)</Text>
              </View>
            </View>

            <View style={styles.aboutDetailsList}>
              <View style={[styles.aboutDetailItem, isDarkMode && { borderBottomColor: theme.border }]}>
                <Text style={[styles.aboutDetailLabel, isDarkMode && { color: theme.muted }]}>DEVELOPER</Text>
                <Text style={[styles.aboutDetailValue, isDarkMode && { color: theme.text }]}>Sounic Behera</Text>
              </View>

              <View style={[styles.aboutDetailItem, isDarkMode && { borderBottomColor: theme.border }]}>
                <Text style={[styles.aboutDetailLabel, isDarkMode && { color: theme.muted }]}>APPLICATION</Text>
                <Text style={[styles.aboutDetailValue, isDarkMode && { color: theme.text }]}>ado-desk Practice Suite</Text>
              </View>

              <View style={[styles.aboutDetailItem, isDarkMode && { borderBottomColor: theme.border }]}>
                <Text style={[styles.aboutDetailLabel, isDarkMode && { color: theme.muted }]}>VERSION</Text>
                <Text style={[styles.aboutDetailValue, isDarkMode && { color: theme.text }]}>v3.0.0 (Production Release)</Text>
              </View>

              <View style={[styles.aboutDetailItem, isDarkMode && { borderBottomColor: theme.border }]}>
                <Text style={[styles.aboutDetailLabel, isDarkMode && { color: theme.muted }]}>STORAGE ENGINE</Text>
                <Text style={[styles.aboutDetailValue, isDarkMode && { color: theme.text }]}>Offline-First On-Device Vault</Text>
              </View>

              <View style={[styles.aboutDetailItem, isDarkMode && { borderBottomColor: theme.border }]}>
                <Text style={[styles.aboutDetailLabel, isDarkMode && { color: theme.muted }]}>SECURITY ARCHITECTURE</Text>
                <Text style={[styles.aboutDetailValue, isDarkMode && { color: theme.text }]}>100% Private • Zero Cloud Leakage</Text>
              </View>
            </View>

            <Text style={[styles.aboutAppDescription, isDarkMode && { color: theme.subtext }]}>
              Designed and engineered by Sounic Behera for advocates and legal practitioners. All dockets, cause lists, daily orders, and client ledgers are preserved strictly within your local device memory.
            </Text>

            <TouchableOpacity
              style={styles.aboutCloseBtn}
              onPress={() => setAboutModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.aboutCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  mainContentArea: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  scrollPage: {
    flex: 1,
  },
  scrollPageContent: {
    paddingBottom: 85,
  },

  // --- HOME SCREEN (STITCH CLEAN HOME DASHBOARD) ---
  homeMainWrapper: {
    flex: 1,
    backgroundColor: '#f7f9fb',
    position: 'relative',
  },
  homeScrollPage: {
    flex: 1,
  },
  homeScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  homeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  homeMenuBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#eceef0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  homeMenuIcon: {
    fontSize: 22,
    color: '#191c1e',
    fontWeight: 'bold',
  },
  homeAvatarWrap: {
    position: 'relative',
  },
  homeAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  homeAvatarText: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 20,
    fontWeight: '700',
    color: '#0051d5',
  },
  homeAvatarDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#316bf3',
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },
  homeGreetingSection: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  homeGreetingSmall: {
    fontSize: 18,
    color: '#45464d',
    fontWeight: '400',
  },
  homeGreetingName: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 34,
    fontWeight: '700',
    color: '#191c1e',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  homeDeskSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  homeDeskVerifiedIcon: {
    fontSize: 16,
    color: '#0051d5',
  },
  homeDeskSubtitleText: {
    fontSize: 13.5,
    color: '#45464d',
    fontWeight: '500',
  },
  homeStatsRow: {
    marginTop: 10,
  },
  homeStatsPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#eceef0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  homeStatsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0051d5',
  },
  homeStatsText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#191c1e',
  },
  homeCardsSection: {
    gap: 16,
  },
  calendarCard: {
    backgroundColor: '#316bf3',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#316bf3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  calendarCardTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  calendarCardTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  calendarCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  calendarCardDesc: {
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 4,
    lineHeight: 18,
  },
  calendarCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchLedgerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchLedgerCardTag: {
    backgroundColor: '#eceef0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  searchLedgerCardTagText: {
    color: '#45464d',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchLedgerCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191c1e',
    letterSpacing: -0.2,
  },
  searchLedgerCardDesc: {
    fontSize: 13.5,
    color: '#45464d',
    marginTop: 4,
    lineHeight: 18,
  },
  searchLedgerCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f2f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeChamberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    marginBottom: 16,
  },
  homeChamberText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#76777d',
    letterSpacing: 0.8,
  },

  // Floating Bottom Dock Pill Overlay
  floatingDockWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  floatingDockPill: {
    width: 270,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  floatingDockBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDockIcon: {
    fontSize: 22,
  },
  floatingDockCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  floatingDockPlusIcon: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: 'bold',
    lineHeight: 28,
  },

  // --- TOP APPLICATION BAR (FOR NON-HOME TABS) ---
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '700',
  },
  topHeaderCenter: {
    alignItems: 'center',
  },
  topHeaderTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  topHeaderBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  topHeaderBadgeText: {
    color: '#4f46e5',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCaseHeaderBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCaseHeaderPlus: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  addCaseHeaderText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  profileAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIconText: {
    fontSize: 15,
    color: '#ffffff',
  },

  // --- DARK DOCKET CARD (CALENDAR HEADER) ---
  docketCard: {
    backgroundColor: '#0b1329',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 14,
    shadowColor: '#0b1329',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  docketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docketTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docketMonthText: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
  },
  termBadge: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  termBadgeText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  docketNavCapsule: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  docketNavBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  docketNavArrow: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  docketNavDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#334155',
  },
  docketSubText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 14,
  },
  docketWeekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docketDayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 56,
    borderRadius: 10,
  },
  docketDayItemSelected: {
    backgroundColor: '#ffffff',
    width: 42,
    height: 60,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  docketDayLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  docketDayLabelSelected: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  docketDayNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  docketDayNumberSelected: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  selectedDayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f59e0b',
    marginTop: 3,
  },
  hearingIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#60a5fa',
    marginTop: 4,
  },
  hearingEmptyDot: {
    width: 4,
    height: 4,
    marginTop: 4,
  },

  // --- SCHEDULE SECTION HEADER ---
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scheduleTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalBlueBar: {
    width: 3.5,
    height: 16,
    backgroundColor: '#2563eb',
    borderRadius: 2,
    marginRight: 8,
  },
  scheduleTitleText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  scheduleSubtitleText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 11.5,
    marginTop: 2,
  },
  hearingsCountBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hearingsCountDot: {
    width: 6,
    height: 6,
    backgroundColor: '#2563eb',
    borderRadius: 1.5,
  },
  hearingsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },

  // --- SEARCH TAB OXFORD NAVY HEADER ---
  searchOxfordCard: {
    backgroundColor: '#0b1329',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#0b1329',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  searchOxfordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchJusticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchJusticeIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  searchOxfordBrand: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchOxfordSub: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  searchOfflinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  searchOfflineText: {
    fontSize: 10.5,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  searchUserProfileBar: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchUserProfileText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  searchStatsSummary: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // --- SEARCH INPUT & FILTER CHIPS ---
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearSearchText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  filterChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  resultsCountText: {
    fontSize: 12,
    color: '#64748b',
  },
  resetFiltersText: {
    fontSize: 11.5,
    color: '#2563eb',
    fontWeight: '700',
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // --- SEARCH ORDERS CHRONOLOGY ---
  searchOrdersContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginVertical: 6,
  },
  searchOrderRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchOrderHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchOrderDate: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  searchOrderDoneBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  searchOrderPendingBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  searchOrderNotesText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginTop: 3,
  },
  searchOrderAdjournedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e3a8a',
    marginTop: 3,
  },

  // --- HEARING CARDS ---
  hearingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 14,
    marginHorizontal: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pillBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillLightBlue: {
    backgroundColor: '#e0f2fe',
  },
  textBlue: {
    color: '#0369a1',
  },
  pillLightGreen: {
    backgroundColor: '#dcfce7',
  },
  textDarkGreen: {
    color: '#15803d',
  },
  pillLightGray: {
    backgroundColor: '#f1f5f9',
  },
  textDarkGray: {
    color: '#475569',
  },
  pillLightAmber: {
    backgroundColor: '#fef3c7',
  },
  textDarkAmber: {
    color: '#b45309',
  },
  pillUrgentRed: {
    backgroundColor: '#fee2e2',
  },
  textUrgentRed: {
    color: '#b91c1c',
  },
  cardUpdateBtn: {
    marginLeft: 'auto',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  cardUpdateBtnText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },

  // Party Title & Meta
  casePartyNameText: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 4,
  },
  caseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  caseNoBlueText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 12,
  },
  metaBullet: {
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  caseTypeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  caveatLodgedText: {
    color: '#dc2626',
    fontWeight: '700',
  },

  // Last Hearing Row
  lastHearingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  lastHearingIcon: {
    fontSize: 11,
  },
  lastHearingText: {
    color: '#d97706',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // Order Note Box
  orderNoteCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  orderNoteCardBlue: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  orderNoteCardGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dcfce7',
  },
  orderNoteCardRed: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  orderNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  orderNoteIcon: {
    fontSize: 11,
  },
  orderNoteTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  orderTitleSlate: {
    color: '#334155',
  },
  orderTitleGreen: {
    color: '#15803d',
  },
  orderTitleBlue: {
    color: '#1d4ed8',
  },
  orderTitleRed: {
    color: '#be123c',
  },
  orderNoteBodyText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
  },

  // Adjourned Strip
  adjournedStrip: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjournedText: {
    color: '#1e3a8a',
    fontSize: 11.5,
    fontWeight: '600',
  },
  adjournedDateBold: {
    fontWeight: '800',
    color: '#1e3a8a',
  },
  causeListTypeText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
  },

  // Footer Contact & Action Buttons
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  phoneContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  phoneIcon: {
    fontSize: 11,
  },
  phoneNumberText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  clientLabelText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  iconCircleText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  primaryActionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  outlineActionButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  outlineActionText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  darkActionButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  darkActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // --- BOTTOM 5-TAB NAVIGATION (FOR NON-HOME TABS) ---
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 12 : 4,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  bottomNavIcon: {
    fontSize: 18,
    color: '#94a3b8',
  },
  bottomNavIconActive: {
    color: '#2563eb',
  },
  bottomNavLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  bottomNavLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },

  // --- CLIENTS TAB ---
  clientHeaderSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clientHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  clientHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatarSquare: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  clientNameBig: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  clientPhoneSmall: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  callClientBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callClientBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  clientCasesSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  clientCasesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  clientCasePill: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  clientCaseNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  clientCaseParty: {
    fontSize: 11.5,
    color: '#334155',
  },

  // --- PROFILE TAB ---
  profileBigCard: {
    backgroundColor: '#0b1329',
    borderRadius: 20,
    margin: 16,
    padding: 20,
    alignItems: 'center',
  },
  profileBigAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileBigAvatarText: {
    fontSize: 28,
  },
  profileNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileSubText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  barBadgePill: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  barBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93c5fd',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBoxNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  statBoxLabel: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  profileActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileActionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  profileActionMain: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  profileActionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  profileActionChevron: {
    fontSize: 18,
    color: '#94a3b8',
  },
  chamberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  chamberTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chamberAddress: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  chamberContact: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
  },

  // --- EMPTY STATES ---
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  // --- SLIDE-OUT NAVIGATION DRAWER (STITCH SPECIFICATION) ---
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(25, 28, 30, 0.6)',
  },
  drawerSheet: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    height: '100%',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    overflow: 'hidden',
  },
  drawerDismissArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  drawerFloatingCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  drawerFloatingCloseIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  drawerHeaderCard: {
    backgroundColor: '#131b2e',
    paddingTop: Platform.OS === 'android' ? 24 : 32,
    paddingBottom: 16,
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  drawerScalesWatermark: {
    position: 'absolute',
    top: 6,
    right: -6,
    opacity: 0.08,
  },
  drawerScalesWatermarkIcon: {
    fontSize: 90,
    color: '#ffffff',
    lineHeight: 96,
  },
  drawerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    zIndex: 2,
  },
  drawerGavelBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  drawerGavelIcon: {
    fontSize: 20,
    color: '#d3e4fe',
  },
  drawerBrandTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 21,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  drawerBrandSubtitle: {
    fontSize: 11.5,
    color: '#bec6e0',
    marginTop: 1,
    fontWeight: '500',
  },
  drawerProfileDossier: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    zIndex: 2,
  },
  drawerDossierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerInitialsAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#316bf3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  drawerInitialsText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  drawerNameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerAdvocateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  drawerVerifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#316bf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerVerifiedCheck: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  drawerBarAssocText: {
    fontSize: 11.5,
    color: '#bec6e0',
    marginTop: 2,
  },
  drawerDossierBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  drawerEnrollmentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#bec6e0',
  },
  drawerJurisdictionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  drawerJurisdictionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#dae2fd',
  },
  drawerBody: {
    flex: 1,
  },
  drawerBodyContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  drawerSectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#45464d',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 3,
  },
  drawerNavItemActive: {
    backgroundColor: '#dbe1ff',
  },
  drawerNavLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  drawerNavItemIcon: {
    fontSize: 19,
    width: 24,
    textAlign: 'center',
  },
  drawerNavItemIconActive: {
    color: '#0051d5',
  },
  drawerNavItemText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#191c1e',
  },
  drawerNavItemTextActive: {
    fontWeight: '700',
    color: '#0051d5',
  },
  drawerNavChevron: {
    fontSize: 18,
    color: '#76777d',
    fontWeight: '600',
  },
  drawerListedBadge: {
    backgroundColor: '#0051d5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  drawerListedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  drawerCountChip: {
    backgroundColor: '#e6e8ea',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  drawerCountChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#45464d',
  },
  drawerDataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#eceef0',
    marginBottom: 7,
  },
  drawerDataCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  drawerDataIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerDataTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#191c1e',
  },
  drawerDataSubtitle: {
    fontSize: 11.5,
    color: '#45464d',
    marginTop: 1,
  },
  drawerDataTimestamp: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0051d5',
    marginTop: 2,
  },
  drawerDownloadIcon: {
    fontSize: 18,
    color: '#76777d',
  },
  drawerAesChip: {
    backgroundColor: '#e0e3e5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  drawerAesChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#191c1e',
  },
  drawerThemeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  drawerThemeCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  drawerThemeCardSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  drawerBiometricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#eceef0',
    marginBottom: 7,
  },
  drawerBiometricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191c1e',
  },
  drawerTogglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  drawerTogglePillActive: {
    backgroundColor: '#0051d5',
    alignItems: 'flex-end',
  },
  drawerTogglePillInactive: {
    backgroundColor: '#cbd5e1',
    alignItems: 'flex-start',
  },
  drawerToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  drawerToggleThumbActive: {},
  drawerToggleThumbInactive: {},
  drawerFooterContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#f2f4f6',
    borderTopWidth: 1,
    borderColor: '#e0e3e5',
    gap: 8,
  },
  drawerVaultCard: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  drawerVaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0051d5',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  drawerVaultTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#191c1e',
  },
  drawerVaultDesc: {
    fontSize: 11,
    color: '#45464d',
    lineHeight: 15,
    marginTop: 4,
  },
  drawerStatsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  drawerStatBox: {
    flex: 1,
    backgroundColor: '#eceef0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  drawerStatNumber: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#191c1e',
  },
  drawerStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#45464d',
    marginTop: 1,
  },
  drawerLockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  drawerLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  drawerLockIcon: {
    fontSize: 15,
    color: '#ba1a1a',
  },
  drawerLockText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#ba1a1a',
  },
  drawerVersionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#76777d',
  },

  // --- STITCH BOTTOM SHEET: QUICK UPDATE HEARING MODAL ---
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.45)',
    justifyContent: 'flex-end',
  },
  stitchBottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
  },
  sheetDragHandleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d8dadc',
  },
  stitchSheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#e6e8ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stitchSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191c1e',
  },
  stitchSheetSubtitle: {
    fontSize: 13.5,
    color: '#45464d',
    marginTop: 2,
  },
  stitchSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eceef0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchSheetCloseIcon: {
    fontSize: 15,
    color: '#191c1e',
    fontWeight: 'bold',
  },
  stitchSheetScroll: {
    maxHeight: 460,
  },
  stitchContextStrip: {
    backgroundColor: '#eceef0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  stitchContextIcon: {
    fontSize: 15,
    color: '#0051d5',
  },
  stitchContextText: {
    fontSize: 12.5,
    color: '#45464d',
    flex: 1,
    lineHeight: 17,
  },
  stitchFieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191c1e',
    marginBottom: 6,
  },
  stitchTextAreaWrap: {
    borderWidth: 1,
    borderColor: '#c6c6cd',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  stitchTextArea: {
    padding: 12,
    fontSize: 14.5,
    color: '#191c1e',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  quickPhrasesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  quickPhraseChip: {
    backgroundColor: '#f2f4f6',
    borderWidth: 1,
    borderColor: '#e0e3e5',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickPhraseChipText: {
    fontSize: 11,
    color: '#0051d5',
    fontWeight: '600',
  },
  stitchSectionUpperLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#191c1e',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  stitchStatusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  stitchStatusPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eceef0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stitchStatusPillActivePending: {
    backgroundColor: '#dbe1ff',
    borderWidth: 1,
    borderColor: 'rgba(0, 81, 213, 0.35)',
  },
  stitchStatusPillActiveDecreed: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.35)',
  },
  stitchStatusIcon: {
    fontSize: 15,
  },
  stitchStatusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#45464d',
  },
  stitchStatusTextActivePending: {
    color: '#00174b',
    fontWeight: '700',
  },
  stitchStatusTextActiveDecreed: {
    color: '#15803d',
    fontWeight: '700',
  },
  stitchDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stitchDateBox: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stitchCalendarIcon: {
    fontSize: 18,
    color: '#0051d5',
  },
  stitchDateBoxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1e',
  },
  stitchChevronDown: {
    fontSize: 11,
    color: '#76777d',
  },
  stitchTimePill: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c6c6cd',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stitchTimePillText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#191c1e',
  },
  decreedNoticeBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  decreedNoticeIcon: {
    fontSize: 16,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  decreedNoticeText: {
    fontSize: 12.5,
    color: '#166534',
    flex: 1,
  },
  stitchBottomActionTray: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#eceef0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stitchDeleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffdad6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchDeleteIcon: {
    fontSize: 18,
    color: '#ba1a1a',
  },
  stitchCancelBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eceef0',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  stitchCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191c1e',
  },
  stitchPrimaryActionBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0051d5',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.7,
    flexDirection: 'row',
    gap: 6,
  },
  stitchPrimaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  stitchPrimaryActionArrow: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: 'bold',
  },

  // --- MODALS COMMON STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    marginBottom: 8,
    color: '#0f172a',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  // --- DATE PICKER STYLES ---
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerMonthBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerMonthArrow: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  pickerMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerDayHeadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  pickerDayHeaderText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  pickerEmptyCell: {
    width: '14.28%',
    height: 38,
  },
  pickerCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerNumberCircleSelected: {
    backgroundColor: '#2563eb',
  },
  pickerNumberText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  pickerNumberTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // --- DOCUMENT VIEWER PREVIEW ---
  docCardPreview: {
    backgroundColor: '#fffdfa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
  },
  docHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  docSubheaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 4,
  },
  docPartyBig: {
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 8,
  },
  docDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 12,
  },
  docSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  docTextNormal: {
    fontSize: 12,
    color: '#1e293b',
    marginTop: 2,
  },
  docOrderRow: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 6,
  },
  docOrderDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  docOrderText: {
    fontSize: 11.5,
    color: '#334155',
    marginTop: 2,
  },

  // --- ONBOARDING WELCOME MODAL STYLES ---
  onboardingSafeArea: {
    flex: 1,
    backgroundColor: '#f7f9fb',
  },
  onboardingScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  onboardingCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  onboardingIconBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  advocateBandsContainer: {
    alignItems: 'center',
  },
  advocateBandsCollar: {
    width: 44,
    height: 9,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    marginBottom: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  advocateBandsPair: {
    flexDirection: 'row',
    gap: 4,
  },
  advocateBand: {
    width: 15,
    height: 32,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  onboardingTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 25,
    fontWeight: '700',
    color: '#191c1e',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  onboardingTagline: {
    fontSize: 14,
    color: '#45464d',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
    lineHeight: 20,
  },
  onboardingBadgesList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  onboardingBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onboardingBadgeIcon: {
    fontSize: 16,
  },
  onboardingBadgeText: {
    fontSize: 12.5,
    color: '#334155',
    fontWeight: '500',
  },
  onboardingFormWrap: {
    width: '100%',
    marginBottom: 20,
  },
  onboardingInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#45464d',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  onboardingInput: {
    width: '100%',
    height: 50,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: '#191c1e',
  },
  onboardingSubmitBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#316bf3',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#316bf3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingSubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // --- PROFILE EDIT & EXPANDED PROFILE STYLES ---
  editProfilePillBtn: {
    marginTop: 14,
    backgroundColor: '#0051d5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0051d5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  editProfilePillIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editProfilePillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  profileBarAssocText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  chamberCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chamberEditLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0051d5',
  },
  chamberContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chamberContactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chamberContactPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  drawerVersionPill: {
    backgroundColor: '#e0e3e5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  drawerVersionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#191c1e',
  },

  // --- ABOUT APP MODAL STYLES ---
  aboutAppIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  aboutAppName: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
    fontSize: 22,
    fontWeight: '800',
    color: '#191c1e',
    letterSpacing: -0.3,
  },
  aboutAppSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutVersionBadge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  aboutVersionBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  aboutDetailsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginVertical: 14,
  },
  aboutDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutDetailLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  aboutDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  aboutAppDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 16,
  },
  aboutCloseBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutCloseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
