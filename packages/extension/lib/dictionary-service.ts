// The dictionary lookup now lives in @dictionary/shared so the extension,
// web app, and Raycast extension share one implementation. Re-exported here
// to keep existing extension imports stable.
export { lookupWord } from '@dictionary/shared'
