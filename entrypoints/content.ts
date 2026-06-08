import { createRoot, type Root } from 'react-dom/client'
import { createElement, useState, useEffect } from 'react'
import { lookupWord } from '../lib/dictionary-service'
import { saveWord } from '../lib/vocab-storage'
import { DefinitionPopup } from '../lib/components/DefinitionPopup'
import type { WordDefinition, NotFound, Loading } from '../lib/types'
// @ts-expect-error — ?inline returns CSS string, not a module
import styles from '../lib/popup-styles.css?inline'

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',

  main() {
    let shadowHost: HTMLElement | null = null
    let shadowRoot: ShadowRoot | null = null
    let reactRoot: Root | null = null
    let underlineSpan: HTMLSpanElement | null = null

    function getSurroundingSentence(selection: Selection): string {
      const range = selection.getRangeAt(0)
      const text = range.startContainer.textContent ?? ''
      const offset = range.startOffset
      const start = Math.max(0, text.lastIndexOf('.', offset - 1) + 1)
      const end = text.indexOf('.', offset + range.toString().length)
      return text.slice(start, end === -1 ? undefined : end + 1).trim()
    }

    function removeUnderline() {
      if (underlineSpan && underlineSpan.parentNode) {
        const parent = underlineSpan.parentNode
        while (underlineSpan.firstChild) {
          parent.insertBefore(underlineSpan.firstChild, underlineSpan)
        }
        parent.removeChild(underlineSpan)
      }
      underlineSpan = null
    }

    function addUnderline(selection: Selection) {
      removeUnderline()
      const range = selection.getRangeAt(0).cloneRange()
      const span = document.createElement('span')
      span.style.textDecoration = 'underline'
      span.style.textDecorationColor = '#6366f1'
      span.style.textDecorationThickness = '2px'
      span.style.textUnderlineOffset = '2px'
      try {
        range.surroundContents(span)
        underlineSpan = span
      } catch {
        // surroundContents can fail on complex selections — skip silently
      }
    }

    function closePopup() {
      removeUnderline()
      if (shadowHost?.parentNode) {
        shadowHost.parentNode.removeChild(shadowHost)
      }
      shadowHost = null
      shadowRoot = null
      reactRoot = null
    }

    function PopupWrapper({ word, url, sentence }: { word: string; url: string; sentence: string }) {
      const [popupState, setPopupState] = useState<WordDefinition | NotFound | Loading>({ type: 'loading' })
      const [saved, setSaved] = useState(false)

      useEffect(() => {
        lookupWord(word).then(setPopupState)
      }, [word])

      function handleSave() {
        if ('type' in popupState) return
        saveWord(popupState, { url, sentence }).then(() => setSaved(true))
      }

      return createElement(DefinitionPopup, { state: popupState, onSave: handleSave, saved })
    }

    function mountPopup(word: string, x: number, y: number, url: string, sentence: string) {
      closePopup()

      shadowHost = document.createElement('div')
      shadowHost.id = 'dictionary-ext-root'
      Object.assign(shadowHost.style, {
        position: 'fixed',
        left: `${Math.min(x, window.innerWidth - 300)}px`,
        top: `${y + 8}px`,
        zIndex: '2147483647',
      })
      document.body.appendChild(shadowHost)

      shadowRoot = shadowHost.attachShadow({ mode: 'open' })

      const style = document.createElement('style')
      style.textContent = styles as string
      shadowRoot.appendChild(style)

      const container = document.createElement('div')
      shadowRoot.appendChild(container)

      reactRoot = createRoot(container)
      reactRoot.render(createElement(PopupWrapper, { word, url, sentence }))
    }

    document.addEventListener('mouseup', async (e) => {
      // Ignore clicks inside our own popup
      if (shadowHost?.contains(e.target as Node)) return

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (!text) return

      const words = text.split(/\s+/).filter(Boolean)
      if (words.length > 3) return

      const word = text
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      addUnderline(selection)

      const sentence = getSurroundingSentence(selection)
      mountPopup(word, rect.left, rect.bottom, document.location.href, sentence)
    })

    document.addEventListener('mousedown', (e) => {
      if (!shadowHost) return
      if (!shadowHost.contains(e.target as Node)) {
        closePopup()
      }
    })
  },
})
