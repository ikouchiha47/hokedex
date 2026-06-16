import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { type Note, type NoteLocation } from '../../db/types';

export type NotesTimelineSectionProps = {
  entryId: string;
  notes: Note[];
  onAddNote: (body: string, location?: NoteLocation) => void;
  onDeleteNote: (noteId: string) => void;
};

const PAGE_SIZE = 5;

type NoteGroup = { dayLabel: string; dayTs: number; notes: Note[] };

function groupByDay(notes: Note[]): NoteGroup[] {
  const groups = new Map<string, NoteGroup>();
  for (const note of notes) {
    const d = new Date(note.createdAt);
    const label = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
    if (!groups.has(label)) {
      groups.set(label, { dayLabel: label, dayTs: note.createdAt, notes: [] });
    }
    groups.get(label)!.notes.push(note);
  }
  return Array.from(groups.values());
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function openMap(geohash: string): void {
  Linking.openURL(`https://maps.google.com/?q=${geohash}`);
}

export function NotesTimelineSection({ notes, onAddNote, onDeleteNote }: NotesTimelineSectionProps): React.JSX.Element {
  const [body, setBody] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const grouped = groupByDay(notes);
  const totalNotes = notes.length;
  const visibleGroups = expanded ? grouped : truncateGroups(grouped, PAGE_SIZE);
  const hasMore = !expanded && totalNotes > PAGE_SIZE;

  function submit(): void {
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddNote(trimmed);
    setBody('');
  }

  function confirmDelete(noteId: string): void {
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteNote(noteId) },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Notes</Text>

      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder="Add a note…"
            placeholderTextColor="#444"
            returnKeyType="send"
            onSubmitEditing={submit}
            blurOnSubmit={false}
          />
          <Pressable style={styles.sendBtn} onPress={submit}>
            <Text style={styles.sendTxt}>+</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {visibleGroups.length === 0 && (
        <Text style={styles.empty}>No notes yet.</Text>
      )}

      {visibleGroups.map((group, gi) => (
        <View key={group.dayLabel} style={styles.dayBlock}>
          {/* Day dot + label */}
          <View style={styles.dayHeader}>
            <View style={styles.dayDot} />
            <Text style={styles.dayLabel}>{group.dayLabel}</Text>
          </View>

          {/* Notes under this day */}
          {group.notes.map((note, ni) => {
            return (
              <View key={note.id} style={styles.noteEntry}>
                {/* Vertical line */}
                <View style={styles.lineCol}>
                  <View style={styles.line} />
                </View>

                {/* Content */}
                <Pressable
                  style={styles.noteContent}
                  onLongPress={() => confirmDelete(note.id)}
                >
                  <Text style={styles.timeText}>{formatTime(note.createdAt)}</Text>
                  <Text style={styles.bodyText}>{note.body}</Text>
                  {note.locationLabel && (
                    <Pressable
                      style={styles.locationChip}
                      onPress={() => note.locationGeohash && openMap(note.locationGeohash)}
                    >
                      <Text style={styles.locationText}>📍 {note.locationLabel}</Text>
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      {hasMore && (
        <Pressable style={styles.expandRow} onPress={() => setExpanded(true)}>
          <View style={styles.expandDot} />
          <Text style={styles.expandText}>Show all {totalNotes} notes</Text>
        </Pressable>
      )}
    </View>
  );
}

function truncateGroups(groups: NoteGroup[], limit: number): NoteGroup[] {
  const result: NoteGroup[] = [];
  let count = 0;
  for (const group of groups) {
    if (count >= limit) break;
    const slice = group.notes.slice(0, limit - count);
    result.push({ ...group, notes: slice });
    count += slice.length;
  }
  return result;
}

const DOT = 10;
const LINE_LEFT = 4; // offset from left edge of lineCol to center of line

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  heading: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
    marginBottom: 20,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 14,
    paddingVertical: 14,
    fontStyle: 'italic',
  },
  sendBtn: {
    paddingLeft: 10,
    paddingVertical: 14,
  },
  sendTxt: {
    color: '#7c3aed',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  empty: {
    color: '#444',
    fontSize: 13,
    paddingVertical: 8,
  },
  dayBlock: {
    marginBottom: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
  },
  dayDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: '#7c3aed',
    marginLeft: LINE_LEFT - DOT / 2 + 1,
  },
  dayLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  noteEntry: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  lineCol: {
    width: 20,
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  line: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#333',
    marginLeft: LINE_LEFT,
  },
  noteContent: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 14,
  },
  timeText: {
    color: '#555',
    fontSize: 11,
    marginBottom: 3,
  },
  bodyText: {
    color: '#d0d0d0',
    fontSize: 14,
    lineHeight: 20,
  },
  locationChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationText: {
    color: '#a78bfa',
    fontSize: 12,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  expandDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: '#444',
    marginLeft: LINE_LEFT - DOT / 2 + 1,
  },
  expandText: {
    color: '#7c3aed',
    fontSize: 13,
  },
});
