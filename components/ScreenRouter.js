import AboutScreen from '../screens/AboutScreen';
import CharacterDetailsScreen from '../screens/CharacterDetailsScreen';
import CharactersScreen from '../screens/CharactersScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

export default function ScreenRouter({ app }) {
  if (!app.user) {
    return (
      <LoginScreen
        authMode={app.authMode}
        form={app.authForm}
        onFieldChange={app.updateAuthField}
        onSubmit={app.submitAuth}
        onToggleMode={app.toggleAuthMode}
      />
    );
  }

  if (app.view === 'welcome') return <WelcomeScreen />;

  if (app.view === 'home') {
    return (
      <HomeScreen
        spells={app.visibleSpells}
        query={app.query}
        sortAsc={app.sortAsc}
        activeFilterCount={app.activeFilterCount}
        onQueryChange={app.setQuery}
        onToggleSort={() => app.setSortAsc((current) => !current)}
        onOpenFilters={app.openFilters}
        onOpenSpell={app.openSpellDetails}
        onAddSpellToCharacter={app.openPickerForSpell}
      />
    );
  }

  if (app.view === 'character' && app.selectedCharacter) {
    return (
      <CharacterDetailsScreen
        character={app.selectedCharacter}
        spells={app.activeCharacterSpells}
        onOpenSpell={app.openSpellDetails}
        onTogglePrepared={app.togglePrepared}
        onRequestRemoveSpell={app.requestRemoveSpell}
        onLearnSpell={() => app.setView('home')}
      />
    );
  }

  if (app.view === 'characters' || app.view === 'character') {
    return (
      <CharactersScreen
        characters={app.userCharacters}
        spellCounts={app.spellCounts}
        onCreate={() => app.openCharacterForm()}
        onOpen={app.openCharacter}
        onAddSpell={app.addSpellForCharacter}
        onEdit={app.openCharacterForm}
        onRequestDelete={app.requestDeleteCharacter}
      />
    );
  }

  if (app.view === 'about') return <AboutScreen />;

  return null;
}
