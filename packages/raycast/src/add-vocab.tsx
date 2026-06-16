import { useState } from "react"
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api"
import { usePromise } from "@raycast/utils"
import { lookupWord } from "@dictionary/shared"
import type { WordDefinition } from "@dictionary/shared"
import { getSession, signIn, signOut } from "./lib/auth"
import { getEntry, saveWord } from "./lib/vocab"

type LookupState =
  | { kind: "not-found"; word: string }
  | { kind: "found"; definition: WordDefinition; alreadySaved: boolean }

function renderPreview(d: WordDefinition): string {
  const parts = [`# ${d.word}`, "", `*${d.partOfSpeech}*`, "", d.definition]
  if (d.example) parts.push("", `> ${d.example}`)
  return parts.join("\n")
}

async function handleSave(definition: WordDefinition, sentence: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" })
  try {
    await saveWord(definition, sentence)
    toast.style = Toast.Style.Success
    toast.title = `Saved "${definition.word}"`
  } catch (error) {
    toast.style = Toast.Style.Failure
    toast.title = "Failed to save"
    toast.message = error instanceof Error ? error.message : String(error)
  }
}

function SentenceForm({ definition }: { definition: WordDefinition }) {
  const { pop } = useNavigation()
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save with Sentence"
            onSubmit={async (values: { sentence: string }) => {
              await handleSave(definition, values.sentence ?? "")
              pop()
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Adding "${definition.word}" to your vocab bank.`} />
      <Form.TextArea
        id="sentence"
        title="Example sentence"
        placeholder="Optional — a sentence where you saw this word"
      />
    </Form>
  )
}

export default function AddVocabCommand() {
  const [searchText, setSearchText] = useState("")

  const {
    data: session,
    isLoading: authLoading,
    revalidate: revalidateAuth,
  } = usePromise(getSession)
  const signedIn = !!session

  const { data, isLoading: lookupLoading } = usePromise(
    async (text: string, isSignedIn: boolean): Promise<LookupState | null> => {
      const trimmed = text.trim()
      if (!trimmed) return null

      const result = await lookupWord(trimmed)
      if ("type" in result) return { kind: "not-found", word: trimmed }

      let alreadySaved = false
      if (isSignedIn) {
        try {
          alreadySaved = (await getEntry(result.word)) !== null
        } catch {
          // Treat a failed existing-entry lookup as "not saved".
        }
      }
      return { kind: "found", definition: result, alreadySaved }
    },
    [searchText, signedIn],
  )

  async function handleSignIn(): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Signing in…" })
    try {
      await signIn()
      toast.style = Toast.Style.Success
      toast.title = "Signed in"
      revalidateAuth()
    } catch (error) {
      toast.style = Toast.Style.Failure
      toast.title = "Sign-in failed"
      toast.message = error instanceof Error ? error.message : String(error)
    }
  }

  async function handleSignOut(): Promise<void> {
    await signOut()
    await showToast({ style: Toast.Style.Success, title: "Signed out" })
    revalidateAuth()
  }

  async function saveAndRefresh(definition: WordDefinition, sentence: string): Promise<void> {
    await handleSave(definition, sentence)
    // A session may have just been (re)established during save.
    revalidateAuth()
  }

  const signInAction = (
    <Action title="Sign in with Google" icon={Icon.Person} onAction={handleSignIn} />
  )
  const signOutAction = (
    <Action
      title="Sign Out"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      onAction={handleSignOut}
    />
  )

  // Signed out: make signing in the explicit, visible first step.
  if (!authLoading && !signedIn) {
    return (
      <List searchBarPlaceholder="Sign in to add vocab…">
        <List.EmptyView
          icon={Icon.Person}
          title="Sign in to add vocab"
          description="Press Enter to sign in with Google."
          actions={<ActionPanel>{signInAction}</ActionPanel>}
        />
      </List>
    )
  }

  return (
    <List
      searchBarPlaceholder="Type a word to add…"
      onSearchTextChange={setSearchText}
      isLoading={authLoading || lookupLoading}
      isShowingDetail={data?.kind === "found"}
      throttle
    >
      {!searchText.trim() ? (
        <List.EmptyView
          title="Type a word to look it up"
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : data?.kind === "not-found" ? (
        <List.EmptyView
          title={`"${data.word}" not found`}
          description="No dictionary entry — nothing will be saved."
          actions={<ActionPanel>{signOutAction}</ActionPanel>}
        />
      ) : data?.kind === "found" ? (
        <List.Item
          title={data.definition.word}
          subtitle={data.definition.partOfSpeech}
          accessories={data.alreadySaved ? [{ tag: "Already saved" }] : []}
          detail={<List.Item.Detail markdown={renderPreview(data.definition)} />}
          actions={
            <ActionPanel>
              <Action
                title="Save to Vocab Bank"
                icon={Icon.Plus}
                onAction={() => saveAndRefresh(data.definition, "")}
              />
              <Action.Push
                title="Add with Sentence…"
                icon={Icon.Text}
                target={<SentenceForm definition={data.definition} />}
              />
              {signOutAction}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  )
}
