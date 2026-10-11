import { looksLikeOtio, OTIO_EXTENSION, parseOtio } from './otio'
import { parseTemplateFile, TEMPLATE_FILE_EXTENSION, type ParsedTemplateFile } from './templateFile'

/** File types the Import button accepts: Spool template files and OpenTimelineIO timelines from any editor. */
export const IMPORT_ACCEPT = `${TEMPLATE_FILE_EXTENSION},${OTIO_EXTENSION},application/json`

/** Read an imported file by its content, so a renamed or extension-less file still opens correctly. */
export function parseImportFile(text: string): ParsedTemplateFile {
  return looksLikeOtio(text) ? parseOtio(text) : parseTemplateFile(text)
}
