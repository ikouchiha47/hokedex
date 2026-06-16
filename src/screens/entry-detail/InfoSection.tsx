import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { type EntryTagsController, type TagRow } from '../../services/EntryTagsController';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHARACTER_PRESETS: { label: string; color: string }[] = [
  { label: 'Ghost Type',       color: '#735797' },
  { label: 'Red Flag',         color: '#C22E28' },
  { label: 'Toxic',            color: '#A33EA1' },
  { label: 'Hot Mess',         color: '#EE8130' },
  { label: 'Ice Queen/King',   color: '#96D9D6' },
  { label: 'Main Character',   color: '#F95587' },
  { label: 'Mind Games',       color: '#6F35FC' },
  { label: 'Clingy',           color: '#6390F0' },
  { label: 'Painfully Normal', color: '#A8A77A' },
  { label: 'Too Good',         color: '#D685AD' },
  { label: 'Wild Card',        color: '#7AC74C' },
  { label: 'High Maintenance', color: '#E2BF65' },
  { label: 'Dark Academia',    color: '#705746' },
  { label: 'NPC',              color: '#B7B7CE' },
];

const CHARACTER_COLOR: Record<string, string> = Object.fromEntries(
  CHARACTER_PRESETS.map(p => [p.label, p.color]),
);

const RELATIONSHIP_PRESETS = ['Complicated', 'Ex', 'Best Friend', 'Crush', 'FWB', 'Family'];

const SOCIAL_PLATFORMS = ['Instagram', 'X', 'LinkedIn', 'TikTok', 'Snapchat', 'Reddit', 'Discord', 'Other'];

// ── Props ─────────────────────────────────────────────────────────────────────

export type InfoSectionProps = {
  controller: EntryTagsController;
  tags: TagRow[];
  onTagsChange: () => void;
};

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Chip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Text style={[styles.chipX, { color }]}>×</Text>
      </Pressable>
    </View>
  );
}

function AddToggle({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.addBtn} onPress={onPress}>
      <Text style={styles.addBtnText}>{expanded ? '− Less' : '+ Add'}</Text>
    </Pressable>
  );
}

function ExpandPanel({ children }: { children: React.ReactNode }) {
  return <View style={styles.expandPanel}>{children}</View>;
}

