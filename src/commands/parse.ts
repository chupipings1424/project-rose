/**
 * Turns a typed or spoken Taglish sentence into a draft, e.g.
 *
 *   "kape 50"                              -> Expense  Kape  50
 *   "log fifty pesos for iced coffee"      -> Expense  Iced coffee  50
 *   "bayad Meralco 2500"                   -> Payment  Meralco  2500 (Meralco is a Payment Tracker title)
 *   "remind me to pay rent bukas 5pm"      -> Reminder Pay rent  tomorrow 17:00
 *   "paalala inom gamot alas otso ng gabi" -> Reminder Inom gamot  today 20:00
 *
 * It is a pure function (text in, result out, no React, no fetch), which makes it easy
 * to test with lots of examples - see parse.test.ts. Nothing is saved here: the command
 * bar always shows the draft first so you can check it.
 */
import { todayIso } from '../lib/format'
import type { CommandDraft } from './draft'

export interface ParseContext {
  now: Date
  /** Payment Tracker titles, to tell "bayad Meralco" (a payment) from "bayad tricycle" (an expense). */
  titles?: readonly string[]
  /** Budget expense items, to reuse their spelling ("kape" -> "Kape"). */
  items?: readonly string[]
}

export type ParseResult = { ok: true; draft: CommandDraft } | { ok: false; hint: string }

export const EXAMPLES = ['kape 50', 'gastos 1.5k groceries', 'bayad Meralco', 'remind me to pay rent bukas 5pm']

const HINTS = {
  empty: 'Type or say something, e.g. "kape 50" or "paalala bayad kuryente bukas 5pm".',
  amount: 'Magkano? Add an amount, e.g. "kape 50".',
  item: 'Para saan? Add what it was for, e.g. "kape 50".',
  reminder: 'Ano ang ipapaalala? e.g. "remind me to pay rent bukas 9am".',
}

// ---------- words ----------

const EXPENSE_WORDS = new Set(['log', 'spent', 'spend', 'gastos', 'gumastos', 'nagastos', 'ginastos', 'bumili', 'bili', 'binili', 'bought', 'buy', 'expense'])
const PAYMENT_WORDS = new Set(['paid', 'pay', 'bayad', 'binayaran', 'nagbayad', 'magbayad', 'bayaran', 'payment'])
const MONEY_WORDS = new Set(['\u20b1', 'p', 'php', 'peso', 'pesos', 'piso'])
const DAY_WORDS = new Set(['today', 'ngayon', 'kahapon', 'yesterday'])
/** Little words that can be dropped from the start or end of an item: "for kape" -> "kape". */
const FILLER = new Set(['for', 'sa', 'ng', 'nang', 'on', 'of', 'worth', 'ang', 'yung', 'the', 'a', 'an', 'i', 'ako', 'ko', 'na', 'at', 'lang', 'po', 'para', 'pang', 'to', 'mga', 'and'])

/** English, Tagalog and the Spanish numbers prices are often said in. */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  isa: 1, dalawa: 2, tatlo: 3, apat: 4, lima: 5, anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10,
  labingisa: 11, labindalawa: 12, labintatlo: 13, labingapat: 14, labinlima: 15, labinganim: 16, labimpito: 17, labingwalo: 18, labinsiyam: 19,
  dalawampu: 20, tatlumpu: 30, apatnapu: 40, limampu: 50, animnapu: 60, pitumpu: 70, walumpu: 80, siyamnapu: 90,
  uno: 1, dos: 2, tres: 3, kwatro: 4, kuwatro: 4, singko: 5, sinko: 5, sais: 6, siyete: 7, syete: 7, otso: 8, nuwebe: 9, nwebe: 9,
  diyes: 10, dyes: 10, onse: 11, dose: 12, trese: 13, katorse: 14, kinse: 15, disisais: 16, disisyete: 17, disiotso: 18, disinuwebe: 19,
  bente: 20, beinte: 20, trenta: 30, trinta: 30, kwarenta: 40, kuwarenta: 40, singkwenta: 50, singkuwenta: 50, sinkwenta: 50,
  sisenta: 60, setenta: 70, otsenta: 80, nobenta: 90,
}
const HUNDRED_WORDS = new Set(['hundred', 'daan', 'raan', 'sandaan', 'isandaan', 'siyento', 'syento', 'siento', 'siyentos', 'syentos', 'sientos'])
const THOUSAND_WORDS = new Set(['thousand', 'libo', 'mil', 'sanlibo', 'isanlibo'])
/** "isang daan AT limampu", "limampu'T lima", "singkwenta Y singko" */
const NUMBER_JOINERS = new Set(['and', 'at', 'na', 't', 'y'])

type NumberWord = { kind: 'value'; value: number } | { kind: 'hundred' } | { kind: 'thousand' }

