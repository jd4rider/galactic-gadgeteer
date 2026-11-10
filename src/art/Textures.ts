import Phaser from 'phaser'

type Ctx = CanvasRenderingContext2D

function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: Ctx, w: number, h: number) => void,
): string {
  if (scene.textures.exists(key)) return key
  const canvas = scene.textures.createCanvas(key, Math.max(2, Math.ceil(width)), Math.max(2, Math.ceil(height)))
  if (!canvas) throw new Error(`Could not create texture ${key}`)
  const ctx = canvas.getContext()
  ctx.clearRect(0, 0, width, height)
  draw(ctx, width, height)
  canvas.refresh()
  return key
}

function rng(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function starPath(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, points = 5): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const radius = i % 2 === 0 ? outer : inner
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawSky(scene: Phaser.Scene): void {
  makeTexture(scene, 'sky', 1280, 720, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#071326')
    gradient.addColorStop(0.38, '#183966')
    gradient.addColorStop(0.68, '#5d6f9d')
    gradient.addColorStop(0.86, '#d99279')
    gradient.addColorStop(1, '#ffd08a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    const glow = ctx.createRadialGradient(1000, 500, 10, 1000, 500, 380)
    glow.addColorStop(0, 'rgba(255, 233, 181, 0.8)')
    glow.addColorStop(0.28, 'rgba(255, 191, 128, 0.34)')
    glow.addColorStop(1, 'rgba(255, 154, 104, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    const aurora = ctx.createLinearGradient(0, 80, w, 260)
    aurora.addColorStop(0, 'rgba(46, 196, 182, 0)')
    aurora.addColorStop(0.35, 'rgba(46, 196, 182, 0.12)')
    aurora.addColorStop(0.55, 'rgba(123, 97, 255, 0.16)')
    aurora.addColorStop(0.8, 'rgba(255, 93, 177, 0.08)')
    aurora.addColorStop(1, 'rgba(255, 93, 177, 0)')
    ctx.fillStyle = aurora
    ctx.fillRect(0, 50, w, 300)
  })
}

function drawStars(scene: Phaser.Scene): void {
  makeTexture(scene, 'stars', 1600, 720, (ctx, w, h) => {
    const random = rng(41)
    for (let i = 0; i < 170; i += 1) {
      const x = random() * w
      const y = random() * (h * 0.62)
      const radius = 0.6 + random() * 1.9
      const alpha = 0.18 + random() * 0.7
      ctx.fillStyle = `rgba(255, 244, 214, ${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
      if (radius > 1.9) {
        ctx.strokeStyle = `rgba(180, 245, 255, ${alpha * 0.55})`
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(x - 7, y)
        ctx.lineTo(x + 7, y)
        ctx.moveTo(x, y - 7)
        ctx.lineTo(x, y + 7)
        ctx.stroke()
      }
    }
    ctx.fillStyle = 'rgba(160, 220, 255, 0.1)'
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath()
      ctx.ellipse(random() * w, 60 + random() * 250, 160 + random() * 130, 26 + random() * 30, -0.2, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function drawPlanet(scene: Phaser.Scene): void {
  makeTexture(scene, 'planet', 560, 470, (ctx, w, h) => {
    const cx = 270
    const cy = 220
    const radius = 175
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.6)
    halo.addColorStop(0, 'rgba(255, 208, 138, 0.24)')
    halo.addColorStop(0.55, 'rgba(255, 159, 108, 0.11)')
    halo.addColorStop(1, 'rgba(255, 159, 108, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(-0.22)
    ctx.strokeStyle = 'rgba(255, 218, 171, 0.42)'
    ctx.lineWidth = 20
    ctx.beginPath()
    ctx.ellipse(0, 0, 252, 74, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 240, 211, 0.2)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.ellipse(0, 0, 272, 84, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    const planetGradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius)
    planetGradient.addColorStop(0, '#ffd998')
    planetGradient.addColorStop(0.44, '#f39b7d')
    planetGradient.addColorStop(1, '#7b4b8f')
    ctx.fillStyle = planetGradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()
    const bands = [
      ['rgba(255, 240, 202, 0.22)', 140, 28],
      ['rgba(120, 64, 124, 0.2)', 184, 20],
      ['rgba(255, 183, 128, 0.25)', 224, 16],
      ['rgba(100, 59, 117, 0.2)', 272, 22],
    ] as const
    bands.forEach(([color, y, height], index) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(cx + 30, cy - radius + y, 230 - index * 18, height, -0.12, 0, Math.PI * 2)
      ctx.fill()
    })
    const craters = [
      [200, 158, 20, 9],
      [320, 246, 30, 13],
      [235, 282, 13, 6],
      [352, 142, 11, 5],
    ] as const
    craters.forEach(([x, y, rx, ry]) => {
      ctx.fillStyle = 'rgba(92, 49, 102, 0.22)'
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 230, 192, 0.2)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(x - 2, y - 2, rx, ry, 0.2, 0.2, Math.PI * 1.3)
      ctx.stroke()
    })
    const shade = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0)
    shade.addColorStop(0, 'rgba(7, 19, 38, 0.45)')
    shade.addColorStop(0.45, 'rgba(7, 19, 38, 0)')
    shade.addColorStop(1, 'rgba(7, 19, 38, 0.22)')
    ctx.fillStyle = shade
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
    ctx.restore()

    ctx.strokeStyle = 'rgba(255, 239, 206, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2)
    ctx.stroke()
  })
}

function drawClouds(scene: Phaser.Scene): void {
  makeTexture(scene, 'clouds', 1600, 340, (ctx, w) => {
    const random = rng(9)
    for (let band = 0; band < 3; band += 1) {
      const baseY = 90 + band * 88
      const alpha = 0.1 + band * 0.045
      for (let i = 0; i < 9; i += 1) {
        const x = (i / 9) * w + random() * 110
        const y = baseY + (random() - 0.5) * 34
        const rx = 90 + random() * 130
        const ry = 13 + random() * 19
        ctx.fillStyle = `rgba(204, 232, 255, ${alpha})`
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, -0.04, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(x + 70, y - 9, rx * 0.6, ry * 0.75, 0.02, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

function drawMountains(scene: Phaser.Scene, key: string, seed: number, colors: [string, string], glow: string): void {
  makeTexture(scene, key, 1600, 520, (ctx, w, h) => {
    const random = rng(seed)
    const gradient = ctx.createLinearGradient(0, 20, 0, h)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(1, colors[1])
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, h)
    let x = 0
    while (x < w) {
      const peakWidth = 120 + random() * 160
      const peakY = 100 + random() * 190
      ctx.lineTo(x + peakWidth * 0.42, peakY)
      ctx.lineTo(x + peakWidth * 0.58, peakY + 24)
      x += peakWidth
      ctx.lineTo(x, h - 50 - random() * 60)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()

    for (let i = 0; i < 12; i += 1) {
      const gx = random() * w
      const gy = 240 + random() * 220
      const r = 20 + random() * 55
      const light = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
      light.addColorStop(0, glow)
      light.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.arc(gx, gy, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.strokeStyle = 'rgba(255, 243, 209, 0.1)'
    ctx.lineWidth = 1.4
    for (let i = 0; i < 9; i += 1) {
      const sx = random() * w
      const sy = 250 + random() * 140
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + 30, sy + 60)
      ctx.lineTo(sx + 18, sy + 120)
      ctx.stroke()
    }
  })
}

function drawCanopy(scene: Phaser.Scene): void {
  makeTexture(scene, 'canopy', 1600, 560, (ctx, w, h) => {
    const random = rng(88)
    const trees = 11
    for (let i = 0; i < trees; i += 1) {
      const x = (i / trees) * w + random() * 40
      const trunkH = 250 + random() * 170
      const top = h - trunkH
      ctx.strokeStyle = 'rgba(11, 46, 55, 0.9)'
      ctx.lineWidth = 9 + random() * 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, h)
      ctx.bezierCurveTo(x - 10, h - 80, x + 22, h - trunkH * 0.6, x + 2, top)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(89, 190, 154, 0.16)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x - 2, h - 20)
      ctx.bezierCurveTo(x - 12, h - 90, x + 18, h - trunkH * 0.6, x, top + 12)
      ctx.stroke()

      const capWidth = 86 + random() * 100
      const capY = top + 2
      const cap = ctx.createLinearGradient(x - capWidth, capY, x + capWidth, capY + 70)
      cap.addColorStop(0, 'rgba(18, 84, 77, 0.96)')
      cap.addColorStop(1, 'rgba(7, 40, 54, 0.98)')
      ctx.fillStyle = cap
      ctx.beginPath()
      ctx.ellipse(x + 6, capY + 24, capWidth * 0.62, 28 + random() * 12, -0.08, Math.PI, Math.PI * 2)
      ctx.quadraticCurveTo(x + 20, capY + 50, x - capWidth * 0.55, capY + 30)
      ctx.fill()
      ctx.fillStyle = 'rgba(66, 211, 176, 0.18)'
      ctx.beginPath()
      ctx.ellipse(x - 18, capY + 12, capWidth * 0.28, 6, -0.18, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.strokeStyle = 'rgba(20, 87, 73, 0.75)'
    ctx.lineWidth = 3
    for (let i = 0; i < 15; i += 1) {
      const x = random() * w
      const y = 80 + random() * 300
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(x + 12, y + 35, x - 18, y + 65, x + 6, y + 105)
      ctx.stroke()
    }
  })
}

function drawIslands(scene: Phaser.Scene): void {
  makeTexture(scene, 'islands', 1600, 720, (ctx, w) => {
    const random = rng(133)
    for (let i = 0; i < 6; i += 1) {
      const x = 100 + i * 280 + random() * 50
      const y = 120 + random() * 310
      const size = 46 + random() * 54
      const gradient = ctx.createLinearGradient(x, y, x, y + size * 2.3)
      gradient.addColorStop(0, '#557f6d')
      gradient.addColorStop(0.3, '#2b5f61')
      gradient.addColorStop(1, '#152b46')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(x - size, y)
      ctx.quadraticCurveTo(x - size * 0.7, y + size * 1.9, x, y + size * 2.5)
      ctx.quadraticCurveTo(x + size * 0.8, y + size * 1.7, x + size, y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(109, 202, 134, 0.5)'
      ctx.beginPath()
      ctx.ellipse(x, y, size, size * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(22, 41, 63, 0.5)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(x - size * 0.28, y + 14)
      ctx.lineTo(x - size * 0.08, y + size * 1.5)
      ctx.lineTo(x + size * 0.2, y + size * 1.1)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(46, 196, 182, 0.24)'
      ctx.beginPath()
      ctx.moveTo(x + size * 0.3, y + size * 0.2)
      ctx.quadraticCurveTo(x + size * 0.1, y + size * 1.7, x + size * 0.5, y + size * 2.2)
      ctx.stroke()
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 200, 87, 0.45)'
        ctx.beginPath()
        ctx.arc(x + size * 0.38, y + 28, 10, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

function drawVines(scene: Phaser.Scene): void {
  makeTexture(scene, 'vines', 1600, 260, (ctx, w, h) => {
    const random = rng(77)
    ctx.strokeStyle = 'rgba(20, 70, 58, 0.8)'
    for (let i = 0; i < 18; i += 1) {
      const x = 40 + i * 90 + random() * 36
      const length = 70 + random() * 160
      ctx.lineWidth = 2 + random() * 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + 18, length * 0.35, x - 20, length * 0.65, x + 8, length)
      ctx.stroke()
      for (let leaf = 0; leaf < 4; leaf += 1) {
        const ly = 20 + (length / 4) * leaf + random() * 12
        ctx.fillStyle = leaf % 2 === 0 ? 'rgba(44, 133, 93, 0.68)' : 'rgba(74, 170, 112, 0.52)'
        ctx.beginPath()
        ctx.ellipse(x + (leaf % 2 === 0 ? 12 : -10), ly, 12, 5, leaf % 2 === 0 ? 0.6 : -0.7, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.fillStyle = 'rgba(6, 26, 35, 0.72)'
    ctx.beginPath()
    ctx.ellipse(120, 0, 200, 80, 0, 0, Math.PI * 2)
    ctx.ellipse(w - 160, 0, 230, 95, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}

export type PlatformKind = 'grass' | 'stone' | 'metal' | 'mushroom'

export function platformTexture(
  scene: Phaser.Scene,
  width: number,
  height: number,
  kind: PlatformKind = 'grass',
): string {
  const w = Math.max(24, Math.round(width))
  const h = Math.max(14, Math.round(height))
  const key = `platform-${kind}-${w}-${h}`
  if (scene.textures.exists(key)) return key
  const random = rng(w * 31 + h * 17 + kind.length * 91)

  makeTexture(scene, key, w, h + 18, (ctx) => {
    ctx.save()
    ctx.translate(0, 0)

    ctx.fillStyle = 'rgba(3, 14, 24, 0.24)'
    ctx.beginPath()
    ctx.ellipse(w / 2, h + 5, w * 0.46, 9, 0, 0, Math.PI * 2)
    ctx.fill()

    if (kind === 'metal') {
      const body = ctx.createLinearGradient(0, 0, 0, h)
      body.addColorStop(0, '#6b849f')
      body.addColorStop(0.18, '#455e7b')
      body.addColorStop(1, '#1b2b45')
      ctx.fillStyle = body
      roundRect(ctx, 1, 1, w - 2, h - 2, 7)
      ctx.fill()
      ctx.strokeStyle = 'rgba(7, 19, 38, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#ffc857'
      for (let x = 18; x < w - 10; x += 46) {
        ctx.beginPath()
        ctx.arc(x, h * 0.46, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(126, 245, 229, 0.22)'
      roundRect(ctx, 4, 4, w - 8, 5, 3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(126, 245, 229, 0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(8, h - 7)
      ctx.lineTo(w - 8, h - 7)
      ctx.stroke()
      return
    }

    const rock = ctx.createLinearGradient(0, 10, 0, h)
    if (kind === 'stone') {
      rock.addColorStop(0, '#53697c')
      rock.addColorStop(0.4, '#394f68')
      rock.addColorStop(1, '#1c2b43')
    } else {
      rock.addColorStop(0, '#405c64')
      rock.addColorStop(0.44, '#2a4556')
      rock.addColorStop(1, '#162b42')
    }
    ctx.fillStyle = rock
    roundRect(ctx, 1, 4, w - 2, h - 4, kind === 'mushroom' ? 16 : 9)
    ctx.fill()
    ctx.strokeStyle = 'rgba(7, 19, 38, 0.75)'
    ctx.lineWidth = 2
    ctx.stroke()

    if (kind !== 'stone') {
      const grassH = Math.min(18, h * 0.38)
      const grass = ctx.createLinearGradient(0, 0, 0, grassH + 8)
      grass.addColorStop(0, '#a7ef8b')
      grass.addColorStop(0.5, '#63c777')
      grass.addColorStop(1, '#2d8c69')
      ctx.fillStyle = grass
      ctx.beginPath()
      ctx.moveTo(3, grassH * 0.3)
      ctx.quadraticCurveTo(w * 0.2, -2, w * 0.36, grassH * 0.28)
      ctx.quadraticCurveTo(w * 0.54, grassH * 0.08, w * 0.68, grassH * 0.38)
      ctx.quadraticCurveTo(w * 0.85, -1, w - 3, grassH * 0.42)
      ctx.lineTo(w - 3, grassH + 4)
      ctx.quadraticCurveTo(w * 0.7, grassH + 13, w * 0.5, grassH + 6)
      ctx.quadraticCurveTo(w * 0.24, grassH + 15, 3, grassH + 6)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(8, 48, 45, 0.45)'
      ctx.lineWidth = 1.4
      ctx.stroke()

      ctx.strokeStyle = 'rgba(183, 255, 174, 0.55)'
      ctx.lineWidth = 1.2
      for (let i = 0; i < Math.min(8, Math.floor(w / 42)); i += 1) {
        const x = 12 + i * 42 + random() * 18
        ctx.beginPath()
        ctx.moveTo(x, grassH + 2)
        ctx.quadraticCurveTo(x + 5, grassH - 12, x + 11, grassH - 5)
        ctx.stroke()
      }
    } else {
      ctx.strokeStyle = 'rgba(160, 199, 213, 0.24)'
      ctx.lineWidth = 1.2
      for (let i = 0; i < Math.max(2, Math.floor(w / 70)); i += 1) {
        const x = 20 + random() * (w - 40)
        ctx.beginPath()
        ctx.moveTo(x, h * 0.36)
        ctx.lineTo(x + 8, h * 0.58)
        ctx.lineTo(x - 2, h * 0.8)
        ctx.stroke()
      }
    }

    if (kind === 'mushroom') {
      ctx.fillStyle = 'rgba(255, 173, 196, 0.28)'
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath()
        ctx.arc(20 + random() * (w - 40), 10 + random() * 14, 3 + random() * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const gemColors = ['rgba(126, 245, 229, 0.7)', 'rgba(255, 200, 87, 0.55)', 'rgba(255, 93, 177, 0.5)']
    for (let i = 0; i < Math.min(3, Math.floor(w / 140)); i += 1) {
      const x = 20 + random() * (w - 40)
      const y = h - 10 - random() * Math.max(4, h * 0.3)
      ctx.fillStyle = gemColors[i % gemColors.length]
      ctx.beginPath()
      ctx.moveTo(x, y - 4)
      ctx.lineTo(x + 4, y)
      ctx.lineTo(x, y + 5)
      ctx.lineTo(x - 3, y)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  })
  return key
}

function drawEntities(scene: Phaser.Scene): void {
  makeTexture(scene, 'glow', 128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
  makeTexture(scene, 'spark', 12, 12, (ctx) => {
    const gradient = ctx.createRadialGradient(6, 6, 0, 6, 6, 6)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.35, 'rgba(180, 250, 255,0.95)')
    gradient.addColorStop(1, 'rgba(80,220,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 12, 12)
  })
  makeTexture(scene, 'dust', 20, 20, (ctx) => {
    const gradient = ctx.createRadialGradient(10, 10, 1, 10, 10, 10)
    gradient.addColorStop(0, 'rgba(235, 242, 222, 0.85)')
    gradient.addColorStop(1, 'rgba(235, 242, 222, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 20, 20)
  })
  makeTexture(scene, 'leaf', 18, 10, (ctx) => {
    ctx.fillStyle = 'rgba(136, 222, 155, 0.9)'
    ctx.beginPath()
    ctx.ellipse(9, 5, 8, 4, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(35, 98, 72, 0.65)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(2, 7)
    ctx.lineTo(15, 3)
    ctx.stroke()
  })

  makeTexture(scene, 'shard', 48, 56, (ctx) => {
    const glow = ctx.createRadialGradient(24, 26, 2, 24, 26, 24)
    glow.addColorStop(0, 'rgba(255, 232, 154, 0.65)')
    glow.addColorStop(1, 'rgba(255, 200, 87, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 48, 56)
    const grad = ctx.createLinearGradient(10, 8, 36, 48)
    grad.addColorStop(0, '#fff6cb')
    grad.addColorStop(0.45, '#ffd166')
    grad.addColorStop(1, '#ff9f1c')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(24, 3)
    ctx.lineTo(40, 25)
    ctx.lineTo(30, 50)
    ctx.lineTo(16, 39)
    ctx.lineTo(8, 22)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(112, 65, 11, 0.5)'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(24, 8)
    ctx.lineTo(30, 24)
    ctx.lineTo(23, 20)
    ctx.closePath()
    ctx.fill()
  })

  makeTexture(scene, 'capsule', 54, 64, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(27, 58, 17, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#284967'
    roundRect(ctx, 8, 8, 38, 46, 12)
    ctx.fill()
    ctx.strokeStyle = '#7ef5e5'
    ctx.lineWidth = 2
    ctx.stroke()
    const glass = ctx.createLinearGradient(13, 14, 40, 44)
    glass.addColorStop(0, '#7ef5e5')
    glass.addColorStop(0.5, '#2ec4b6')
    glass.addColorStop(1, '#155e72')
    ctx.fillStyle = glass
    roundRect(ctx, 13, 14, 28, 30, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    roundRect(ctx, 17, 18, 6, 16, 3)
    ctx.fill()
    ctx.strokeStyle = '#ffc857'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(16, 49)
    ctx.lineTo(38, 49)
    ctx.stroke()
  })

  makeTexture(scene, 'crate', 68, 68, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.24)'
    ctx.beginPath()
    ctx.ellipse(34, 64, 25, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    const grad = ctx.createLinearGradient(5, 5, 62, 62)
    grad.addColorStop(0, '#7d97ad')
    grad.addColorStop(0.5, '#45627d')
    grad.addColorStop(1, '#223a58')
    ctx.fillStyle = grad
    roundRect(ctx, 4, 3, 60, 58, 8)
    ctx.fill()
    ctx.strokeStyle = '#132b44'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1.4
    roundRect(ctx, 9, 8, 50, 48, 4)
    ctx.stroke()
    ctx.fillStyle = '#ffc857'
    for (const [x, y] of [[12, 10], [52, 10], [12, 51], [52, 51]] as const) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(46, 196, 182, 0.75)'
    ctx.beginPath()
    ctx.moveTo(34, 22)
    ctx.lineTo(43, 34)
    ctx.lineTo(34, 46)
    ctx.lineTo(25, 34)
    ctx.closePath()
    ctx.fill()
  })

  makeTexture(scene, 'spike', 54, 42, (ctx) => {
    const colors = ['#ff8ba7', '#ff5db1', '#b9a9ff']
    for (let i = 0; i < 3; i += 1) {
      const x = 10 + i * 16
      const grad = ctx.createLinearGradient(x, 38, x + 8, 4)
      grad.addColorStop(0, '#6d376b')
      grad.addColorStop(0.55, colors[i])
      grad.addColorStop(1, '#fff1e0')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x - 8, 38)
      ctx.lineTo(x + 2, 4 + i * 3)
      ctx.lineTo(x + 10, 38)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(74, 25, 66, 0.5)'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255, 93, 177, 0.18)'
    ctx.beginPath()
    ctx.ellipse(27, 38, 26, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  })

  makeTexture(scene, 'checkpoint', 96, 160, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(48, 152, 25, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#24415a'
    roundRect(ctx, 38, 70, 20, 76, 6)
    ctx.fill()
    ctx.strokeStyle = '#7ef5e5'
    ctx.lineWidth = 2
    ctx.stroke()
    const ringGlow = ctx.createRadialGradient(48, 48, 4, 48, 48, 42)
    ringGlow.addColorStop(0, 'rgba(255, 232, 154, 0.34)')
    ringGlow.addColorStop(1, 'rgba(255, 232, 154, 0)')
    ctx.fillStyle = ringGlow
    ctx.fillRect(0, 0, 96, 100)
    ctx.strokeStyle = '#ffc857'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(48, 48, 27, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#7ef5e5'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(48, 48, 19, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#fff6cb'
    starPath(ctx, 48, 48, 11, 4.4)
    ctx.fill()
    ctx.fillStyle = '#ffc857'
    ctx.beginPath()
    ctx.arc(48, 124, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  makeTexture(scene, 'barrier', 46, 260, (ctx) => {
    const glow = ctx.createLinearGradient(0, 0, 46, 0)
    glow.addColorStop(0, 'rgba(255, 93, 177, 0)')
    glow.addColorStop(0.22, 'rgba(255, 93, 177, 0.25)')
    glow.addColorStop(0.5, 'rgba(255, 220, 255, 0.5)')
    glow.addColorStop(0.78, 'rgba(255, 93, 177, 0.25)')
    glow.addColorStop(1, 'rgba(255, 93, 177, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 46, 260)
    ctx.strokeStyle = 'rgba(255, 218, 255, 0.85)'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i += 1) {
      const x = 8 + i * 7
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.bezierCurveTo(x + 10, 55, x - 8, 130, x + 4, 260)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255, 93, 177, 0.5)'
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath()
      ctx.arc(9 + ((i * 13) % 28), 16 + i * 27, 2 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }
  })

  makeTexture(scene, 'gate', 36, 270, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 36, 0)
    grad.addColorStop(0, '#45627d')
    grad.addColorStop(0.5, '#7d97ad')
    grad.addColorStop(1, '#2a405c')
    ctx.fillStyle = grad
    roundRect(ctx, 2, 0, 32, 270, 7)
    ctx.fill()
    ctx.strokeStyle = '#132b44'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(126, 245, 229, 0.4)'
    for (let y = 20; y < 250; y += 34) {
      roundRect(ctx, 9, y, 18, 8, 3)
      ctx.fill()
    }
    ctx.fillStyle = '#ffc857'
    for (let y = 14; y < 260; y += 34) {
      ctx.beginPath()
      ctx.arc(18, y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  makeTexture(scene, 'pedestal', 110, 74, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.24)'
    ctx.beginPath()
    ctx.ellipse(55, 68, 44, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    const grad = ctx.createLinearGradient(0, 8, 0, 70)
    grad.addColorStop(0, '#6d86a2')
    grad.addColorStop(1, '#1c314d')
    ctx.fillStyle = grad
    roundRect(ctx, 16, 16, 78, 52, 12)
    ctx.fill()
    ctx.strokeStyle = '#132b44'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(126, 245, 229, 0.35)'
    roundRect(ctx, 24, 24, 62, 9, 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(55, 48, 14, 0, Math.PI * 2)
    ctx.stroke()
  })

  makeTexture(scene, 'fragment', 92, 100, (ctx) => {
    const halo = ctx.createRadialGradient(46, 44, 4, 46, 44, 44)
    halo.addColorStop(0, 'rgba(255, 236, 170, 0.75)')
    halo.addColorStop(0.45, 'rgba(255, 200, 87, 0.22)')
    halo.addColorStop(1, 'rgba(255, 200, 87, 0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, 92, 100)
    ctx.save()
    ctx.translate(46, 44)
    ctx.rotate(0.12)
    const grad = ctx.createLinearGradient(-24, -28, 26, 30)
    grad.addColorStop(0, '#fff8d6')
    grad.addColorStop(0.4, '#ffd166')
    grad.addColorStop(1, '#ff8c42')
    ctx.fillStyle = grad
    starPath(ctx, 0, 0, 31, 12, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(112, 65, 11, 0.55)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.moveTo(-2, -22)
    ctx.lineTo(8, -2)
    ctx.lineTo(-5, -5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(126, 245, 229, 0.8)'
    ctx.beginPath()
    ctx.arc(70, 20, 3, 0, Math.PI * 2)
    ctx.arc(18, 68, 2, 0, Math.PI * 2)
    ctx.fill()
  })

  makeTexture(scene, 'bolt-shot', 34, 14, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 34, 0)
    grad.addColorStop(0, 'rgba(126,245,229,0)')
    grad.addColorStop(0.4, '#7ef5e5')
    grad.addColorStop(0.8, '#fff6cb')
    grad.addColorStop(1, '#ffffff')
    ctx.fillStyle = grad
    roundRect(ctx, 0, 3, 34, 8, 4)
    ctx.fill()
  })
  makeTexture(scene, 'enemy-shot', 20, 20, (ctx) => {
    const grad = ctx.createRadialGradient(10, 10, 1, 10, 10, 10)
    grad.addColorStop(0, '#fff6cb')
    grad.addColorStop(0.4, '#ff5db1')
    grad.addColorStop(1, 'rgba(255, 93, 177, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 20, 20)
  })
  makeTexture(scene, 'muzzle', 42, 42, (ctx) => {
    const grad = ctx.createRadialGradient(21, 21, 1, 21, 21, 21)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(255, 235, 160, 0.85)')
    grad.addColorStop(1, 'rgba(255, 159, 28, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 42, 42)
  })

  const icons: Array<[string, string, string]> = [
    ['blaster', '#2ec4b6', '✧'],
    ['jetpack', '#ff9f1c', '↑'],
    ['spring', '#74d680', '↟'],
    ['magnet', '#7b61ff', 'U'],
    ['phase', '#ff5db1', '»'],
  ]
  icons.forEach(([name, color, glyph]) => {
    makeTexture(scene, `icon-${name}`, 64, 64, (ctx) => {
      ctx.fillStyle = 'rgba(7,19,38,0.55)'
      roundRect(ctx, 3, 3, 58, 58, 15)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = color
      ctx.font = '700 29px "Trebuchet MS", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(glyph, 32, 33)
      ctx.globalAlpha = 0.28
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(32, 32, 25, 0, Math.PI * 2)
      ctx.fill()
    })
  })

  makeTexture(scene, 'pip-ghost', 56, 76, (ctx) => {
    ctx.fillStyle = 'rgba(126, 245, 229, 0.65)'
    ctx.beginPath()
    ctx.ellipse(28, 34, 16, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(28, 14, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(15, 44, 8, 22)
    ctx.fillRect(33, 44, 8, 22)
  })

  makeTexture(scene, 'hitbox', 40, 60, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.001)'
    ctx.fillRect(0, 0, 40, 60)
  })
  makeTexture(scene, 'white', 4, 4, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 4, 4)
  })
}

export function createBaseTextures(scene: Phaser.Scene): void {
  drawSky(scene)
  drawStars(scene)
  drawPlanet(scene)
  drawClouds(scene)
  drawMountains(scene, 'mountains-far', 12, ['#6c6b9f', '#2e315d'], 'rgba(172, 239, 226, 0.25)')
  drawMountains(scene, 'mountains-mid', 53, ['#2d5a66', '#142d47'], 'rgba(255, 200, 87, 0.18)')
  drawCanopy(scene)
  drawIslands(scene)
  drawVines(scene)
  drawEntities(scene)
}
