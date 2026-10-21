import { describe, expect, it } from 'vitest'
import { cameraAt, overview, union, zoomTo } from './camera'

const view = { w: 400, h: 300 }

describe('overview', () => {
  it('cabe o quadro inteiro e o centraliza', () => {
    const s = overview({ w: 800, h: 400 }, view)
    expect(s.scale).toBe(0.5)
    expect(s.x).toBe(0)
    expect(s.y).toBe(50)
  })
})

describe('zoomTo', () => {
  it('leva o centro da parte ao centro da janela', () => {
    const s = zoomTo({ x: 100, y: 50, w: 200, h: 100 }, view, 0.5)
    // o centro da parte (200, 100) cai no centro da janela depois do zoom
    expect(200 * s.scale + s.x).toBeCloseTo(view.w / 2, 6)
    expect(100 * s.scale + s.y).toBeCloseTo(view.h / 2, 6)
  })
  it('respeita os limites de escala', () => {
    expect(zoomTo({ x: 0, y: 0, w: 10, h: 10 }, view, 0.5, 2).scale).toBe(2)
    expect(zoomTo({ x: 0, y: 0, w: 4000, h: 4000 }, view, 0.5, 2).scale).toBe(0.5)
  })
})

describe('union', () => {
  it('é o menor retângulo que contém todos', () => {
    expect(union([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 5, w: 10, h: 10 }])).toEqual({ x: 0, y: 0, w: 30, h: 15 })
  })
})

describe('cameraAt', () => {
  const shots = [
    { scale: 1, x: 0, y: 0 },
    { scale: 2, x: -100, y: -50 },
    { scale: 3, x: -300, y: -100 },
  ]
  it('nas pontas é exatamente o plano', () => {
    expect(cameraAt(0, shots).shot).toEqual(shots[0])
    expect(cameraAt(1, shots).shot).toEqual(shots[1])
    expect(cameraAt(2, shots).shot).toEqual(shots[2])
  })
  it('anda só no começo do trecho e depois fica parada', () => {
    expect(cameraAt(0.45, shots).shot).toEqual(shots[1])
    expect(cameraAt(0.9, shots).shot).toEqual(shots[1])
    expect(cameraAt(1.45, shots).shot).toEqual(shots[2])
  })
  it('foco e zoom acompanham a câmera', () => {
    const start = cameraAt(0, shots)
    expect(start.zoom).toBe(0)
    expect(start.focus).toEqual([0, 0])
    const on1 = cameraAt(0.8, shots)
    expect(on1.zoom).toBe(1)
    expect(on1.focus).toEqual([1, 0])
    const on2 = cameraAt(2, shots)
    expect(on2.focus).toEqual([0, 1])
  })
  it('com menos de dois planos fica parada, sem quebrar', () => {
    expect(cameraAt(3, []).shot).toEqual({ scale: 1, x: 0, y: 0 })
    expect(cameraAt(3, [shots[1]]).shot).toEqual(shots[1])
    expect(cameraAt(3, [shots[1]]).focus).toEqual([])
  })
  it('move = 0 vira um corte seco, sem NaN', () => {
    const c = cameraAt(0.5, shots, 0)
    expect(Number.isNaN(c.shot.scale)).toBe(false)
    expect(c.shot).toEqual(shots[1])
  })
  it('nunca anda para trás ao avançar', () => {
    let prev = -1
    for (let p = 0; p <= 2.0001; p += 0.02) {
      const s = cameraAt(p, shots).shot.scale
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
  })
})