function PresetChips({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {items.map(p => (
        <Pressable key={p} style={styles.preset} onPress={() => onSelect(p)}>
          <Text style={styles.presetText}>{p}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CustomInput({ value, onChange, placeholder, onSubmit }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.customRow}>
      <TextInput
        style={styles.customInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#444"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <Pressable style={styles.customAddBtn} onPress={onSubmit}>
        <Text style={styles.customAddBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

// ── Character ─────────────────────────────────────────────────────────────────

function CharacterRow({ controller, tags, onTagsChange }: InfoSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [custom, setCustom] = useState('');

  const saved = tags.filter(t => t.key === 'character');
  const savedValues = new Set(saved.map(t => t.value));
  const remaining = CHARACTER_PRESETS.filter(p => !savedValues.has(p.label));

  function add(value: string) {
    controller.addCharacterTag(value);
    onTagsChange();
  }

  function addCustom() {
    const val = custom.trim();
    if (!val) return;
    add(val);
    setCustom('');
  }

  return (
    <View style={styles.row}>
      <SectionLabel label="CHARACTER" />
      <View style={styles.chips}>
        {saved.map(t => {
          const color = CHARACTER_COLOR[t.value] ?? '#a78bfa';
          return (
            <Chip key={t.id} label={t.value} color={color}
              onRemove={() => { controller.removeTag(t.id); onTagsChange(); }} />
          );
        })}
        <AddToggle expanded={expanded} onPress={() => setExpanded(v => !v)} />
      </View>
      {expanded && (
        <ExpandPanel>
          <View style={styles.chips}>
            {remaining.map(p => (
              <Pressable key={p.label} style={[styles.preset, { borderColor: p.color }]} onPress={() => add(p.label)}>
                <Text style={[styles.presetText, { color: p.color }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <CustomInput value={custom} onChange={setCustom} placeholder="Custom type…" onSubmit={addCustom} />
        </ExpandPanel>
      )}
    </View>
  );
}

// ── Relationship ──────────────────────────────────────────────────────────────

function RelationshipRow({ controller, tags, onTagsChange }: InfoSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [custom, setCustom] = useState('');

  const saved = tags.filter(t => t.key === 'relationship');
  const savedValues = new Set(saved.map(t => t.value));
  const remaining = RELATIONSHIP_PRESETS.filter(p => !savedValues.has(p));

  function add(value: string) {
    controller.setRelationship(value);
    onTagsChange();
    setExpanded(false);
  }

  function addCustom() {
    const val = custom.trim();
    if (!val) return;
    add(val);
    setCustom('');
  }

  return (
    <View style={styles.row}>
      <SectionLabel label="RELATIONSHIP" />
      <View style={styles.chips}>
        {saved.map(t => (
          <Chip key={t.id} label={t.value} color="#f472b6"
            onRemove={() => { controller.removeTag(t.id); onTagsChange(); }} />
        ))}
        <AddToggle expanded={expanded} onPress={() => setExpanded(v => !v)} />
      </View>
      {expanded && (
        <ExpandPanel>
          <PresetChips items={remaining} onSelect={v => add(v)} />
          <CustomInput value={custom} onChange={setCustom} placeholder="Custom…" onSubmit={addCustom} />
        </ExpandPanel>
      )}
    </View>
  );
}

// ── Socials ───────────────────────────────────────────────────────────────────

function SocialsRow({ controller, tags, onTagsChange }: InfoSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [handle, setHandle] = useState('');

  const saved = tags.filter(t => t.key === 'social');

  function parseSocial(value: string) {
    const idx = value.indexOf(':');
    return idx === -1
      ? { platform: value, handle: '' }
      : { platform: value.slice(0, idx), handle: value.slice(idx + 1) };
  }

  function save() {
    const h = handle.trim();
    if (!h || !platform) return;
    controller.setSocial(platform, h);
    onTagsChange();
    setHandle('');
    setPlatform(null);
    setExpanded(false);
  }

  return (
    <View style={styles.row}>
      <SectionLabel label="SOCIALS" />
      <View style={styles.chips}>
        {saved.map(t => {
          const p = parseSocial(t.value);
          return (
            <Chip key={t.id} label={`${p.platform}: ${p.handle}`} color="#34d399"
              onRemove={() => { controller.removeSocial(t.id); onTagsChange(); }} />
          );
        })}
        <AddToggle expanded={expanded} onPress={() => { setExpanded(v => !v); setPlatform(null); setHandle(''); }} />
      </View>
      {expanded && (
        <ExpandPanel>
          {!platform
            ? <PresetChips items={SOCIAL_PLATFORMS} onSelect={p => setPlatform(p)} />
            : (
              <View style={styles.customRow}>
                <Text style={styles.platformLabel}>{platform}</Text>
                <TextInput
                  style={styles.customInput}
                  value={handle}
                  onChangeText={setHandle}
                  placeholder="handle or URL"
                  placeholderTextColor="#444"
                  returnKeyType="done"
                  autoFocus
                  onSubmitEditing={save}
                />
                <Pressable style={styles.customAddBtn} onPress={save}>
                  <Text style={styles.customAddBtnText}>+</Text>
                </Pressable>
              </View>
            )}
        </ExpandPanel>
      )}
    </View>
  );
}

// ── Location ──────────────────────────────────────────────────────────────────

function LocationRow({ controller, tags, onTagsChange }: InfoSectionProps) {
  const [input, setInput] = useState('');

  const saved = tags.filter(t => t.key === 'location');

  function save() {
    const val = input.trim();
    if (!val) return;
    controller.setLocation(val);
    onTagsChange();
    setInput('');
  }

  return (
    <View style={styles.row}>
      <SectionLabel label="LOCATION" />
      <View style={styles.chips}>
        {saved.map(t => (
          <Chip key={t.id} label={t.value} color="#fb923c"
            onRemove={() => { controller.removeTag(t.id); onTagsChange(); }} />
        ))}
      </View>
      <View style={{ marginTop: 6 }}>
        <CustomInput value={input} onChange={setInput} placeholder="City or paste place URL…" onSubmit={save} />
      </View>
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function InfoSection(props: InfoSectionProps) {
  return (
    <View>
      <CharacterRow {...props} />
      <RelationshipRow {...props} />
      <SocialsRow {...props} />
      <LocationRow {...props} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  chipText: {
    fontSize: 13,
  },
  chipX: {
    fontSize: 15,
    lineHeight: 16,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addBtnText: {
    color: '#555',
    fontSize: 12,
  },
  expandPanel: {
    marginTop: 10,
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  preset: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presetText: {
    color: '#666',
    fontSize: 12,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  platformLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 70,
  },
  customInput: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 13,
    borderBottomWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 6,
  },
  customAddBtn: {
    padding: 6,
  },
  customAddBtnText: {
    color: '#7c3aed',
    fontSize: 20,
    fontWeight: '300',
  },
});
