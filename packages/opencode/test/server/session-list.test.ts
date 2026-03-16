import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { Log } from "../../src/util/log"

const projectRoot = path.join(__dirname, "../..")
Log.init({ print: false })

describe("Session.list", () => {
  test("filters by directory", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const first = await Session.create({})

        const otherDir = path.join(projectRoot, "..", "__session_list_other")
        const second = await Instance.provide({
          directory: otherDir,
          fn: async () => Session.create({}),
        })

        const sessions = [...Session.list({ directory: projectRoot })]
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(first.id)
        expect(ids).not.toContain(second.id)
      },
    })
  })

  test("filters root sessions", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const root = await Session.create({ title: "root-session" })
        const child = await Session.create({ title: "child-session", parentID: root.id })

        const sessions = [...Session.list({ roots: true })]
        const ids = sessions.map((s) => s.id)

        expect(ids).toContain(root.id)
        expect(ids).not.toContain(child.id)
      },
    })
  })

  test("filters by start time", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const session = await Session.create({ title: "new-session" })
        const futureStart = Date.now() + 86400000

        const sessions = [...Session.list({ start: futureStart })]
        expect(sessions.length).toBe(0)
      },
    })
  })

  test("filters by search term", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        await Session.create({ title: "unique-search-term-abc" })
        await Session.create({ title: "other-session-xyz" })

        const sessions = [...Session.list({ search: "unique-search" })]
        const titles = sessions.map((s) => s.title)

        expect(titles).toContain("unique-search-term-abc")
        expect(titles).not.toContain("other-session-xyz")
      },
    })
  })

  test("respects limit parameter", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        await Session.create({ title: "session-1" })
        await Session.create({ title: "session-2" })
        await Session.create({ title: "session-3" })

        const sessions = [...Session.list({ limit: 2 })]
        expect(sessions.length).toBe(2)
      },
    })
  })

  test("filters by source", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const cliSession = await Session.create({ title: "cli-session", source: "cli" })
        const tuiSession = await Session.create({ title: "tui-session" })

        // Filter to CLI sessions only
        const cliSessions = [...Session.list({ source: "cli" })]
        const cliIds = cliSessions.map((s) => s.id)
        expect(cliIds).toContain(cliSession.id)
        expect(cliIds).not.toContain(tuiSession.id)

        // Filter to interactive (null source) sessions only
        const tuiSessions = [...Session.list({ source: null })]
        const tuiIds = tuiSessions.map((s) => s.id)
        expect(tuiIds).toContain(tuiSession.id)
        expect(tuiIds).not.toContain(cliSession.id)
      },
    })
  })

  test("session stores source in info", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const cliSession = await Session.create({ title: "source-test", source: "cli" })
        expect(cliSession.source).toBe("cli")

        const tuiSession = await Session.create({ title: "no-source-test" })
        expect(tuiSession.source).toBeUndefined()
      },
    })
  })

  test("source filter combined with roots filter", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const cliRoot = await Session.create({ title: "cli-root", source: "cli" })
        const cliChild = await Session.create({ title: "cli-child", source: "cli", parentID: cliRoot.id })
        const tuiRoot = await Session.create({ title: "tui-root" })

        // CLI roots only (simulates --continue in CLI mode)
        const cliRoots = [...Session.list({ source: "cli", roots: true })]
        const cliRootIds = cliRoots.map((s) => s.id)
        expect(cliRootIds).toContain(cliRoot.id)
        expect(cliRootIds).not.toContain(cliChild.id)
        expect(cliRootIds).not.toContain(tuiRoot.id)

        // Interactive roots only (simulates --continue in TUI mode)
        const tuiRoots = [...Session.list({ source: null, roots: true })]
        const tuiRootIds = tuiRoots.map((s) => s.id)
        expect(tuiRootIds).toContain(tuiRoot.id)
        expect(tuiRootIds).not.toContain(cliRoot.id)
        expect(tuiRootIds).not.toContain(cliChild.id)
      },
    })
  })
})
