import { describe, expect, it } from 'vitest'
import { parseCommand, type ParseContext } from './parse'

// Monday 9 November 2026, 10:00 in the phone's own time zone.
const now = new Date(2026, 10, 9, 10, 0)
const context: ParseContext = { now, titles: ['Meralco', 'Car Loan'], items: ['Groceries', 'Kape'] }
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString()

const draft = (text: string) => {
  const result = parseCommand(text, context)
  if (!result.ok) throw new Error(`expected a draft for "${text}", got: ${result.hint}`)
  return result.draft
}
const hint = (text: string) => {
  const result = parseCommand(text, context)
  if (result.ok) throw new Error(`expected a hint for "${text}"`)
  return result.hint
}

describe('parseCommand - expenses', () => {
  it.each([
    ['kape 50', 'Kape', 50],
    ['Log fifty pesos for iced coffee', 'Iced coffee', 50],
    ['gastos 1.5k groceries', 'Groceries', 1500],
    ['bumili ako ng load \u20b1100', 'Load', 100],
    ['2,500 rent', 'Rent', 2500],
    ['spent two thousand five hundred on gas', 'Gas', 2500],
    ['isang daan at limampu pamasahe', 'Pamasahe', 150],
    ["limampu't lima kape", 'Kape', 55],
    ['dos siyentos tricycle', 'Tricycle', 200],
    ['tres mil grocery', 'Grocery', 3000],
    ['bente singko candy', 'Candy', 25],
    ['singkwenta y singko yosi', 'Yosi', 55],
    ['isang libo limang daan internet', 'Internet', 1500],
    ['taxi, 120.50', 'Taxi', 120.5],
    ['php80 jeep', 'Jeep', 80],
    ['bayad tricycle 30', 'Tricycle', 30],
  ])('"%s" -> %s %d', (text, item, amount) => {
    expect(draft(text)).toEqual({ kind: 'expense', item, amount, date: '2026-11-09' })
  })

  it('reuses the spelling of an existing budget item', () => {
    expect(draft('GROCERIES 300')).toMatchObject({ item: 'Groceries' })
  })

  it('"kahapon" / "yesterday" logs it on the day before', () => {
    expect(draft('kape 50 kahapon')).toMatchObject({ item: 'Kape', date: '2026-11-08' })
    expect(draft('spent 200 on lunch yesterday')).toMatchObject({ item: 'Lunch', date: '2026-11-08' })
  })

  it('asks for what is missing', () => {
    expect(hint('')).toMatch(/Type or say/)
    expect(hint('kape')).toMatch(/Magkano/)
    expect(hint('gastos 50')).toMatch(/Para saan/)
  })
})

describe('parseCommand - payments', () => {
  it('pays a Payment Tracker title', () => {
    expect(draft('bayad Meralco 2500')).toEqual({ kind: 'payment', title: 'Meralco', amount: 2500, date: '2026-11-09' })
  })

  it('leaves the amount to the title plan when none is said', () => {
    expect(draft('paid car loan')).toEqual({ kind: 'payment', title: 'Car Loan', amount: null, date: '2026-11-09' })
  })

  it('treats a bare title as a payment (an expense would count it twice)', () => {
    expect(draft('Meralco 1,200')).toMatchObject({ kind: 'payment', title: 'Meralco', amount: 1200 })
  })

  it('still logs an expense when you say so', () => {
    expect(draft('gastos meralco 100')).toMatchObject({ kind: 'expense', item: 'Meralco', amount: 100 })
  })
})

describe('parseCommand - reminders', () => {
  it.each([
    ['remind me to pay rent bukas 5pm', 'Pay rent', at(10, 17)],
    ['Remind me to pay electric bill tomorrow at 5 P.M.', 'Pay electric bill', at(10, 17)],
    ['Remind me tomorrow at 5 PM to pay electric bill', 'Pay electric bill', at(10, 17)],
    ['paalala inom gamot alas otso ng gabi', 'Inom gamot', at(9, 20)],
    ['paalala alas singko y medya ng hapon bili tinapay', 'Bili tinapay', at(9, 17, 30)],
    ['ipaalala mo na magbayad ng kuryente mamayang gabi', 'Magbayad ng kuryente', at(9, 20)],
    ['paalala tawag kay mama sa lunes', 'Tawag kay mama', at(16, 9)],
    ['remind me to submit report on friday 3pm', 'Submit report', at(13, 15)],
    ['remind me to stretch in 30 minutes', 'Stretch', at(9, 10, 30)],
    ['remind me to call the bank at 3', 'Call the bank', at(9, 15)],
    ['remind me to fix the sink at 11', 'Fix the sink', at(9, 11)],
    ['remind me to check the oven 9am', 'Check the oven', at(10, 9)],
    ['remind me mamaya to buy milk', 'Buy milk', at(9, 11)],
    ['remind me to water the plants tonight', 'Water the plants', at(9, 20)],
    ['paalala bayad tubig sa makalawa', 'Bayad tubig', at(11, 9)],
    ['remind me to buy 2 eggs', 'Buy 2 eggs', at(9, 11)],
  ])('"%s"', (text, expectedText, dueAt) => {
    expect(draft(text)).toEqual({ kind: 'reminder', text: expectedText, dueAt })
  })

  it('needs something to remind you about', () => {
    expect(hint('remind me bukas 5pm')).toMatch(/ipapaalala/)
  })
})