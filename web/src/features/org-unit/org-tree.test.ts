import { EMPTY_ORG, orgStructure, unitId } from '@/test/org-unit-fixtures';
import { ancestorIds, buildTree, countMatches, filterTree, findNode, normalize, parentIds, ROOT_ID, type OrgNode } from './org-tree';

const root = buildTree(orgStructure({ filled: true }));
const names = (node: OrgNode | null): string[] => (node ? [node.name, ...node.children.flatMap(names)] : []);
const mutedNames = (node: OrgNode | null): string[] => (node ? [...(node.muted ? [node.name] : []), ...node.children.flatMap(mutedNames)] : []);

describe('buildTree', () => {
  it('nests the flat list under the company node in the API order', () => {
    expect(root).toMatchObject({ id: ROOT_ID, code: null, type: 'COMPANY', parentId: null, active: true, headcountTotal: 186 });
    expect(root.children.map((unit) => unit.code)).toEqual(['PTPM', 'DVKH', 'KD', 'HCNS', 'TCKT', 'CNDN']);
    expect(root.children[0]!.parentId).toBe(ROOT_ID);
    const branch = findNode(root, unitId('CNDN'))!;
    expect(branch.children.map((unit) => unit.code)).toEqual(['PMDN', 'KTDN']);
    expect(branch.children[0]!.children.map((unit) => unit.code)).toEqual(['WEBDN', 'MOBDN']);
    expect(findNode(root, unitId('WEBDN'))!.parentId).toBe(unitId('PMDN'));
  });

  it('builds a lone company node when there are no units', () => {
    expect(buildTree(EMPTY_ORG).children).toEqual([]);
  });

  it('finds no node for an unknown id and lists the nodes that can expand', () => {
    expect(findNode(root, 'nope')).toBeUndefined();
    expect(findNode(root, null)).toBeUndefined();
    expect(parentIds(root)).toEqual([ROOT_ID, unitId('PTPM'), unitId('DVKH'), unitId('KD'), unitId('CNDN'), unitId('PMDN')]);
  });

  it('lists the nodes above a unit, nearest first', () => {
    expect(ancestorIds(root, unitId('WEBDN'))).toEqual([unitId('PMDN'), unitId('CNDN'), ROOT_ID]);
    expect(ancestorIds(root, ROOT_ID)).toEqual([]);
    expect(ancestorIds(root, 'nope')).toEqual([]);
  });

  it('counts the nodes that match a search, not the ancestors kept for context', () => {
    expect(countMatches(filterTree(root, { query: 'mobile', showInactive: true }))).toBe(2);
    expect(countMatches(filterTree(root, { query: 'thiết kế', showInactive: true }))).toBe(0);
    expect(countMatches(filterTree(root, { query: '', showInactive: true }))).toBe(21);
  });
});

describe('normalize', () => {
  it('drops case and Vietnamese diacritics', () => {
    expect(normalize('  Chi nhánh Đà Nẵng ')).toBe('chi nhanh da nang');
    expect(normalize('Kiểm thử')).toBe('kiem thu');
  });
});

describe('filterTree', () => {
  it('returns the whole tree without a query', () => {
    expect(names(filterTree(root, { query: '', showInactive: true }))).toHaveLength(21);
    expect(mutedNames(filterTree(root, { query: '  ', showInactive: true }))).toEqual([]);
  });

  it('keeps matches by name and their ancestors, the ancestors muted', () => {
    const result = filterTree(root, { query: 'MOBILE', showInactive: true });
    expect(names(result)).toEqual([
      'Công ty Cổ phần Công nghệ Mẫu',
      'Phòng Phát triển phần mềm',
      'Nhóm Mobile',
      'Chi nhánh Đà Nẵng',
      'Phòng Phần mềm Đà Nẵng',
      'Nhóm Mobile Đà Nẵng',
    ]);
    expect(mutedNames(result)).toEqual(['Công ty Cổ phần Công nghệ Mẫu', 'Phòng Phát triển phần mềm', 'Chi nhánh Đà Nẵng', 'Phòng Phần mềm Đà Nẵng']);
  });

  it('matches without diacritics and by code', () => {
    expect(names(filterTree(root, { query: 'kiem thu', showInactive: true }))).toEqual([
      'Công ty Cổ phần Công nghệ Mẫu',
      'Phòng Phát triển phần mềm',
      'Nhóm Kiểm thử',
      'Chi nhánh Đà Nẵng',
      'Phòng Kiểm thử Đà Nẵng',
    ]);
    expect(names(filterTree(root, { query: 'hcns', showInactive: true }))).toEqual(['Công ty Cổ phần Công nghệ Mẫu', 'Phòng Hành chính - Nhân sự']);
  });

  it('does not keep the children of a match that do not match themselves', () => {
    expect(names(filterTree(root, { query: 'kinh doanh', showInactive: true }))).toEqual([
      'Công ty Cổ phần Công nghệ Mẫu',
      'Phòng Kinh doanh',
      'Nhóm Kinh doanh giải pháp',
    ]);
  });

  it('returns null when nothing matches', () => {
    expect(filterTree(root, { query: 'thiết kế', showInactive: true })).toBeNull();
  });

  it('hides inactive units when the toggle is off, also from search', () => {
    expect(names(filterTree(root, { query: '', showInactive: false }))).not.toContain('Nhóm Game');
    expect(names(filterTree(root, { query: '', showInactive: false }))).toHaveLength(20);
    expect(filterTree(root, { query: 'game', showInactive: false })).toBeNull();
    expect(names(filterTree(root, { query: 'game', showInactive: true }))).toContain('Nhóm Game');
  });

  it('keeps an inactive unit that still has an active unit below it', () => {
    const structure = orgStructure();
    const withInactiveParent = { ...structure, units: structure.units.map((unit) => (unit.code === 'KD' ? { ...unit, active: false } : unit)) };
    const result = filterTree(buildTree(withInactiveParent), { query: '', showInactive: false });
    expect(names(result)).toEqual(expect.arrayContaining(['Phòng Kinh doanh', 'Nhóm Marketing']));
  });

  it('keeps the company node of an empty company', () => {
    expect(names(filterTree(buildTree(EMPTY_ORG), { query: '', showInactive: false }))).toEqual(['Công ty Cổ phần Công nghệ Mẫu']);
  });
});
