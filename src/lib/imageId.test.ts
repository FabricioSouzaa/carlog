import { describe, expect, it } from 'vitest'
import { isImageId } from './imageId'

describe('isImageId', () => {
  it('aceita UUID', () => {
    expect(isImageId('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isImageId('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
  })
  it('recusa o que pode mexer no caminho', () => {
    for (const bad of ['', '../outro/123', 'gallery/x', '123e4567-e89b-12d3-a456-426614174000.jpg', '123e4567-e89b-12d3-a456-42661417400/', '----------------------------------------', 'a/../../b'])
      expect(isImageId(bad)).toBe(false)
  })
})
