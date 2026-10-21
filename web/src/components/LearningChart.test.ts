import { describe, expect, it } from 'vitest'
import { theoryLimit } from './LearningChart'

describe('theoryLimit', () => {
  it('is 24√2 after one round', () => {
    expect(theoryLimit(1)).toBeCloseTo(33.94, 2)
  })
  it('falls with the square root of the rounds', () => {
    expect(theoryLimit(1_000_000)).toBeCloseTo(0.0339, 4)
    expect(theoryLimit(400) / theoryLimit(100)).toBeCloseTo(0.5, 12)
  })
})
