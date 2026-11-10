import Phaser from 'phaser'
import { CSS, DISPLAY_FONT, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { audio } from '../audio/AudioEngine'
import { loadSave, recordLevel, unlockAchievement, formatTime, type SaveData } from '../core/save'
import { LEVEL_ONE, type LevelData } from '../data/levelOne'
import { Enemy, createEnemies } from '../enemies/Enemies'
import { InputManager } from '../input/InputManager'
import { GADGET_NAMES, Player, type Gadget } from '../player/Player'
import { starsFor } from '../player/movement'
import { platformTexture } from '../art/Textures'
import { Hud } from '../ui/Hud'
import { MenuList } from '../ui/MenuList'
import { TouchControls } from '../ui/TouchControls'
import { Parallax } from '../world/Parallax'

interface Shard {
  sprite: Phaser.Physics.Arcade.Image
  homeY: number
  tween: Phaser.Tweens.Tween
}

interface Pickup {
  gadget: Gadget
  container: Phaser.GameObjects.Container
  x: number
  y: number
  collected: boolean
}

interface Checkpoint {
  id: string
  x: number
  y: number
  image: Phaser.GameObjects.Image
  glow: Phaser.GameObjects.Image
  active: boolean
}

interface MovingPlatform {
  body: Phaser.Physics.Arcade.Image
  visual: Phaser.GameObjects.Image
  previousY: number
  top: number
}

export class GameScene extends Phaser.Scene {
  private level: LevelData = LEVEL_ONE
  private inputManager!: InputManager
  private save!: SaveData
  private player!: Player
  private parallax!: Parallax
  private hud!: Hud
  private touch: TouchControls | null = null
  private solids!: Phaser.Physics.Arcade.StaticGroup
  private oneWays!: Phaser.Physics.Arcade.StaticGroup
  private movingPlatforms: MovingPlatform[] = []
  private shards: Shard[] = []
  private shardGroup!: Phaser.Physics.Arcade.Group
  private shardsCollected = 0
  private capsulesFound = new Set<string>()
  private capsuleGroup!: Phaser.Physics.Arcade.Group
  private pickups: Pickup[] = []
  private checkpoints: Checkpoint[] = []
  private checkpoint = 'start'
  private checkpointX = LEVEL_ONE.spawn.x
  private checkpointY = LEVEL_ONE.spawn.y
  private enemies: Enemy[] = []
  private enemyShots!: Phaser.Physics.Arcade.Group
  private projectiles!: Phaser.Physics.Arcade.Group
  private crate!: Phaser.Physics.Arcade.Image
  private plate!: Phaser.GameObjects.Container
  private platRing!: Phaser.GameObjects.Arc
  private gate!: Phaser.GameObjects.Image
  private gateBody!: Phaser.Physics.Arcade.Image
  private gateOpen = false
  private barrier!: Phaser.Physics.Arcade.Image
  private wallBody!: Phaser.Physics.Arcade.Image
  private wallVisual!: Phaser.GameObjects.Container
  private wallHp = 3
  private goal!: Phaser.GameObjects.Container
  private goalGlow!: Phaser.GameObjects.Image
  private goalZone!: Phaser.Physics.Arcade.Image
  private spikeGroup!: Phaser.Physics.Arcade.StaticGroup
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter
  private jetTrail!: Phaser.GameObjects.Particles.ParticleEmitter
  private chargeGraphics!: Phaser.GameObjects.Graphics
  private magnetGraphics!: Phaser.GameObjects.Graphics
  private timerStarted = false
  private elapsedMs = 0
  private complete = false
  private paused = false
  private pauseReason = ''
  private pauseContainer!: Phaser.GameObjects.Container
  private pauseList!: MenuList
  private resultsList: MenuList | null = null
  private resultsContainer: Phaser.GameObjects.Container | null = null
  private respawning = false
  private damageTaken = false
  private lastDamageSource = 0
  private hintIndex = 0
  private lastHudCheckpoint = ''
  private lastMagnetSpark = 0
  private accessNotice = ''
  private onBlur!: () => void
  private onVisibility!: () => void
  private onOrientationEvent!: (event: Event) => void

  constructor() {
    super('Game')
  }

  create(): void {
    this.save = loadSave()
    this.complete = false
    this.paused = false
    this.respawning = false
    this.damageTaken = false
    this.shardsCollected = 0
    this.capsulesFound = new Set()
    this.checkpoint = 'start'
    this.checkpointX = this.level.spawn.x
    this.checkpointY = this.level.spawn.y
    this.hintIndex = 0
    this.enemies = []
    this.shards = []
    this.pickups = []
    this.checkpoints = []
    this.movingPlatforms = []
    this.lastHudCheckpoint = ''
    this.elapsedMs = 0
    this.accessNotice = ''
    this.timerStarted = false

    this.inputManager = new InputManager(this, this.save.settings.bindings)
    audio.setSettings(this.save.settings)
    audio.setMood('meadow')
    audio.unlock()

    this.physics.world.setBounds(0, -240, this.level.width, this.level.height + 480)
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height)
    this.cameras.main.fadeIn(520, 7, 19, 38)
    this.parallax = new Parallax(this, {
      quality: this.save.settings.quality,
      reducedMotion: !this.save.settings.screenShake,
    })

    this.buildPlatforms()
    this.buildShards()
    this.buildCapsules()
    this.buildWall()
    this.buildCrateAndGate()
    this.buildBarrier()
    this.buildSpikes()
    this.buildGoal()
    this.buildEnemies()
    this.buildPlayer()
    this.updateDebugState()
    this.buildParticles()
    this.buildColliders()
    this.buildPickups()
    this.buildCheckpoints()
    this.buildHud()
    this.buildPauseMenu()
    this.buildCameraAndInputs()
    this.showIntro()
    this.updateDebugState()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())
  }

  private buildPlatforms(): void {
    this.solids = this.physics.add.staticGroup()
    this.oneWays = this.physics.add.staticGroup()

    for (const platform of this.level.platforms) {
      const visual = this.add
        .image(platform.x, platform.y, platformTexture(this, platform.w, platform.h, platform.kind ?? 'grass'))
        .setOrigin(0)
        .setDepth(8)
      visual.setDisplaySize(platform.w, platform.h)

      if (platform.moving) {
        const body = this.physics.add
          .image(platform.x + platform.w / 2, platform.y + platform.h / 2, 'white')
          .setVisible(false)
          .setDisplaySize(platform.w, platform.h)
          .setImmovable(true)
        body.body.setAllowGravity(false)
        ;(body.body as Phaser.Physics.Arcade.Body).setSize(platform.w, platform.h)
        body.setDepth(9)
        this.solids.add(body)
        this.tweens.add({
          targets: body,
          y: platform.moving.toY,
          duration: platform.moving.duration,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        })
        this.movingPlatforms.push({
          body,
          visual,
          previousY: body.y,
          top: platform.y,
        })
        continue
      }

      const collider = this.physics.add.staticImage(
        platform.x + platform.w / 2,
        platform.y + platform.h / 2,
        'white',
      )
      collider.setVisible(false).setDisplaySize(platform.w, platform.h).refreshBody()
      const body = collider.body as Phaser.Physics.Arcade.StaticBody
      if (platform.oneWay) {
        body.checkCollision.down = false
        body.checkCollision.left = false
        body.checkCollision.right = false
        this.oneWays.add(collider)
      } else {
        this.solids.add(collider)
      }
    }
  }

  private buildShards(): void {
    this.shardGroup = this.physics.add.group({ allowGravity: false, immovable: true })
    this.level.shards.forEach((definition) => {
      const sprite = this.physics.add.image(definition.x, definition.y, 'shard')
      sprite.setDepth(15).setScale(0.72)
      ;(sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
      ;(sprite.body as Phaser.Physics.Arcade.Body).setImmovable(true)
      ;(sprite.body as Phaser.Physics.Arcade.Body).setCircle(16, 8, 10)
      this.shardGroup.add(sprite)
      const tween = this.tweens.add({
        targets: sprite,
        y: definition.y - 8,
        duration: 1200 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
      this.shards.push({ sprite, homeY: definition.y, tween })
    })
  }

  private buildCapsules(): void {
    this.capsuleGroup = this.physics.add.group({ allowGravity: false, immovable: true })
    this.level.capsules.forEach((capsule) => {
      const glow = this.add.image(capsule.x, capsule.y, 'glow').setScale(0.62).setTint(0x7ef5e5).setAlpha(0.2).setDepth(13)
      glow.setBlendMode(Phaser.BlendModes.ADD)
      const image = this.physics.add.image(capsule.x, capsule.y, 'capsule').setDepth(14).setScale(0.82)
      image.setData('capsule', capsule)
      image.setData('glow', glow)
      ;(image.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
      ;(image.body as Phaser.Physics.Arcade.Body).setImmovable(true)
      this.capsuleGroup.add(image)
      this.tweens.add({
        targets: [image, glow],
        y: capsule.y - 7,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
    })
  }

  private buildWall(): void {
    const wall = this.level.wall
    this.wallVisual = this.add.container(wall.x + wall.w / 2, wall.y + wall.h / 2).setDepth(11)
    const g = this.add.graphics()
    g.fillStyle(0x4a5367, 1)
    g.fillRoundedRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h, 7)
    g.lineStyle(2, 0x172438, 1)
    g.strokeRoundedRect(-wall.w / 2, -wall.h / 2, wall.w, wall.h, 7)
    g.lineStyle(1.2, 0xb9a9ff, 0.4)
    g.beginPath()
    g.moveTo(-10, -24)
    g.lineTo(2, -7)
    g.lineTo(-6, 2)
    g.lineTo(9, 20)
    g.moveTo(7, -27)
    g.lineTo(-1, -11)
    g.moveTo(-14, 9)
    g.lineTo(-3, 17)
    g.strokePath()
    const hint = this.add
      .text(0, wall.h / 2 + 14, 'BLAST', {
        fontFamily: FONT,
        fontSize: '8px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.wallVisual.add([g, hint])
    this.wallBody = this.physics.add.staticImage(wall.x + wall.w / 2, wall.y + wall.h / 2, 'white')
    this.wallBody.setVisible(false).setDisplaySize(wall.w, wall.h).refreshBody()
  }

  private buildCrateAndGate(): void {
    this.crate = this.physics.add.image(this.level.crate.x, this.level.crate.y, 'crate')
    this.crate.setDepth(16).setScale(0.88)
    this.crate.setDragX(260)
    this.crate.setBounce(0.08)
    ;(this.crate.body as Phaser.Physics.Arcade.Body).setSize(56, 56)
    ;(this.crate.body as Phaser.Physics.Arcade.Body).setOffset(6, 8)
    const crateGlow = this.add.image(this.crate.x, this.crate.y, 'glow').setScale(0.45).setTint(0x7ef5e5).setAlpha(0.18)
    crateGlow.setBlendMode(Phaser.BlendModes.ADD)
    this.crate.setData('glow', crateGlow)

    this.plate = this.add.container(this.level.plate.x, this.level.plate.y).setDepth(7)
    const plateBase = this.add.graphics()
    plateBase.fillStyle(0x203950, 1)
    plateBase.fillEllipse(0, 0, 88, 18)
    plateBase.lineStyle(2, 0x7ef5e5, 0.55)
    plateBase.strokeEllipse(0, 0, 88, 18)
    plateBase.fillStyle(0x7ef5e5, 0.18)
    plateBase.fillEllipse(0, -2, 58, 10)
    this.platRing = this.add.circle(0, -3, 20, 0x7ef5e5, 0.06).setStrokeStyle(1.5, 0x7ef5e5, 0.4)
    this.plate.add([plateBase, this.platRing])

    this.gate = this.add.image(this.level.gate.x + 18, this.level.gate.y, 'gate').setOrigin(0.5, 0).setDepth(10)
    this.gateBody = this.physics.add.image(
      this.level.gate.x + 18,
      this.level.gate.y + this.level.gate.height / 2,
      'white',
    )
    this.gateBody.setVisible(false).setDisplaySize(34, this.level.gate.height)
    ;(this.gateBody.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    ;(this.gateBody.body as Phaser.Physics.Arcade.Body).setImmovable(true)
    ;(this.gateBody.body as Phaser.Physics.Arcade.Body).setSize(34, this.level.gate.height)
    this.gateBody.setDepth(10)
  }

  private buildBarrier(): void {
    const barrier = this.level.barrier
    this.barrier = this.physics.add.image(barrier.x, barrier.y + barrier.height / 2, 'white')
    this.barrier.setVisible(false).setDisplaySize(34, barrier.height)
    ;(this.barrier.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    ;(this.barrier.body as Phaser.Physics.Arcade.Body).setImmovable(true)
    ;(this.barrier.body as Phaser.Physics.Arcade.Body).setSize(34, barrier.height)
    const visual = this.add
      .image(barrier.x, barrier.y + barrier.height / 2, 'barrier')
      .setDisplaySize(46, barrier.height)
      .setDepth(11)
    visual.setBlendMode(Phaser.BlendModes.ADD)
    visual.setData('barrierVisual', true)
    this.tweens.add({
      targets: visual,
      alpha: 0.55,
      scaleX: 1.1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.barrier.setData('visual', visual)
  }

  private buildSpikes(): void {
    this.spikeGroup = this.physics.add.staticGroup()
    this.level.spikes.forEach((spike) => {
      const visual = this.add.image(spike.x + spike.w / 2, spike.y, 'spike').setOrigin(0.5, 1).setDepth(9)
      visual.setDisplaySize(spike.w, 42)
      const zone = this.physics.add.staticImage(spike.x + spike.w / 2, spike.y - 15, 'white')
      zone.setVisible(false).setDisplaySize(spike.w, 30).refreshBody()
      zone.setData('spikeX', spike.x + spike.w / 2)
      this.spikeGroup.add(zone)
    })
  }

  private buildGoal(): void {
    const goal = this.level.goal
    this.goal = this.add.container(goal.x, goal.y).setDepth(14)
    const halo = this.add.image(0, -76, 'glow').setScale(1.5).setTint(0xffc857).setAlpha(0.4)
    halo.setBlendMode(Phaser.BlendModes.ADD)
    this.goalGlow = halo
    const pedestal = this.add.image(0, 0, 'pedestal').setOrigin(0.5, 1)
    const fragment = this.add.image(0, -76, 'fragment').setScale(0.82)
    this.goal.add([halo, pedestal, fragment])
    this.tweens.add({
      targets: fragment,
      y: -84,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.tweens.add({
      targets: fragment,
      angle: 5,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.tweens.add({
      targets: halo,
      alpha: 0.16,
      scale: 1.9,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.goalZone = this.physics.add.image(goal.x, goal.y - 62, 'white')
    this.goalZone.setVisible(false).setDisplaySize(130, 150)
    ;(this.goalZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false)
    ;(this.goalZone.body as Phaser.Physics.Arcade.Body).setImmovable(true)
    ;(this.goalZone.body as Phaser.Physics.Arcade.Body).setSize(130, 150)
  }

  private buildEnemies(): void {
    this.enemies = createEnemies(this, this.level.enemies, {
      onFire: (x, y, vx, vy) => this.spawnEnemyShot(x, y, vx, vy),
      onDefeated: (enemy) => {
        const at = enemy.position
        this.sparks.emitParticleAt(at.x, at.y, 14)
        this.sparks.setParticleTint(0x74d680)
        const burst = this.add
          .image(at.x, at.y, 'glow')
          .setTint(0x74d680)
          .setScale(0.35)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(30)
          .setAlpha(0.6)
        this.tweens.add({
          targets: burst,
          scale: 1.5,
          alpha: 0,
          duration: 320,
          onComplete: () => burst.destroy(),
        })
        audio.sfx('hit')
        this.cameras.main.shake(60, 0.0015)
      },
    })
    this.enemyShots = this.physics.add.group({ allowGravity: false })
  }

  private buildPlayer(): void {
    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y, {
      onShoot: (aim, x, y) => this.spawnPlayerShot(aim.x, aim.y, x, y),
      onDust: (x, y, count, kind) => {
        this.dust.emitParticleAt(x, y, count)
        if (kind === 'leaf') this.dust.setParticleTint(0x9be7a0)
      },
      onLand: (strength) => {
        if (this.save.settings.screenShake && strength > 0.25) {
          this.cameras.main.shake(80, 0.0013 * strength)
        }
      },
      onHurt: (sourceX) => {
        this.damageTaken = true
        this.lastDamageSource = sourceX
        console.info(`[GG] Pip hit near x=${Math.round(this.player.x)} from x=${Math.round(sourceX)}`)
        if (this.save.settings.screenShake) this.cameras.main.shake(200, 0.005)
        this.cameras.main.flash(120, 255, 79, 109, false)
        this.dust.emitParticleAt(this.player.x, this.player.y, 10)
        this.updateDebugState()
      },
      onDefeat: () => {
        this.respawning = true
        this.player.freeze()
        this.cameras.main.fadeOut(450, 7, 19, 38)
        this.time.delayedCall(700, () => this.respawn())
      },
      onDash: (x, y) => this.spawnAfterimage(x, y),
      onJetpack: (x, y) => {
        this.jetTrail.emitParticleAt(x, y, 1)
      },
      onSpring: (x, y) => {
        this.sparks.emitParticleAt(x, y, 18)
        if (this.save.settings.screenShake) this.cameras.main.shake(95, 0.002)
      },
      onGadget: (gadget) => this.showGadgetHint(gadget),
    })
    this.player.view.setDepth(24)
    this.player.bolt.root.setDepth(26)
    this.player.sprite.setDepth(23)
    this.player.sprite.setCollideWorldBounds(false)
  }

  private buildParticles(): void {
    this.dust = this.add
      .particles(0, 0, 'dust', {
        lifespan: 420,
        speed: { min: 18, max: 90 },
        angle: { min: 195, max: 345 },
        gravityY: 160,
        scale: { start: 0.75, end: 0 },
        alpha: { start: 0.55, end: 0 },
        emitting: false,
      })
      .setDepth(21)
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        lifespan: 340,
        speed: { min: 40, max: 230 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.95, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(31)
    this.jetTrail = this.add
      .particles(0, 0, 'spark', {
        lifespan: 300,
        speed: { min: 20, max: 80 },
        angle: { min: 70, max: 110 },
        gravityY: 300,
        tint: [0xff9f1c, 0xffe59a, 0x7ef5e5],
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.8, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(22)

    this.chargeGraphics = this.add.graphics().setDepth(32)
    this.magnetGraphics = this.add.graphics().setDepth(19)
  }

  private buildColliders(): void {
    this.projectiles = this.physics.add.group({ allowGravity: false })
    this.physics.add.collider(this.player.sprite, this.solids)
    this.physics.add.collider(this.player.sprite, this.oneWays)
    this.physics.add.collider(this.player.sprite, this.crate)
    this.physics.add.collider(this.player.sprite, this.gateBody)
    this.physics.add.collider(this.player.sprite, this.wallBody)
    this.physics.add.collider(this.crate, this.solids)
    this.physics.add.collider(this.projectiles, this.solids, (shot) =>
      this.hitSolid(shot as Phaser.Physics.Arcade.Image),
    )
    this.physics.add.collider(this.projectiles, this.wallBody, (shot) =>
      this.hitWall(shot as Phaser.Physics.Arcade.Image),
    )
    this.physics.add.collider(this.enemyShots, this.solids, (shot) =>
      this.hitSolid(shot as Phaser.Physics.Arcade.Image),
    )
    this.physics.add.overlap(this.player.sprite, this.enemyShots, (_player, shot) => {
      const image = shot as Phaser.Physics.Arcade.Image
      this.player.damage(1, image.x)
      image.destroy()
    })
    this.physics.add.overlap(this.player.sprite, this.shardGroup, (_player, shard) => {
      const sprite = shard as Phaser.Physics.Arcade.Image
      if (!sprite.active) return
      const shardRecord = this.shards.find((entry) => entry.sprite === sprite)
      shardRecord?.tween.remove()
      sprite.destroy()
      this.shardsCollected += 1
      this.sparks.emitParticleAt(sprite.x, sprite.y, 7)
      audio.sfx('shard')
      if (this.shardsCollected === this.level.shards.length) {
        this.hud.showToast('EVERY STAR SHARD IN THE MEADOW — BOLT IS IMPRESSED.', 5000)
        this.grant('shardkeeper')
      }
      this.updateDebugState()
    })
    this.physics.add.overlap(this.player.sprite, this.capsuleGroup, (_player, capsule) => {
      const image = capsule as Phaser.Physics.Arcade.Image
      if (!image.active) return
      const data = image.getData('capsule') as { id: string; title: string; text: string } | undefined
      if (!data) return
      const glow = image.getData('glow') as Phaser.GameObjects.Image | undefined
      glow?.destroy()
      image.destroy()
      this.capsulesFound.add(data.id)
      audio.sfx('collect')
      this.sparks.emitParticleAt(image.x, image.y, 16)
      this.hud.showToast(`${data.title} — ${data.text}`, 7200)
      if (this.capsulesFound.size === this.level.capsules.length) this.grant('archivist')
      this.updateDebugState()
    })
    this.physics.add.overlap(this.player.sprite, this.spikeGroup, (_player, spike) => {
      const zone = spike as Phaser.Physics.Arcade.Image
      this.player.damage(1, Number(zone.getData('spikeX') ?? zone.x))
    })
    this.physics.add.overlap(this.player.sprite, this.goalZone, () => this.completeLevel())
    this.physics.add.collider(
      this.player.sprite,
      this.barrier,
      undefined,
      () => !this.player.dashing,
    )
  }

  private buildPickups(): void {
    this.level.pickups.forEach((pickup) => {
      const container = this.add.container(pickup.x, pickup.y).setDepth(17)
      const glow = this.add.image(0, 0, 'glow').setScale(0.8).setTint(0xffc857).setAlpha(0.28)
      glow.setBlendMode(Phaser.BlendModes.ADD)
      const ring = this.add.circle(0, 0, 34, 0xffc857, 0.04).setStrokeStyle(2, 0xffc857, 0.5)
      const icon = this.add.image(0, 0, `icon-${pickup.gadget}`).setScale(0.9)
      const label = this.add
        .text(0, 48, GADGET_NAMES[pickup.gadget], {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: CSS.cream,
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setResolution(2)
      container.add([glow, ring, icon, label])
      this.tweens.add({
        targets: container,
        y: pickup.y - 10,
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
      this.tweens.add({
        targets: ring,
        scale: 1.22,
        alpha: 0.2,
        duration: 1100,
        yoyo: true,
        repeat: -1,
      })
      this.pickups.push({ ...pickup, container, collected: false })
    })
  }

  private buildCheckpoints(): void {
    this.level.checkpoints.forEach((definition) => {
      const glow = this.add.image(definition.x, definition.y - 80, 'glow').setScale(0.8).setTint(0x7ef5e5).setAlpha(0.2)
      glow.setBlendMode(Phaser.BlendModes.ADD).setDepth(12)
      const image = this.add.image(definition.x, definition.y + 2, 'checkpoint').setOrigin(0.5, 1).setDepth(13)
      this.tweens.add({
        targets: glow,
        scale: 1.2,
        alpha: 0.12,
        duration: 1600,
        yoyo: true,
        repeat: -1,
      })
      this.checkpoints.push({
        ...definition,
        image,
        glow,
        active: false,
      })
    })
  }

  private buildHud(): void {
    this.hud = new Hud(this, this.level.shards.length, () => {
      if (!this.complete) this.openPause('manual')
    })
    this.touch = new TouchControls(this, this.inputManager, this.save.settings)
    const touchEnabled = this.save.settings.touchControls && this.inputManager.touchDevice
    this.touch.setEnabled(touchEnabled)
    this.touch.setVisible(touchEnabled)
    this.hud.setTouchMode(touchEnabled)
    if (touchEnabled) this.hud.showToast('LANDSCAPE MODE · LEFT THUMB MOVES · RIGHT BUTTONS ACT', 4500)
  }

  private buildPauseMenu(): void {
    this.pauseContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1100).setVisible(false)
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040b16, 0.82)
    shade.setInteractive()
    const panel = this.add.graphics()
    panel.fillStyle(0x0b2037, 0.96)
    panel.fillRoundedRect(404, 200, 472, 360, 22)
    panel.lineStyle(1.5, 0x7ef5e5, 0.35)
    panel.strokeRoundedRect(404, 200, 472, 360, 22)
    panel.fillStyle(0x2ec4b6, 0.1)
    panel.fillRoundedRect(414, 210, 452, 72, 16)
    const title = this.add
      .text(640, 238, 'PAUSED', {
        fontFamily: DISPLAY_FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: CSS.cream,
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const reason = this.add
      .text(640, 274, 'Catch your breath. The meadow will wait.', {
        fontFamily: FONT,
        fontSize: '12px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.pauseContainer.add([shade, panel, title, reason])
    this.pauseContainer.setData('reason', reason)
    this.pauseList = new MenuList(this, this.inputManager, 452, 306, 376, [
      { label: 'RESUME EXPEDITION', accent: CSS.tealLight, onSelect: () => this.closePause() },
      { label: 'RESTART FROM CHECKPOINT', onSelect: () => this.restartFromCheckpoint() },
      { label: 'RETURN TO MENU', onSelect: () => this.quitToMenu() },
    ], { rowHeight: 48, gap: 7 })
    this.pauseList.setVisible(false)
  }

  private buildCameraAndInputs(): void {
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.cameras.main.setDeadzone(150, 110)
    this.cameras.main.setFollowOffset(0, -26)

    this.inputManager.events.on('gamepad-connected', (name: string) => {
      this.accessNotice = `CONTROLLER CONNECTED — ${name}`
      this.hud.showToast(`${this.accessNotice}  ·  TOUCH CONTROLS HIDDEN`, 3800)
      this.touch?.setVisible(false)
      this.hud.setTouchMode(false)
    })
    this.inputManager.events.on('gamepad-disconnected', () => {
      if (!this.complete) {
        this.openPause('controller')
        const reason = this.pauseContainer.getData('reason') as Phaser.GameObjects.Text
        reason.setText('Controller disconnected. Reconnect it, or carry on with the keyboard.')
      }
    })
    this.inputManager.events.on('device-changed', (device: string) => {
      if (device === 'touch' && this.save.settings.touchControls) {
        this.touch?.setVisible(true)
        this.hud.setTouchMode(true)
      }
    })

    this.onBlur = () => {
      if (!this.complete && !this.paused && !this.respawning) this.openPause('focus')
    }
    this.onVisibility = () => {
      if (document.visibilityState === 'hidden' && !this.complete) {
        if (!this.paused) this.openPause('focus')
        audio.suspend()
      } else if (document.visibilityState === 'visible') {
        audio.resume()
      }
    }
    this.onOrientationEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ portrait: boolean }>).detail
      if (detail?.portrait) {
        if (!this.complete && !this.paused) this.openPause('orientation')
      } else if (this.paused && this.pauseReason === 'orientation') {
        this.closePause()
      }
    }
    window.addEventListener('blur', this.onBlur)
    window.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('gg-orientation', this.onOrientationEvent)

    // Number keys choose a gadget directly; the input abstraction still owns use.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.paused || this.complete) return
      const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(event.code)
      if (index >= 0) {
        this.player.selectGadget(index)
        audio.sfx('click')
      }
      if (event.code === 'KeyQ') {
        this.player.cycleGadget(event.shiftKey ? -1 : 1)
        audio.sfx('click')
      }
    })
  }

  private showIntro(): void {
    this.hud.showBanner(this.level.world, `${this.level.name.toUpperCase()}   ·   WORLD 1`)
    this.time.delayedCall(900, () => {
      this.hud.showToast('BOLT: The fragment is singing past the meadow gate. Follow the light, Pip.', 5200)
    })
    this.grant('first-steps')
  }

  private showGadgetHint(gadget: Gadget): void {
    const hints: Record<Gadget, string> = {
      blaster: 'PLASMA BLASTER ONLINE — J or left mouse fires.',
      jetpack: 'JETPACK ONLINE — press 2, then hold K in the air to fly. It burns fuel.',
      spring: 'SPRING BOOTS ONLINE — press 3, hold K on the ground, release to launch.',
      magnet: 'MAGNET GLOVE ONLINE — press 4, hold K near the metal crate to pull it.',
      phase: 'PHASE DASH ONLINE — press 5, then Shift to dash through pink barriers.',
    }
    this.hud.showToast(hints[gadget], 5200)
    if (gadget !== 'blaster') {
      this.sparks.emitParticleAt(this.player.x, this.player.y, 20)
      this.grant('fully-equipped')
    }
  }

  private spawnPlayerShot(ax: number, ay: number, x: number, y: number): void {
    const shot = this.physics.add.image(x, y, 'bolt-shot').setDepth(29)
    shot.setRotation(Math.atan2(ay, ax))
    const body = shot.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(28, 12)
    body.setVelocity(ax * 860, ay * 860)
    shot.setData('expires', this.time.now + 900)
    this.projectiles.add(shot)
    this.sparks.emitParticleAt(x, y, 3)
    this.add
      .image(x, y, 'muzzle')
      .setScale(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(30)
      .setTint(0x7ef5e5)
      .setAlpha(0.9)
  }

  private spawnEnemyShot(x: number, y: number, vx: number, vy: number): void {
    const shot = this.physics.add.image(x, y, 'enemy-shot').setDepth(28)
    const body = shot.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setSize(14, 14)
    body.setVelocity(vx, vy)
    shot.setData('expires', this.time.now + 2600)
    this.enemyShots.add(shot)
    this.sparks.emitParticleAt(x, y, 3)
    audio.sfx('shoot')
  }

  private hitSolid(image: Phaser.Physics.Arcade.Image): void {
    this.sparks.emitParticleAt(image.x, image.y, 4)
    image.destroy()
  }

  private hitWall(image: Phaser.Physics.Arcade.Image): void {
    image.destroy()
    this.sparks.emitParticleAt(image.x, image.y, 6)
    this.wallHp -= 1
    this.cameras.main.shake(70, 0.002)
    this.tweens.add({
      targets: this.wallVisual,
      x: this.wallVisual.x + 4,
      duration: 45,
      yoyo: true,
      repeat: 2,
    })
    if (this.wallHp <= 0) {
      this.physics.world.disable(this.wallBody)
      this.tweens.add({
        targets: this.wallVisual,
        alpha: 0,
        scaleY: 0.3,
        duration: 260,
        onComplete: () => this.wallVisual.destroy(),
      })
      this.sparks.emitParticleAt(this.wallVisual.x, this.wallVisual.y, 22)
      this.hud.showToast('THE CRACKED STONE BREAKS — A DATA CAPSULE IS BEHIND IT.', 4500)
      audio.sfx('gate')
    }
  }

  private spawnAfterimage(x: number, y: number): void {
    const ghost = this.add.image(x, y, 'pip-ghost').setTint(0x7ef5e5).setAlpha(0.48).setDepth(22)
    ghost.setScale(this.player.facing, 1)
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      x: x - this.player.facing * 18,
      duration: 240,
      onComplete: () => ghost.destroy(),
    })
    this.jetTrail.emitParticleAt(x - this.player.facing * 10, y, 1)
  }

  private updatePlatforms(): void {
    for (const platform of this.movingPlatforms) {
      platform.visual.y = platform.body.y - platform.visual.height / 2
      platform.visual.x = platform.body.x - platform.visual.width / 2
      const body = this.player.body()
      if (
        body.touching.down &&
        Math.abs(this.player.y - 28 - platform.body.y) < 42 &&
        Math.abs(this.player.x - platform.body.x) < platform.body.displayWidth / 2 + 16
      ) {
        this.player.sprite.y += platform.body.y - platform.previousY
      }
      platform.previousY = platform.body.y
    }
  }

  private updatePickups(): void {
    this.pickups.forEach((pickup) => {
      if (pickup.collected) return
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y) < 58) {
        pickup.collected = true
        this.player.unlockGadget(pickup.gadget)
        this.sparks.emitParticleAt(pickup.x, pickup.y, 22)
        this.tweens.add({
          targets: pickup.container,
          alpha: 0,
          scale: 1.4,
          duration: 300,
          onComplete: () => pickup.container.destroy(),
        })
      }
    })
  }

  private updateCheckpoints(): void {
    for (const checkpoint of this.checkpoints) {
      if (checkpoint.active) continue
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, checkpoint.x, checkpoint.y - 40) < 66) {
        checkpoint.active = true
        this.checkpoint = checkpoint.id
        this.checkpointX = checkpoint.x
        this.checkpointY = checkpoint.y - 54
        checkpoint.image.setTint(0xffe59a)
        this.tweens.add({
          targets: [checkpoint.glow, checkpoint.image],
          scale: 1.2,
          duration: 280,
          yoyo: true,
          repeat: 1,
        })
        this.sparks.emitParticleAt(checkpoint.x, checkpoint.y - 60, 24)
        audio.sfx('checkpoint')
        this.hud.showToast('CHECKPOINT SYNCED — PIP WILL RETURN HERE.', 3600)
        this.updateDebugState()
      }
    }
  }

  private updateHints(): void {
    const next = this.level.hints[this.hintIndex]
    if (next && this.player.x >= next.x) {
      this.hud.showToast(next.text, 5600)
      this.hintIndex += 1
    }
  }

  private updateMagnet(dt: number): void {
    this.magnetGraphics.clear()
    if (!this.player.magnetActive) return
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.crate.x,
      this.crate.y,
    )
    if (distance < 300) {
      const direction = Math.sign(this.player.x - this.crate.x) || 1
      const body = this.crate.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(direction * 280)
      if (distance < 80) body.setVelocityX(body.velocity.x * 0.55)
      if (distance < 190 && this.crate.y > this.player.y) body.setVelocityY(-70)
      this.magnetGraphics.lineStyle(2, 0x7b61ff, 0.62)
      this.magnetGraphics.beginPath()
      this.magnetGraphics.moveTo(this.player.x, this.player.y + 2)
      for (let i = 1; i <= 6; i += 1) {
        const t = i / 6
        this.magnetGraphics.lineTo(
          Phaser.Math.Linear(this.player.x, this.crate.x, t) + Math.sin(t * 18 + this.time.now * 0.02) * 8,
          Phaser.Math.Linear(this.player.y + 2, this.crate.y, t),
        )
      }
      this.magnetGraphics.strokePath()
      if (this.time.now - this.lastMagnetSpark > 55) {
        this.lastMagnetSpark = this.time.now
        this.sparks.emitParticleAt(this.crate.x, this.crate.y, 1)
      }
    }
    this.platRing.setScale(1 + Math.sin(this.time.now * 0.006) * 0.08, 1)
    if (!this.gateOpen && Phaser.Math.Distance.Between(this.crate.x, this.crate.y, this.plate.x, this.plate.y) < 66) {
      this.openGate()
    }
  }

  private openGate(): void {
    if (this.gateOpen) return
    this.gateOpen = true
    this.gateBody.disableBody(true, true)
    this.sparks.emitParticleAt(this.gate.x, this.gate.y + 120, 28)
    audio.sfx('gate')
    this.tweens.add({
      targets: this.gate,
      alpha: 0,
      y: this.gate.y - 40,
      duration: 420,
      onComplete: () => this.gate.destroy(),
    })
    this.tweens.add({
      targets: this.platRing,
      scale: 1.6,
      alpha: 0,
      duration: 420,
    })
    this.hud.showToast('MAGNETIC PLATE PRESSED — THE MEADOW GATE OPENS.', 4200)
    if (this.save.settings.screenShake) this.cameras.main.shake(150, 0.003)
    this.updateDebugState()
  }

  private updateEnemies(delta: number): void {
    if (this.complete) return
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return
      enemy.update(delta, this.player)
      if (enemy.alive) this.checkEnemyContact(enemy)
    })
  }

  private checkEnemyContact(enemy: Enemy): void {
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y)
    if (distance > (enemy.kind === 'drone' ? 36 : 38)) return
    const playerBody = this.player.body()
    if (playerBody.velocity.y > 130 && this.player.y < enemy.sprite.y - 8) {
      enemy.hit(2)
      playerBody.setVelocityY(-420)
      this.sparks.emitParticleAt(enemy.sprite.x, enemy.sprite.y, 8)
      audio.sfx('hit')
    } else {
      this.player.damage(1, enemy.sprite.x)
    }
  }

  private updateProjectiles(): void {
    this.checkProjectileEnemyHits()
    for (const child of this.projectiles.getChildren()) {
      const image = child as Phaser.Physics.Arcade.Image
      if (!image.active) continue
      if (image.x < -100 || image.x > this.level.width + 100 || image.y < -100 || image.y > this.level.height + 200) {
        image.destroy()
        continue
      }
      const expires = Number(image.getData('expires') ?? 0)
      if (expires > 0 && this.time.now > expires) image.destroy()
    }
    for (const child of this.enemyShots.getChildren()) {
      const image = child as Phaser.Physics.Arcade.Image
      if (!image.active) continue
      if (this.time.now > Number(image.getData('expires') ?? 0)) image.destroy()
    }
  }

  private checkProjectileEnemyHits(): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      for (const child of this.projectiles.getChildren()) {
        const shot = child as Phaser.Physics.Arcade.Image
        if (!shot.active) continue
        if (Phaser.Math.Distance.Between(shot.x, shot.y, enemy.sprite.x, enemy.sprite.y) > 29) continue
        const body = shot.body as Phaser.Physics.Arcade.Body
        enemy.hit(1, body.velocity.x * 0.14)
        this.sparks.emitParticleAt(shot.x, shot.y, 7)
        audio.sfx('hit')
        shot.destroy()
        break
      }
    }
  }

  private updateCharge(): void {
    this.chargeGraphics.clear()
    if (!this.player.springCharging) return
    const ratio = this.player.springChargeRatio
    const x = this.player.x
    const y = this.player.y - 50
    this.chargeGraphics.lineStyle(3, ratio > 0.85 ? 0xffc857 : 0x7ef5e5, 0.8)
    this.chargeGraphics.beginPath()
    this.chargeGraphics.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false)
    this.chargeGraphics.strokePath()
    this.chargeGraphics.lineStyle(1, 0xffffff, 0.4)
    this.chargeGraphics.strokeCircle(x, y, 33)
  }

  private updateCamera(): void {
    const body = this.player.body()
    const lead = Phaser.Math.Clamp(body.velocity.x * 0.17, -86, 86)
    const vertical = Phaser.Math.Clamp(body.velocity.y * 0.05, -36, 36)
    const current = this.cameras.main.followOffset
    this.cameras.main.setFollowOffset(
      Phaser.Math.Linear(current.x, -lead, 0.06),
      Phaser.Math.Linear(current.y, -26 - vertical, 0.06),
    )
    this.parallax.update(this.time.now, this.cameras.main.scrollX)
  }

  private openPause(reason: string): void {
    if (this.paused || this.complete) return
    this.paused = true
    this.pauseReason = reason
    this.player.freeze()
    this.player.bolt.root.setVisible(false)
    this.touch?.setVisible(false)
    this.hud.hideToast()
    this.physics.pause()
    this.pauseContainer.setVisible(true)
    this.pauseList.setVisible(true)
    this.pauseList.setEnabled(true)
    this.accessNotice = reason
    const reasonText = this.pauseContainer.getData('reason') as Phaser.GameObjects.Text
    reasonText.setText(
      reason === 'focus'
        ? 'The lab lost focus. Everything is safe — resume when you are ready.'
        : reason === 'orientation'
          ? 'Rotate your device back to landscape to continue the expedition.'
          : reason === 'controller'
            ? 'Controller disconnected. Reconnect it, or carry on with the keyboard.'
            : 'Catch your breath. The meadow will wait.',
    )
    audio.sfx('click')
    this.updateDebugState()
  }

  private closePause(): void {
    if (!this.paused) return
    this.paused = false
    this.pauseReason = ''
    this.pauseContainer.setVisible(false)
    this.pauseList.setVisible(false)
    this.player.bolt.root.setVisible(true)
    this.physics.resume()
    this.touch?.setVisible(this.save.settings.touchControls && this.inputManager.touchDevice)
    audio.sfx('click')
    this.updateDebugState()
  }

  private restartFromCheckpoint(): void {
    this.closePause()
    this.respawn()
    this.updateDebugState()
  }

  private quitToMenu(): void {
    this.physics.resume()
    this.scene.start('Menu')
  }

  private respawn(): void {
    this.respawning = false
    this.player.respawn(this.checkpointX, this.checkpointY)
    this.cameras.main.fadeIn(350, 7, 19, 38)
    this.hud.showToast('SIGNAL RESTORED — KEEP GOING, PIP.', 3000)
    this.player.bolt.root.setVisible(true)
    this.touch?.setVisible(this.save.settings.touchControls && this.inputManager.touchDevice)
    this.updateDebugState()
  }

  private completeLevel(): void {
    if (this.complete) return
    this.complete = true
    if (!this.timerStarted) this.timerStarted = true
    this.player.setCelebrating(true)
    this.player.freeze()
    this.touch?.setVisible(false)
    this.hud.hideToast()
    this.hud.showBanner('FRAGMENT RECOVERED', 'STARLIGHT MEADOWS · THE FALLEN BEACON')
    this.cameras.main.flash(400, 255, 227, 154, false)
    if (this.save.settings.screenShake) this.cameras.main.shake(420, 0.004)
    audio.sfx('victory')
    this.sparks.emitParticleAt(this.goal.x, this.goal.y - 76, 34)
    this.tweens.add({
      targets: this.goalGlow,
      scale: 3.2,
      alpha: 0.8,
      duration: 900,
      ease: 'Sine.easeOut',
    })
    this.grant('beacon-lit')
    const stars = starsFor(this.shardsCollected, this.capsulesFound.size, this.level.shards.length)
    this.save = recordLevel(this.save, this.level.id, {
      stars,
      timeMs: this.elapsedMs,
      shards: this.shardsCollected,
      capsules: [...this.capsulesFound],
    })
    if (!this.damageTaken) this.grant('untouched')
    this.save = loadSave()
    this.time.delayedCall(1150, () => this.showResults(stars))
    this.updateDebugState()
  }

  private showResults(stars: number): void {
    if (this.resultsContainer) return
    this.resultsContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1400)
    const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x040b16, 0.8)
    shade.setInteractive()
    const panel = this.add.graphics()
    panel.fillStyle(0x0b2037, 0.97)
    panel.fillRoundedRect(318, 114, 644, 492, 24)
    panel.lineStyle(1.5, 0xffc857, 0.55)
    panel.strokeRoundedRect(318, 114, 644, 492, 24)
    panel.fillStyle(0xffc857, 0.08)
    panel.fillRoundedRect(330, 126, 620, 92, 18)
    const title = this.add
      .text(640, 154, 'THE FRAGMENT IS SAFE', {
        fontFamily: DISPLAY_FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: CSS.cream,
        letterSpacing: 1.5,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const sub = this.add
      .text(640, 191, `STARLIGHT MEADOWS  ·  ${this.level.name.toUpperCase()}`, {
        fontFamily: FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const starText = this.add
      .text(640, 255, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
        fontFamily: DISPLAY_FONT,
        fontSize: '36px',
        color: CSS.gold,
        letterSpacing: 7,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const stats = this.add
      .text(640, 303, `TIME  ${formatTime(this.elapsedMs)}      SHARDS  ${this.shardsCollected}/${this.level.shards.length}      CAPSULES  ${this.capsulesFound.size}/2`, {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: CSS.cream,
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const body = this.add
      .text(
        640,
        344,
        stars === 3
          ? 'A perfect meadow run. Everything the old world left behind is singing again.'
          : stars === 2
            ? 'The beacon is lit. A few more shards and secrets are still waiting in the grass.'
            : 'The fragment is safe. The meadow still has secrets hidden above and below the path.',
        {
          fontFamily: FONT,
          fontSize: '13px',
          color: CSS.muted,
          align: 'center',
          wordWrap: { width: 530 },
          lineSpacing: 5,
        },
      )
      .setOrigin(0.5, 0)
      .setResolution(2)
    this.resultsContainer.add([shade, panel, title, sub, starText, stats, body])
    this.resultsList = new MenuList(this, this.inputManager, 458, 432, 364, [
      { label: 'PLAY AGAIN', accent: CSS.tealLight, onSelect: () => this.scene.restart() },
      { label: 'RETURN TO THE ARCADE MENU', onSelect: () => this.quitToMenu() },
    ], { rowHeight: 46, gap: 8 })
    this.resultsList.setDepth(1500)
    this.resultsList.setVisible(true)
    this.resultsContainer.setAlpha(0)
    this.tweens.add({ targets: this.resultsContainer, alpha: 1, duration: 350 })
    this.grant('beacon-lit')
  }

  private grant(id: string): void {
    const before = this.save.achievements.length
    this.save = unlockAchievement(this.save, id)
    if (this.save.achievements.length > before) {
      this.updateDebugState()
    }
  }

  override update(_time: number, delta: number): void {
    if (!this.timerStarted && !this.complete) this.timerStarted = true
    this.inputManager.update()

    if (this.complete) {
      this.resultsList?.update()
      this.player.bolt.root.setVisible(false)
      this.updateCamera()
      this.inputManager.postUpdate()
      return
    }

    if (this.paused) {
      this.pauseList.update()
      if (
        this.inputManager.justPressed('pause') ||
        this.inputManager.justPressed('dash') ||
        this.inputManager.justPressed('jump')
      ) {
        if (this.pauseReason !== 'controller' || this.inputManager.hasGamepad) this.closePause()
      }
      this.inputManager.postUpdate()
      return
    }

    if (this.respawning) {
      this.inputManager.postUpdate()
      return
    }

    const aim = this.inputManager.aim(this.player.x, this.player.y, this.player.facing)
    this.player.update(delta, this.inputManager, aim)
    this.updatePlatforms()
    this.updatePickups()
    this.updateCheckpoints()
    this.updateHints()
    this.updateMagnet(Math.min(delta, 50) / 1000)
    this.updateEnemies(delta)
    this.updateProjectiles()
    this.updateCharge()
    this.updateCamera()
    this.updateCrateGlow()

    // Accumulate frame time instead of subtracting an engine clock timestamp:
    // scene clocks can be shared across the menu's load time and would show a
    // non-zero expedition clock before the player has taken a step.
    this.elapsedMs += Math.min(delta, 100)
    this.hud.update(this.player, this.shardsCollected, this.elapsedMs, this.checkpoint)

    if (this.player.y > this.level.height - 20) {
      this.player.damage(3, this.player.x)
    }

    if (this.checkpoint !== this.lastHudCheckpoint) {
      this.lastHudCheckpoint = this.checkpoint
    }

    if (this.inputManager.justPressed('pause')) {
      this.openPause('manual')
    }

    if (this.inputManager.justPressed('next')) {
      this.player.cycleGadget(1)
    }
    if (this.inputManager.justPressed('prev') && !this.inputManager.justPressed('next')) {
      this.player.cycleGadget(-1)
    }

    this.updateDebugState()
    this.inputManager.postUpdate()
  }

  private updateCrateGlow(): void {
    const glow = this.crate.getData('glow') as Phaser.GameObjects.Image | undefined
    if (glow && this.crate.active) {
      glow.setPosition(this.crate.x, this.crate.y)
      glow.setAlpha(this.player.magnetActive ? 0.32 : 0.14)
    }
  }

  private updateDebugState(): void {
    ;(window as unknown as { __GG_DEBUG__?: unknown }).__GG_DEBUG__ = {
      level: this.level.id,
      scene: this,
      player: this.player
        ? {
            x: this.player.x,
            y: this.player.y,
            health: this.player.health,
            activeGadget: this.player.activeGadget,
            unlocked: [...this.player.unlocked],
            grounded: this.player.grounded,
          }
        : null,
      shards: this.shardsCollected,
      totalShards: this.level.shards.length,
      jumps: this.player.jumps,
      shotsFired: this.player.shotsFired,
      dashes: this.player.dashes,
      elapsedMs: this.elapsedMs,
      lastDamageSource: this.lastDamageSource,
      enemiesOnGround: this.enemies
        .filter((enemy) => enemy.alive && enemy.kind !== 'drone' && enemy.kind !== 'turret')
        .map((enemy) => Math.round(enemy.sprite.y)),
      capsules: this.capsulesFound.size,
      checkpoint: this.checkpoint,
      complete: this.complete,
      paused: this.paused,
      savedStars: this.save.levels[this.level.id]?.stars ?? 0,
    }
  }

  private cleanup(): void {
    window.removeEventListener('blur', this.onBlur)
    window.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('gg-orientation', this.onOrientationEvent)
    this.inputManager.destroy()
    this.touch?.destroy()
    this.hud.destroy()
    this.pauseList.destroy()
    this.resultsList?.destroy()
    this.resultsContainer?.destroy(true)
    this.parallax.destroy()
    this.player.destroy()
    this.enemies.forEach((enemy) => enemy.destroy())
    this.dust.destroy()
    this.sparks.destroy()
    this.jetTrail.destroy()
    this.chargeGraphics.destroy()
    this.magnetGraphics.destroy()
  }
}
