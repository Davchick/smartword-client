import type { WordGroup } from '../hooks/useGroups';
import { pluralizeRu } from '../lib/pluralizeRu';

const WORD_FORMS: [string, string, string] = ['слово', 'слова', 'слов'];

/**
 * Возвращает количество активных (неархивных) слов в группе.
 * learned_count = слова с correct_count >= ARCHIVE_THRESHOLD
 */
export const getActiveCount = (group: WordGroup): number =>
  Math.max(0, group.word_count - (group.learned_count ?? 0));

/**
 * Формирует локализованную строку вида "5 слов", "3 слова", "1 слово".
 */
export const formatWordCount = (count: number): string =>
  `${count} ${pluralizeRu(count, WORD_FORMS)}`;

/**
 * Полная метка: "5 слов" — для accessibilityLabel.
 */
export const formatGroupLabel = (group: WordGroup): string =>
  `Словарь ${group.name}, ${formatWordCount(getActiveCount(group))}`;