function numberWord(token: string): NumberWord | null {
  const tries = [token]
  // Tagalog links a number to the next word with -ng: "limang daan", "isang libo".
  if (token.endsWith('ng')) tries.push(token.slice(0, -2))
  for (const word of tries) {
    if (word in NUMBER_WORDS) return { kind: 'value', value: NUMBER_WORDS[word] }
    if (HUNDRED_WORDS.has(word)) return { kind: 'hundred' }
    if (THOUSAND_WORDS.has(word)) return { kind: 'thousand' }
  }
  return null
}

// ---------- shared helpers ----------

function normalize(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\b([ap])\.\s?m\.?/gi, '$1m')
    .replace(/[.!?,]+$/, '')
    // "kape, 50" -> "kape 50" (but keep "2,500")
    .replace(/,(?=\s)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits into words, keeping their case. "limampu't" -> "limampu", "t"; "bente-singko" -> "bente", "singko". */
function tokenize(text: string): string[] {
  return text.split(' ').flatMap((token) => {
    const joined = /^([^']+)'([ty])$/i.exec(token)
    if (joined) return [joined[1], joined[2]]
    if (!token.includes('-')) return [token]
    const whole = token.replace(/-/g, '')
    if (numberWord(whole.toLowerCase())) return [whole]
    const parts = token.split('-').filter(Boolean)
    return parts.every((part) => numberWord(part.toLowerCase())) ? parts : [token]
  })
}

const lower = (word: string) => word.toLowerCase()
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const round2 = (value: number) => Math.round(value * 100) / 100

const DIGITS = /^(?:\u20b1|php|p)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(k)?(?:php|pesos?)?$/i

interface Amount {
  value: number
  start: number
  end: number
}

/** The first amount in the words: digits ("50", "1.5k", "2,500") win over spelled-out numbers. */
function findAmount(tokens: string[]): Amount | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const match = DIGITS.exec(tokens[i])
    if (!match) continue
    let value = Number(`${match[1].replace(/,/g, '')}${match[2] ? `.${match[2]}` : ''}`)
    if (match[3]) value *= 1000
    let end = i + 1
    const next = numberWord(lower(tokens[i + 1] ?? ''))
    if (next?.kind === 'thousand') {
      value *= 1000
      end += 1
    } else if (next?.kind === 'hundred') {
      value *= 100
      end += 1
    }
    if (value > 0) return { value: round2(value), start: i, end }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    if (!numberWord(lower(tokens[i]))) continue
    let total = 0
    let current = 0
    let end = i
    for (let j = i; j < tokens.length; j += 1) {
      const word = numberWord(lower(tokens[j]))
      if (!word) {
        // "at"/"na"/"y" only join two number words.
        if (j > i && NUMBER_JOINERS.has(lower(tokens[j])) && numberWord(lower(tokens[j + 1] ?? ''))) continue
        break
      }
      if (word.kind === 'value') current += word.value
      else if (word.kind === 'hundred') current = (current || 1) * 100
      else {
        total += (current || 1) * 1000
        current = 0
      }
      end = j + 1
    }
    const value = total + current
    if (value > 0) return { value, start: i, end }
  }
  return null
}

/** Drops filler from both ends: "ako ng kape" -> "kape". */
function trimFiller(words: string[]): string[] {
  let start = 0
  let end = words.length
  while (start < end && FILLER.has(lower(words[start]))) start += 1
  while (end > start && FILLER.has(lower(words[end - 1]))) end -= 1
  return words.slice(start, end)
}

function sameName(options: readonly string[] | undefined, name: string): string | undefined {
  const wanted = name.trim().toLowerCase()
  return options?.find((option) => option.trim().toLowerCase() === wanted)
}

/** The longest Payment Tracker title that appears as whole words in the text. */
function findTitle(text: string, titles: readonly string[] | undefined): string | undefined {
  const padded = ` ${text.toLowerCase()} `
  return [...(titles ?? [])]
    .filter((title) => title.trim())
    .sort((a, b) => b.length - a.length)
    .find((title) => padded.includes(` ${title.trim().toLowerCase()} `))
}

function dayIso(now: Date, offset: number): string {
  const day = new Date(now)
  day.setDate(day.getDate() + offset)
  return todayIso(day)
}

// ---------- reminders ----------

const REMIND = /\b(?:please |pls )?(?:remind(?: me)?|ipaalala(?: mo)?(?: sa akin)?|paalalahanan mo ako|paalala)\b/i

type Period = 'early' | 'morning' | 'noon' | 'afternoon' | 'evening'
const PERIODS: Record<string, Period> = {
  'madaling araw': 'early',
  umaga: 'morning',
  morning: 'morning',
  tanghali: 'noon',
  noon: 'noon',
  hapon: 'afternoon',
  afternoon: 'afternoon',
  gabi: 'evening',
  evening: 'evening',
  night: 'evening',
}
const PERIOD_HOUR: Record<Period, number> = { early: 5, morning: 8, noon: 12, afternoon: 15, evening: 20 }

const WEEKDAYS: Record<string, number> = {
  sunday: 0, linggo: 0,
  monday: 1, mon: 1, lunes: 1,
  tuesday: 2, tue: 2, tues: 2, martes: 2,
  wednesday: 3, wed: 3, miyerkules: 3, miyerkoles: 3, myerkules: 3,
  thursday: 4, thu: 4, thurs: 4, huwebes: 4,
  friday: 5, fri: 5, biyernes: 5, byernes: 5,
  saturday: 6, sabado: 6,
}

/** "alas singko" = 5 o'clock (Spanish hours). */
const ALAS_HOURS: Record<string, number> = {
  una: 1, uno: 1, dos: 2, tres: 3, kwatro: 4, kuwatro: 4, singko: 5, sinko: 5, sais: 6, siyete: 7, syete: 7,
  otso: 8, nuwebe: 9, nwebe: 9, diyes: 10, dyes: 10, onse: 11, dose: 12,
}

/** Removes the first match from the text and returns it. */
function take(state: { text: string }, pattern: RegExp): RegExpExecArray | null {
  const match = pattern.exec(state.text)
  if (match) {
    state.text = `${state.text.slice(0, match.index)} ${state.text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim()
  }
  return match
}

function nextWholeHour(from: Date): Date {
  const next = new Date(from)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return next
}

function to24(hour: number, meridiem: 'am' | 'pm' | undefined): number | undefined {
  if (hour > 12) return hour
  if (meridiem === 'am') return hour % 12
  if (meridiem === 'pm') return (hour % 12) + 12
  return undefined
}

function periodMeridiem(period: Period | undefined, hour: number): 'am' | 'pm' | undefined {
  if (period === 'early' || period === 'morning') return 'am'
  if (period === 'afternoon' || period === 'evening') return 'pm'
  if (period === 'noon') return hour === 12 || hour <= 5 ? 'pm' : 'am'
  return undefined
}

function parseReminder(text: string, now: Date): ParseResult {
  const state = { text }
  take(state, REMIND)

  let dayOffset: number | undefined
  let weekday: number | undefined
  let hour: number | undefined
  let minute = 0
  let meridiem: 'am' | 'pm' | undefined
  let period: Period | undefined
  let inMinutes: number | undefined
  let later = false

  let match = take(state, /\b(?:in|after|pagkalipas ng) (\d+|an?|isang|one) ?(minutes?|mins?|minuto|hours?|hrs?|oras)\b/i)
  if (match) {
    const count = /^\d+$/.test(match[1]) ? Number(match[1]) : 1
    inMinutes = /^[ho]/i.test(match[2]) ? count * 60 : count
  }

  match = take(state, /\b(?:mamayang|ngayong) (madaling araw|umaga|tanghali|hapon|gabi)\b/i)
  if (match) {
    dayOffset = 0
    period = PERIODS[match[1].toLowerCase()]
  }
  if (take(state, /\btonight\b/i)) {
    dayOffset = 0
    period = 'evening'
  }
  if (take(state, /\b(?:(?:the )?day after tomorrow|(?:sa )?makalawa)\b/i)) dayOffset = 2
  if (take(state, /\b(?:tomorrow|tmrw|bukas)\b/i)) dayOffset = 1
  if (take(state, /\b(?:today|ngayong araw|ngayon)\b/i)) dayOffset ??= 0

  match = take(
    state,
    /\b(?:(?:sa darating na|sa susunod na|sa|next|this|on) )?(sunday|linggo|monday|mon|lunes|tuesday|tues|tue|martes|wednesday|wed|miyerkules|miyerkoles|myerkules|thursday|thurs|thu|huwebes|friday|fri|biyernes|byernes|saturday|sabado)\b/i,
  )
  if (match) weekday = WEEKDAYS[match[1].toLowerCase()]

  match = take(state, /\b(?:at |by |ng |sa )?(\d{1,2})(?::(\d{2}))? ?(am|pm)\b/i)
  if (match) {
    hour = Number(match[1])
    minute = Number(match[2] ?? 0)
    meridiem = match[3].toLowerCase() as 'am' | 'pm'
  } else {
    match = take(
      state,
      /\b(?:sa |ng )?alas[ -](una|uno|dos|tres|kwatro|kuwatro|singko|sinko|sais|siyete|syete|otso|nuwebe|nwebe|diyes|dyes|onse|dose|\d{1,2})(?::(\d{2}))?(?: (?:y )?(medya|media|kinse))?\b/i,
    )
    if (match) {
      const word = match[1].toLowerCase()
      hour = ALAS_HOURS[word] ?? Number(word)
      minute = match[3] ? (/^k/i.test(match[3]) ? 15 : 30) : Number(match[2] ?? 0)
    } else {
      match = take(state, /\b(?:at|by|@) ?(\d{1,2})(?::(\d{2}))?\b/i)
      if (match && Number(match[1]) <= 23) {
        hour = Number(match[1])
        minute = Number(match[2] ?? 0)
      }
    }
  }
  if (take(state, /\b(?:at )?(?:noon|tanghaling tapat)\b/i)) period ??= 'noon'
  match = take(state, /\b(?:in the |this |ng |sa )?(morning|afternoon|evening|night|madaling araw|umaga|tanghali|hapon|gabi)\b/i)
  if (match) period ??= PERIODS[match[1].toLowerCase()]
  if (take(state, /\bmamaya\b/i)) {
    later = true
    dayOffset ??= 0
  }

  const words = trimFiller(state.text.split(' ').filter(Boolean))
  // "me"/"mo ako" left over from "remind ... me" phrasing.
  while (words.length && ['me', 'mo', 'that', 'about', 'akin'].includes(lower(words[0]))) words.shift()
  const reminderText = trimFiller(words).join(' ')
  if (!reminderText) return { ok: false, hint: HINTS.reminder }

  let due: Date
  if (inMinutes !== undefined) {
    due = new Date(now.getTime() + inMinutes * 60_000)
  } else {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    if (weekday !== undefined) {
      // "sa lunes" said on a Monday means next week's.
      day.setDate(day.getDate() + ((weekday - now.getDay() + 7) % 7 || 7))
    } else if (dayOffset) {
      day.setDate(day.getDate() + dayOffset)
    }
    const future = weekday !== undefined || (dayOffset ?? 0) > 0
    const at = (h: number, m: number) => {
      const when = new Date(day)
      when.setHours(h, m, 0, 0)
      return when
    }

    if (hour !== undefined) {
      let h = to24(hour, meridiem ?? periodMeridiem(period, hour))
      if (h === undefined) {
        if (future) h = hour === 12 ? 12 : hour < 7 ? hour + 12 : hour
        // Today and no am/pm: the next time it is that o'clock.
        else h = at(hour % 12, minute) > now ? hour % 12 : (hour % 12) + 12
      }
      due = at(h, minute)
    } else if (period) {
      due = at(PERIOD_HOUR[period], 0)
    } else if (later && !future) {
      due = nextWholeHour(new Date(now.getTime() + 30 * 60_000))
    } else if (future) {
      due = at(9, 0)
    } else {
      due = nextWholeHour(now)
    }
    // Already past today (e.g. "8am" said at 10am): tomorrow.
    if (due <= now && !future) due.setDate(due.getDate() + 1)
  }

  return { ok: true, draft: { kind: 'reminder', text: capitalize(reminderText), dueAt: due.toISOString() } }
}

// ---------- payments and expenses ----------

export function parseCommand(input: string, context: ParseContext): ParseResult {
  const text = normalize(input)
  if (!text) return { ok: false, hint: HINTS.empty }
  if (REMIND.test(text)) return parseReminder(text, context.now)

  const tokens = tokenize(text)
  const words = new Set(tokens.map(lower))
  const date = words.has('kahapon') || words.has('yesterday') ? dayIso(context.now, -1) : todayIso(context.now)
  const saysPaid = [...PAYMENT_WORDS].some((word) => words.has(word))
  const saysSpent = [...EXPENSE_WORDS].some((word) => words.has(word))

  // A Payment Tracker title: "bayad Meralco", or just "Meralco 2500".
  const title = findTitle(text, context.titles)
  if (title && (saysPaid || !saysSpent)) {
    const rest = tokenize(` ${text} `.replace(new RegExp(` ${escapeRegExp(title.trim())} `, 'i'), ' ').trim())
    const amount = findAmount(rest)
    return { ok: true, draft: { kind: 'payment', title, amount: amount?.value ?? null, date } }
  }

  const amount = findAmount(tokens)
  if (!amount) return { ok: false, hint: HINTS.amount }
  const itemWords = trimFiller(
    tokens.filter((word, index) => {
      if (index >= amount.start && index < amount.end) return false
      const key = lower(word)
      return !EXPENSE_WORDS.has(key) && !PAYMENT_WORDS.has(key) && !MONEY_WORDS.has(key) && !DAY_WORDS.has(key)
    }),
  )
  const typed = itemWords.join(' ')
  if (!typed) return { ok: false, hint: HINTS.item }
  const item = sameName(context.items, typed) ?? capitalize(typed)
  return { ok: true, draft: { kind: 'expense', item, amount: amount.value, date } }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}