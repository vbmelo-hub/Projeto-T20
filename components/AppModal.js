import CharacterFormModal from './modals/CharacterFormModal';
import CharacterPickerModal from './modals/CharacterPickerModal';
import FilterModal from './modals/FilterModal';
import SpellDetailsModal from './modals/SpellDetailsModal';
import SpellFormModal from './modals/SpellFormModal';
import ModalShell from './ModalShell';

export default function AppModal({ app }) {
  return (
    <ModalShell visible={Boolean(app.modal)} onClose={app.closeModal}>
      {app.modal === 'spell' && app.selectedSpell ? (
        <SpellDetailsModal
          spell={app.selectedSpell}
          characterLink={app.selectedCharacterLink}
          onTogglePrepared={app.togglePrepared}
          onAddToCharacter={app.openPickerForSpell}
          onEdit={app.openSpellForm}
          onClose={app.closeModal}
        />
      ) : null}
      {app.modal === 'picker' && app.selectedSpell ? (
        <CharacterPickerModal
          availableCharacters={app.availableCharacters}
          hasCharacters={app.userCharacters.length > 0}
          spell={app.selectedSpell}
          onSelect={app.linkSpellToCharacter}
          onCreateCharacter={() => app.openCharacterForm()}
          onClose={app.closeModal}
        />
      ) : null}
      {app.modal === 'filters' ? (
        <FilterModal
          filters={app.draftFilters}
          options={app.filterOptions}
          onChange={app.applyFilter}
          onClear={app.clearFilters}
          onSubmit={app.submitFilters}
          onClose={app.closeModal}
        />
      ) : null}
      {app.modal === 'character' ? (
        <CharacterFormModal
          editing={Boolean(app.selectedCharacter)}
          form={app.characterForm}
          onFieldChange={app.updateCharacterField}
          onPickPhoto={app.pickCharacterPhoto}
          onRequestRemovePhoto={app.requestRemoveCharacterPhoto}
          onSave={app.saveCharacter}
          onClose={app.closeModal}
        />
      ) : null}
      {app.modal === 'spell-form' ? (
        <SpellFormModal
          editing={Boolean(app.selectedSpell)}
          form={app.spellForm}
          onFieldChange={app.updateSpellField}
          onSave={app.saveSpell}
          onClose={app.closeModal}
        />
      ) : null}
    </ModalShell>
  );
}
