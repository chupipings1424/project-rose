import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * A tiny JSON "database": the whole value lives in memory and is written back
 * on every change. Writes go to a temp file first and are then renamed over the
 * real one, so a crash mid-write can never leave a half-written file behind.
 */
export class JsonFile<T> {
  readonly file: string
  private readonly fallback: () => T

  constructor(file: string, fallback: () => T) {
    this.file = file
    this.fallback = fallback
  }

  /** Returns the saved value, or `undefined` when the file does not exist yet. */
  readExisting(): T | undefined {
    try {
      return JSON.parse(readFileSync(this.file, 'utf8')) as T
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw new Error(`${this.file} is not valid JSON - fix or delete it. (${(error as Error).message})`, {
        cause: error,
      })
    }
  }

  read(): T {
    return this.readExisting() ?? this.fallback()
  }

  write(value: T): void {
    mkdirSync(path.dirname(this.file), { recursive: true })
    const temp = `${this.file}.tmp`
    writeFileSync(temp, JSON.stringify(value, null, 2))
    renameSync(temp, this.file)
  }
}