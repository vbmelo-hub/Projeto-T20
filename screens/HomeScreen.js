import { Pressable, Text, TextInput, View } from 'react-native';

import { FilterGlyph } from '../components/Icons';
import SectionHeader from '../components/SectionHeader';
import SpellCard from '../components/SpellCard';
import Surface from '../components/Surface';
import styles from '../styles/commonStyles';

export default function HomeScreen({
  spells,
  query,
  sortAsc,
  activeFilterCount,
  onQueryChange,
  onToggleSort,
  onOpenFilters,
  onOpenSpell,
  onAddSpellToCharacter,
}) {
  return (
    <View>
      <SectionHeader title="Magias" detail={`${spells.length} magia(s) encontrada(s)`} />
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar por nome, descricao ou fonte..."
          style={[styles.input, styles.searchInput]}
        />
        <Pressable onPress={onToggleSort} style={styles.sortButton}>
          <Text style={styles.sortText}>{sortAsc ? 'A-Z' : 'Z-A'}</Text>
        </Pressable>
        <Pressable onPress={onOpenFilters} style={styles.filterButton} accessibilityLabel="Abrir filtros">
          <FilterGlyph />
          {activeFilterCount ? <Text style={styles.filterBadge}>{activeFilterCount}</Text> : null}
        </Pressable>
      </View>
      {spells.length ? null : (
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Nenhuma magia encontrada</Text>
          <Text style={styles.bodyText}>Ajuste a busca ou limpe os filtros para ver mais resultados.</Text>
        </Surface>
      )}
      {spells.map((spell) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          primaryLabel="+"
          primaryA11y="Adicionar a personagem"
          onOpen={() => onOpenSpell(spell)}
          onPrimary={() => onAddSpellToCharacter(spell)}
        />
      ))}
    </View>
  );
}
