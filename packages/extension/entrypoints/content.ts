import { createRoot, type Root } from 'react-dom/client'
import { createElement, useState, useEffect } from 'react'
import { lookupWord } from '../lib/dictionary-service'
import { saveWord } from '../lib/vocab-storage'
import { hasSession } from '../lib/auth'
import { loginUrl } from '../lib/web-app-url'
import { DefinitionPopup } from '../lib/components/DefinitionPopup'
import type { WordDefinition, NotFound, Loading } from '@dictionary/shared'
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

    function PopupWrapper({ word, url }: { word: string; url: string }) {
      const [popupState, setPopupState] = useState<WordDefinition | NotFound | Loading>({ type: 'loading' })
      const [saved, setSaved] = useState(false)
      const [signedIn, setSignedIn] = useState(false)
      const [signingIn, setSigningIn] = useState(false)

      useEffect(() => {
        lookupWord(word).then(setPopupState)
      }, [word])

      useEffect(() => {
        hasSession().then(setSignedIn)

        // The session is minted on the web app and handed back into
        // chrome.storage.local by the bridge. Re-check on any storage change so
        // Save appears here without the user re-selecting the word.
        function onStorageChanged() {
          hasSession().then(setSignedIn)
        }
        chrome.storage.onChanged.addListener(onStorageChanged)
        return () => chrome.storage.onChanged.removeListener(onStorageChanged)
      }, [])

      function handleSave() {
        if ('type' in popupState) return
        saveWord(popupState, { url, sentence: '' }).then(() => setSaved(true))
      }

      // Content scripts can't open tabs via chrome.tabs, so open the web app
      // login in a new tab from the page. After the user signs in there, the
      // bridge syncs the session back and the storage listener reveals Save.
      function handleSignIn() {
        setSigningIn(true)
        window.open(loginUrl(), '_blank')
      }

      return createElement(DefinitionPopup, {
        state: popupState,
        onSave: handleSave,
        saved,
        signedIn,
        onSignIn: handleSignIn,
        signingIn,
      })
    }

    function mountPopup(word: string, x: number, y: number, url: string) {
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
      reactRoot.render(createElement(PopupWrapper, { word, url }))
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

      mountPopup(word, rect.left, rect.bottom, document.location.href)
    })

    document.addEventListener('mousedown', (e) => {
      if (!shadowHost) return
      if (!shadowHost.contains(e.target as Node)) {
        closePopup()
      }
    })
  },
})
