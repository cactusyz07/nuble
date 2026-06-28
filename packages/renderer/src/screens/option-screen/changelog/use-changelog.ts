import { useEffect, useRef, useState } from 'react'
import { useGameContext } from '@/providers'
import { marked, Token } from 'marked'

export interface ChangelogTitle {
  version: string
  date: Date
}

export interface ChangelogEntry {
  title: ChangelogTitle
  content: string
}

export interface UseChangeLog {
  selectVersionIndex: (index: number) => void
  currentChangelog: ChangelogEntry | undefined
  versions: ChangelogTitle[]
  selectedVersionIndex: number
}

// marked v12 removed TokensList; the lexer now returns Token[] with a `links` property
type TokensList = Token[] & { links: Record<string, { href: string; title: string | null }> }

export const useChangelog = (): UseChangeLog => {
  const context = useGameContext()
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0)
  const [currentChangelog, setCurrentChangelog] = useState<ChangelogEntry | undefined>()
  const [versions, setVersions] = useState<Array<ChangelogTitle>>([])
  const lexedContent = useRef<TokensList>()

  const getVersions = () => {
    const filteredContent = lexedContent.current!.filter((node) => {
      return node.type === 'heading' && node.depth === 2
    })

    const versionArray: Array<ChangelogTitle> = []
    for (const nodeVersion of filteredContent) {
      if (nodeVersion.type === 'heading' && !nodeVersion.text.startsWith('⚠')) {
        const version = nodeVersion.text
        const splitedVersion: Array<string> = version.split(' - ')
        const versionNumber = splitedVersion[0].replace(/^[[]+|[\]]+$/g, '')
        const versionDate = new Date(splitedVersion[1])
        versionArray.push({
          version: versionNumber,
          date: versionDate
        })
      }
    }
    return versionArray
  }

  const selectVersionIndex = (index: number): void => {
    const title = versions[index]

    if (!title) {
      return
    }
    setSelectedVersionIndex(index)

    const version = title.version
    let record: boolean = false
    const result: TokensList = Object.assign([], { links: {} })

    for (const node of lexedContent.current!) {
      // When we encounter the searched heading, start recording all following lines
      if (node.type === 'heading' && node.depth === 2 && node.text.indexOf(version) >= 0) {
        record = true
      }

      // Stop recording when we hit another h2 heading
      if (node.type === 'heading' && node.depth === 2 && node.text.indexOf(version) === -1) {
        record = false
      }

      // If recording, store the token (excluding the section heading itself)
      if (record === true) {
        if (node.type !== 'heading' || node.depth !== 2) {
          result.push(node)
        }
      }
    }

    setCurrentChangelog({ title, content: marked.parser(result) })
  }

  useEffect(() => {
    fetch(context.changeLogSrc)
      .then((res) => res.blob())
      .then((blob) => blob.text())
      .then((text) => {
        lexedContent.current = marked.lexer(text) as TokensList
        const versions = getVersions()
        setVersions(versions)
        if (versions.length > 0) {
          selectVersionIndex(0)
        }
      })
  }, [])

  return { currentChangelog, selectVersionIndex, versions, selectedVersionIndex }
}
