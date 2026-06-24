// Verifica que todo tutorial con versión `es` tenga también el resto de idiomas
// soportados (SPEC-0009 + SPEC-0014). Sale con código 1 si falta alguna traducción.
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCALES = ['es', 'ca', 'eu', 'en', 'gl', 'pt', 'fr'];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'doc', 'tutoriales');

function features() {
  return readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory());
}

function slugs(feature, locale) {
  const dir = join(ROOT, feature, locale);
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

const missing = [];
let baseCount = 0;

for (const feature of features()) {
  for (const slug of slugs(feature, 'es')) {
    baseCount += 1;
    for (const locale of LOCALES) {
      if (!slugs(feature, locale).includes(slug)) {
        missing.push(`${feature}/${locale}/${slug}`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error(`Faltan ${missing.length} traducciones:`);
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(`Paridad OK: ${baseCount} tutoriales x ${LOCALES.length} idiomas = ${baseCount * LOCALES.length} ficheros.`);
