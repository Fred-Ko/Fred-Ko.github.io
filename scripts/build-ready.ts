import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
// Astro와 검색 인덱스가 모두 만들어진 뒤에만 미리보기에 갱신을 알린다.
await writeFile('dist/.build-ready',randomUUID());
