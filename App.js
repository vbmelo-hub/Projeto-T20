import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';

import AppModal from './components/AppModal';
import BottomNavigation from './components/BottomNavigation';
import ConfirmDialog from './components/ConfirmDialog';
import Drawer from './components/Drawer';
import Header from './components/Header';
import ScreenRouter from './components/ScreenRouter';
import Toast from './components/Toast';
import useAppController from './hooks/useAppController';
import styles from './styles/commonStyles';

export default function App() {
  const app = useAppController();
  const toastHost = app.confirmDialog
    ? 'confirm'
    : app.drawerOpen
      ? 'drawer'
      : app.modal
        ? 'modal'
        : 'root';

  if (!app.ready) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <Text style={styles.muted}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.app}
      >
        {app.user ? (
          <Header
            onOpenDrawer={() => app.setDrawerOpen(true)}
            onGoHome={() => app.goTo('home')}
            onGoAbout={() => app.goTo('about')}
          />
        ) : null}

        <View style={styles.screenBackground}>
          <ScrollView
            contentContainerStyle={
              app.user && app.view === 'welcome' ? styles.welcomeContent : styles.content
            }
          >
            <ScreenRouter app={app} />
          </ScrollView>
        </View>

        {app.user ? (
          <BottomNavigation
            view={app.view}
            onGoHome={() => app.setView('home')}
            onCreateSpell={() => app.openSpellForm()}
            onGoCharacters={() => app.setView('characters')}
          />
        ) : null}

        <AppModal app={app} notification={toastHost === 'modal' ? app.toast : null} />
        <ConfirmDialog
          dialog={app.confirmDialog}
          onClose={app.closeConfirmDialog}
          onConfirm={app.confirmDialogAction}
          notification={toastHost === 'confirm' ? app.toast : null}
          onToastClose={app.dismissToast}
        />
        <Drawer
          visible={app.drawerOpen}
          onClose={() => app.setDrawerOpen(false)}
          onNavigate={app.goTo}
          onLogout={app.logout}
          notification={toastHost === 'drawer' ? app.toast : null}
          onToastClose={app.dismissToast}
        />
      </KeyboardAvoidingView>
      <Toast
        notification={toastHost === 'root' ? app.toast : null}
        onClose={app.dismissToast}
      />
    </SafeAreaView>
  );
}
