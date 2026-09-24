// Verifica la sintaxis del Apps Script (no se puede ejecutar fuera de Google).
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const file = new URL('../apps-script/Code.gs', import.meta.url)
try {
  new vm.Script(readFileSync(file, 'utf8'), { filename: 'Code.gs' })
  console.log('apps-script/Code.gs: sintaxis OK')
} catch (err) {
  console.error(err)
  process.exit(1)
}
