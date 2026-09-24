import type { Problem } from './types';
import { motionProblems } from './data/motion';
import { editProblems } from './data/edit';
import { insertProblems } from './data/insert';
import { textObjectProblems } from './data/textobject';
import { visualProblems } from './data/visual';
import { searchProblems } from './data/search';
import { exProblems } from './data/ex';
import { advancedProblems } from './data/advanced';

export const allProblems: Problem[] = [
  ...motionProblems,
  ...editProblems,
  ...insertProblems,
  ...textObjectProblems,
  ...visualProblems,
  ...searchProblems,
  ...exProblems,
  ...advancedProblems,
];

export const problemById = new Map(allProblems.map((p) => [p.id, p]));
